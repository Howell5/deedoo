import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { agentEvents, type Agent } from '@deepseek-ai/dsh-agent'
import type { AttachmentStore, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import LlmRuntime, { CallId, createAssistantMessage, createToolResultMessage, createUserMessage, LlmAdapter, ProviderRequestId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, FinishReason, GenerateOptions, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore, { Session, SessionId } from '@deepseek-ai/dsh-session'
import * as visionSidecar from '../src/index.ts'

const image: ImageAttachmentRef = {
  attachmentId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as ImageAttachmentRef['attachmentId'],
  mediaType: 'image/png',
  bytes: 68,
  width: 1,
  height: 1,
}

const secondImage: ImageAttachmentRef = {
  ...image,
  attachmentId: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as ImageAttachmentRef['attachmentId'],
}

interface ScriptOptions {
  text?: string | undefined
  finish?: FinishReason
  delayMs?: number
  visionCapable?: boolean
}

class ScriptedAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  private readonly script: ScriptOptions

  constructor(script: ScriptOptions = {}) {
    super()
    this.script = { text: 'a blue square', ...script }
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({
      provider,
      id: model,
      name: model,
      inputModalities: provider === 'glm-vision' && this.script.visionCapable !== false ? ['text', 'image'] : ['text'],
    })
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    if (this.script.delayMs !== undefined) {
      await new Promise<void>(resolve => setTimeout(resolve, this.script.delayMs))
    }
    if (this.script.text !== undefined) {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: this.script.text } }
    }
    yield { type: 'finish', reason: this.script.finish ?? { kind: 'stop' } }
  }
}

function agentFor(
  session: Session,
  options: { provider?: string; model?: string } = { provider: 'deepseek', model: 'deepseek-v4-flash' },
): Agent {
  return {
    id: SessionId('vision-agent'),
    options,
    session,
  } as Agent
}

async function setup(options: {
  config?: Partial<visionSidecar.Config>
  script?: ScriptOptions
  withAttachments?: boolean
} = {}): Promise<{ ctx: Context; adapter: ScriptedAdapter }> {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(AgentRegistry)
  if (options.withAttachments !== false) {
    ctx.provide('attachments', {
      readImage: async () => ({ ref: image, data: Uint8Array.of(1) }),
    } as unknown as AttachmentStore)
  }
  await ctx.plugin(visionSidecar, {
    enabled: true,
    provider: 'glm-vision',
    model: 'glm-4v-flash',
    timeoutMs: 10_000,
    maxOutputTokens: 64,
    maxDescriptionChars: 100,
    maxImagesPerStep: 4,
    ...options.config,
  })
  const adapter = new ScriptedAdapter(options.script)
  ctx.llm.registerAdapter(['deepseek', 'glm-vision'], adapter)
  return { ctx, adapter }
}

function sidecarOf(ctx: Context): visionSidecar.VisionSidecar {
  return ctx.get('visionSidecar') as visionSidecar.VisionSidecar
}

function imageMessage(content: ContentBlock[] = [{ type: 'image', attachment: image }]) {
  return createUserMessage({
    content,
    source: { kind: 'user' },
  })
}

describe('vision sidecar', () => {
  it('reports native, sidecar, disabled, and unavailable admission states', async () => {
    const { ctx } = await setup()
    const sidecar = sidecarOf(ctx)
    expect(await sidecar.canAcceptImage('deepseek', 'deepseek-v4-flash')).toBe(true)
    expect(await sidecar.canAcceptImage('glm-vision', 'glm-4v-flash')).toBe(true)
    expect(await sidecar.canAcceptImage('missing', 'missing')).toBe(false)

    const disabled = await setup({ config: { enabled: false } })
    expect(await sidecarOf(disabled.ctx).canAcceptImage('deepseek', 'deepseek-v4-flash')).toBe(false)
  })

  it('passes rejected, aborted, disabled, and already-enriched decisions through', async () => {
    const { ctx } = await setup()
    const sidecar = sidecarOf(ctx)
    const session = ctx.sessions.create(SessionId('early-exit-session'))
    const agent = agentFor(session)
    const rejected = { kind: 'reject' as const }
    expect(await sidecar.prepare(agent, rejected, new AbortController().signal)).toEqual(rejected)

    const aborted = new AbortController()
    aborted.abort()
    const entered = { kind: 'enter' as const, messages: [imageMessage()] }
    expect(await sidecar.prepare(agent, entered, aborted.signal)).toEqual(entered)

    const enriched = { kind: 'enter' as const, messages: [imageMessage([{
      type: 'image',
      attachment: image,
      vision: { provider: 'glm-vision', model: 'glm-4v-flash', text: 'cached' },
    }])] }
    expect(await sidecar.prepare(agent, enriched, new AbortController().signal)).toEqual(enriched)
  })

  it('fails when the main route or configured sidecar route cannot be resolved', async () => {
    const { ctx } = await setup()
    const session = ctx.sessions.create(SessionId('unresolved-route-session'))
    await expect(sidecarOf(ctx).prepare(
      agentFor(session, {}),
      { kind: 'enter', messages: [imageMessage()] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'VISION_ROUTE_UNRESOLVED' })

    const notVision = await setup({ script: { visionCapable: false } })
    const notVisionSession = notVision.ctx.sessions.create(SessionId('not-vision-session'))
    await expect(sidecarOf(notVision.ctx).prepare(
      agentFor(notVisionSession),
      { kind: 'enter', messages: [imageMessage()] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'VISION_MODEL_NOT_IMAGE_CAPABLE' })

    const undurableSession = ctx.sessions.create(SessionId('undurable-session'))
    vi.spyOn(undurableSession, 'deriveMessages').mockReturnValue([imageMessage()])
    await expect(sidecarOf(ctx).prepare(
      agentFor(undurableSession),
      { kind: 'enter', messages: [] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'VISION_MESSAGE_NOT_DURABLE' })
  })

  it('installs the pre-step waterfall consumer', async () => {
    const { ctx } = await setup()
    const session = ctx.sessions.create(SessionId('waterfall-session'))
    const agent = agentFor(session)
    const message = imageMessage()
    const signal = new AbortController().signal
    const decision = await agentEvents(ctx, agent).waterfall(
      'agent/pre-step',
      { messages: [message], turn: 1, step: 1, signal },
      () => Promise.resolve({ kind: 'enter' as const, messages: [message] }),
    )
    expect(decision.kind).toBe('enter')
    if (decision.kind !== 'enter') throw new Error('sidecar rejected the waterfall image')
    expect(decision.messages[0]?.content[0]).toMatchObject({ vision: { text: 'a blue square' } })
  })

  it('describes new and historical images, preserves the attachment, and replaces history', async () => {
    const { ctx, adapter } = await setup()
    const session = ctx.sessions.create(SessionId('vision-session'))
    const historical = imageMessage()
    session.append('user/message', historical, { surfaceOp: 'append' })
    session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'historical text' }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })

    const entered = imageMessage()
    const plainEntered = createUserMessage({
      content: [{ type: 'text', text: 'plain entered' }],
      source: { kind: 'user' },
    })
    const decision = await sidecarOf(ctx).prepare(
      agentFor(session),
      { kind: 'enter', messages: [plainEntered, entered] },
      new AbortController().signal,
    )

    expect(decision.kind).toBe('enter')
    if (decision.kind !== 'enter') throw new Error('sidecar rejected the image step')
    expect(decision.messages[0]).toBe(plainEntered)
    expect(decision.messages[1]?.content[0]).toMatchObject({
      type: 'image',
      attachment: image,
      vision: { provider: 'glm-vision', model: 'glm-4v-flash', text: 'a blue square' },
    })
    expect(session.deriveMessages()[0]?.content[0]).toMatchObject({
      type: 'image',
      attachment: image,
      vision: { text: 'a blue square' },
    })
    expect(adapter.requests).toHaveLength(1)
    expect(adapter.requests[0]).toMatchObject({
      provider: 'glm-vision',
      model: 'glm-4v-flash',
      purpose: 'vision',
      sessionId: session.id,
    })
    expect(adapter.requests[0]?.messages[0]?.content).toEqual([
      { type: 'text', text: visionSidecar.VISION_DESCRIPTION_PROMPT },
      { type: 'image', attachment: image },
    ])
  })

  it('does not add a sidecar description when the main route declares image input', async () => {
    const { ctx, adapter } = await setup()
    const session = ctx.sessions.create(SessionId('native-vision-session'))
    const agent = agentFor(session)
    agent.options.provider = 'glm-vision'

    const entered = imageMessage()
    const decision = await sidecarOf(ctx).prepare(
      agent,
      { kind: 'enter', messages: [entered] },
      new AbortController().signal,
    )

    expect(decision).toEqual({ kind: 'enter', messages: [entered] })
    expect(adapter.requests).toHaveLength(0)
  })

  it('enriches nested tool-result content while reusing existing descriptions', async () => {
    const { ctx, adapter } = await setup()
    const session = ctx.sessions.create(SessionId('nested-session'))
    const entered = imageMessage([
      { type: 'text', text: 'inspect both' },
      {
        type: 'image',
        attachment: image,
        vision: { provider: 'glm-vision', model: 'glm-4v-flash', text: 'cached square' },
      },
      { type: 'tool-result', toolCallId: CallId('text-result'), content: [{ type: 'text', text: 'plain result' }] },
      { type: 'tool-result', toolCallId: CallId('image-result'), content: [{ type: 'image', attachment: secondImage }] },
    ])
    const decision = await sidecarOf(ctx).prepare(
      agentFor(session),
      { kind: 'enter', messages: [entered] },
      new AbortController().signal,
    )

    expect(decision.kind).toBe('enter')
    if (decision.kind !== 'enter') throw new Error('sidecar rejected nested content')
    expect(decision.messages[0]?.content).toEqual([
      { type: 'text', text: 'inspect both' },
      { type: 'image', attachment: image, vision: { provider: 'glm-vision', model: 'glm-4v-flash', text: 'cached square' } },
      { type: 'tool-result', toolCallId: CallId('text-result'), content: [{ type: 'text', text: 'plain result' }] },
      { type: 'tool-result', toolCallId: CallId('image-result'), content: [{
        type: 'image', attachment: secondImage,
        vision: { provider: 'glm-vision', model: 'glm-4v-flash', text: 'a blue square' },
      }] },
    ])
    expect(adapter.requests).toHaveLength(1)
  })

  it('replaces assistant and tool-result surface messages without changing their identities', async () => {
    const { ctx } = await setup()
    const session = ctx.sessions.create(SessionId('surface-replacement-session'))
    session.append('turn/start', { turn: 1 })
    const assistant = createAssistantMessage({
      content: [{ type: 'image', attachment: image }],
      source: { provider: 'deepseek', model: 'deepseek-v4-flash' },
    })
    const tool = createToolResultMessage({ callId: CallId('image-call'), content: [{ type: 'image', attachment: secondImage }], isError: false })
    session.append('assistant/message', { turn: 1, step: 1, message: assistant }, { surfaceOp: 'append' })
    session.append('tool/result', { turn: 1, step: 1, message: tool }, { surfaceOp: 'append' })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

    await sidecarOf(ctx).prepare(
      agentFor(session),
      { kind: 'enter', messages: [] },
      new AbortController().signal,
    )
    const messages = session.deriveMessages()
    expect(messages[0]?.id).toBe(assistant.id)
    expect(messages[1]?.id).toBe(tool.id)
    expect(messages[0]?.content[0]).toMatchObject({ vision: { text: 'a blue square' } })
    expect(messages[1]?.content[0]).toMatchObject({
      type: 'tool-result',
      content: [{ vision: { text: 'a blue square' } }],
    })
  })

  it('fails closed for missing attachments, upstream failure, empty output, timeout, and image limits', async () => {
    const missing = await setup({ withAttachments: false })
    const missingSession = missing.ctx.sessions.create(SessionId('missing-attachments-session'))
    await expect(sidecarOf(missing.ctx).prepare(
      agentFor(missingSession),
      { kind: 'enter', messages: [imageMessage()] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'VISION_ATTACHMENT_SERVICE_MISSING' })

    const failed = await setup({ script: {
      finish: {
        kind: 'error',
        failure: {
          message: 'vision unavailable',
          code: 'SERVER',
          status: 502,
          providerRetryAfterMs: 250,
          requestId: ProviderRequestId('vision-request'),
        },
      },
    } })
    const failedSession = failed.ctx.sessions.create(SessionId('failed-vision-session'))
    await expect(sidecarOf(failed.ctx).prepare(
      agentFor(failedSession),
      { kind: 'enter', messages: [imageMessage()] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'SERVER' })

    const basicFailure = await setup({ script: { finish: { kind: 'error', failure: { message: 'basic failure', code: 'SERVER' } } } })
    const basicFailureSession = basicFailure.ctx.sessions.create(SessionId('basic-failure-session'))
    await expect(sidecarOf(basicFailure.ctx).prepare(
      agentFor(basicFailureSession),
      { kind: 'enter', messages: [imageMessage()] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'SERVER' })

    const empty = await setup({ script: { text: undefined } })
    const emptySession = empty.ctx.sessions.create(SessionId('empty-vision-session'))
    await expect(sidecarOf(empty.ctx).prepare(
      agentFor(emptySession),
      { kind: 'enter', messages: [imageMessage()] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'VISION_EMPTY_RESPONSE' })

    const timeout = await setup({ config: { timeoutMs: 1 }, script: { delayMs: 20 } })
    const timeoutSession = timeout.ctx.sessions.create(SessionId('timeout-vision-session'))
    await expect(sidecarOf(timeout.ctx).prepare(
      agentFor(timeoutSession),
      { kind: 'enter', messages: [imageMessage()] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'VISION_SIDECAR_TIMEOUT' })

    const limited = await setup({ config: { maxImagesPerStep: 1 } })
    const limitedSession = limited.ctx.sessions.create(SessionId('limited-vision-session'))
    await expect(sidecarOf(limited.ctx).prepare(
      agentFor(limitedSession),
      { kind: 'enter', messages: [imageMessage([{ type: 'image', attachment: image }, { type: 'image', attachment: secondImage }])] },
      new AbortController().signal,
    )).rejects.toMatchObject({ code: 'VISION_IMAGE_LIMIT' })
  })

  it('bounds an overlong description before persisting it', async () => {
    const { ctx } = await setup({ config: { maxDescriptionChars: 5 }, script: { text: '123456789' } })
    const session = ctx.sessions.create(SessionId('bounded-vision-session'))
    const decision = await sidecarOf(ctx).prepare(
      agentFor(session),
      { kind: 'enter', messages: [imageMessage()] },
      new AbortController().signal,
    )
    expect(decision.kind).toBe('enter')
    if (decision.kind !== 'enter') throw new Error('sidecar rejected bounded content')
    expect(decision.messages[0]?.content[0]).toMatchObject({ vision: { text: '1234…' } })
  })
})
