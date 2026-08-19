/**
 * Durable vision sidecar for text-only model routes. The plugin resolves a
 * configured image-capable route from the LLM adapter registry, describes
 * unresolved image blocks before each agent step, and replaces the same
 * durable surface messages with bounded descriptions.
 *
 * @module @deepseek-ai/dsh-llm-vision-sidecar
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { deadline, MAX_TIMER_DELAY_MS, timeoutOf } from '@deepseek-ai/dsh-timeout'
import { BlockAssembler, contentHasUnresolvedImage, createUserMessage, freezeMessage, LlmError } from '@deepseek-ai/dsh-llm'
import type { AssistantMessage, ContentBlock, GenerateOptions, Message, ToolResultMessage, UserMessage } from '@deepseek-ai/dsh-llm'
import { isSurfaceEvent } from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent, SurfaceEvent } from '@deepseek-ai/dsh-session'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'llm-vision-sidecar'
/** Services needed for the pre-step consumer and durable replacement writes. */
export const inject = ['agents', 'llm', 'sessions']

/** Stable timeout code owned by this plugin. */
export const VISION_SIDECAR_TIMEOUT = 'VISION_SIDECAR_TIMEOUT'

/** Prompt sent to the configured vision model for each unresolved image. */
export const VISION_DESCRIPTION_PROMPT = [
  'Describe the attached image for another language model.',
  'State only visible, useful facts: subjects, text, layout, colors, and relevant relationships.',
  'Do not claim details that cannot be seen. Return a concise plain-text description.',
].join(' ')

/** Plugin configuration for one vision sidecar route. */
export interface Config {
  /** Whether the sidecar may admit and prepare image input. */
  enabled: boolean
  /** Provider route used for image description requests. */
  provider: string
  /** Model id used for image description requests. */
  model: string
  /** Maximum elapsed time for one description request. */
  timeoutMs: number
  /** Output-token ceiling for one description request. */
  maxOutputTokens: number
  /** Maximum persisted characters in one description. */
  maxDescriptionChars: number
  /** Maximum number of distinct images described during one pre-step. */
  maxImagesPerStep: number
}

/** Runtime schema for {@link Config}. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  provider: z.string(),
  model: z.string(),
  timeoutMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(60_000),
  maxOutputTokens: z.number().step(1).min(1).default(1_024),
  maxDescriptionChars: z.number().step(1).min(1).default(4_000),
  maxImagesPerStep: z.number().step(1).min(1).default(8),
})

/** The optional admission face consumed by Host and filesystem image gates. */
export interface VisionSidecarService {
  /**
   * Report whether the configured sidecar route is currently image-capable.
   * @param provider - main conversation provider route.
   * @param model - main conversation model id.
   * @param signal - optional cancellation for route metadata resolution.
   * @returns whether image input can be transformed for the main route.
   */
  canAcceptImage(provider: string, model: string, signal?: AbortSignal): Promise<boolean>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    visionSidecar: VisionSidecarService
  }
}

interface DescriptionState {
  count: number
  descriptions: Map<string, Promise<string>>
  sessionId: Session['id']
}

interface EnrichedBlocks {
  blocks: ContentBlock[]
  changed: boolean
}

/**
 * Runtime service that owns sidecar admission and pre-step enrichment.
 */
export class VisionSidecar extends Service implements VisionSidecarService {
  constructor(ctx: Context, private readonly config: Config) {
    super(ctx, 'visionSidecar')
  }

  /**
   * Check the configured target route without making a provider request.
   * Metadata lookup failures make the optional admission unavailable; the
   * actual pre-step path still reports the route failure when an image enters.
   */
  async canAcceptImage(provider: string, model: string, signal?: AbortSignal): Promise<boolean> {
    if (!this.config.enabled) return false
    try {
      const mainInfo = await this.ctx.llm.resolveModelInfo(provider, model, signal)
      if (mainInfo.inputModalities?.includes('image') === true) return true
      const info = await this.ctx.llm.resolveModelInfo(this.config.provider, this.config.model, signal)
      return info.inputModalities?.includes('image') === true
    } catch (_error) {
      return false
    }
  }

  /**
   * Prepare a downstream pre-step decision and persist any enriched history.
   * @param agent - agent whose route and durable session provide the image context.
   * @param decision - downstream decision after earlier pre-step listeners ran.
   * @param signal - cancellation signal for route resolution and description requests.
   * @returns the decision with unresolved images described, or the original decision when unchanged.
   */
  async prepare(
    agent: Agent,
    decision: PreStepDecision,
    signal: AbortSignal,
  ): Promise<PreStepDecision> {
    if (decision.kind === 'reject' || signal.aborted || !this.config.enabled) return decision

    const historical = agent.session.deriveMessages()
    const hasUnresolvedImage = historical.some(message => contentHasUnresolvedImage(message.content))
      || decision.messages.some(message => contentHasUnresolvedImage(message.content))
    if (!hasUnresolvedImage) return decision

    const routed = agent.session.requestHeader()?.config
    const provider = routed?.provider ?? agent.options.provider
    const model = routed?.model ?? agent.options.model
    if (provider === undefined || model === undefined) {
      throw new LlmError(
        'cannot prepare image input because the current model route is unresolved',
        'VISION_ROUTE_UNRESOLVED',
      )
    }
    const mainInfo = await this.ctx.llm.resolveModelInfo(provider, model, signal)
    if (mainInfo.inputModalities?.includes('image') === true) return decision
    const sidecarInfo = await this.ctx.llm.resolveModelInfo(this.config.provider, this.config.model, signal)
    if (sidecarInfo.inputModalities?.includes('image') !== true) {
      throw new LlmError(
        `vision sidecar model "${this.config.model}" does not declare image input`,
        'VISION_MODEL_NOT_IMAGE_CAPABLE',
      )
    }

    const state: DescriptionState = { count: 0, descriptions: new Map(), sessionId: agent.session.id }
    const replacements: Array<{ event: SurfaceEvent; message: Message }> = []
    for (const message of historical) {
      if (!contentHasUnresolvedImage(message.content)) continue
      const enriched = await this.enrichMessage(message, state, signal)
      const event = messageEvent(agent.session.events, message.id)
      if (event === undefined) {
        throw new LlmError(
          `cannot persist the vision description for message "${String(message.id)}"`,
          'VISION_MESSAGE_NOT_DURABLE',
        )
      }
      replacements.push({ event, message: enriched })
    }

    const entered: UserMessage[] = []
    for (const message of decision.messages) {
      entered.push(await this.enrichMessage(message, state, signal))
    }
    for (const replacement of replacements) replaceMessage(agent.session, replacement.event, replacement.message)
    if (replacements.length > 0) await this.ctx.sessions.flush(agent.session)
    return { kind: 'enter', messages: entered }
  }

  private async enrichMessage<T extends Message>(message: T, state: DescriptionState, signal: AbortSignal): Promise<T> {
    const enriched = await this.enrichBlocks(message.content, state, signal)
    if (!enriched.changed) return message
    return freezeMessage({ ...message, content: enriched.blocks } as T)
  }

  private async enrichBlocks(
    blocks: readonly ContentBlock[],
    state: DescriptionState,
    signal: AbortSignal,
  ): Promise<EnrichedBlocks> {
    const result: ContentBlock[] = []
    let changed = false
    for (const block of blocks) {
      if (block.type === 'image') {
        if (block.vision !== undefined) {
          result.push(block)
          continue
        }
        const text = await this.descriptionFor(block.attachment.attachmentId.toString(), block.attachment, state, signal)
        result.push({
          ...block,
          vision: { provider: this.config.provider, model: this.config.model, text },
        })
        changed = true
        continue
      }
      if (block.type === 'tool-result') {
        const nested = await this.enrichBlocks(block.content, state, signal)
        result.push(nested.changed ? { ...block, content: nested.blocks } : block)
        changed ||= nested.changed
        continue
      }
      result.push(block)
    }
    return { blocks: result, changed }
  }

  private async descriptionFor(
    key: string,
    attachment: ImageAttachmentRef,
    state: DescriptionState,
    signal: AbortSignal,
  ): Promise<string> {
    const existing = state.descriptions.get(key)
    if (existing !== undefined) return existing
    state.count += 1
    if (state.count > this.config.maxImagesPerStep) {
      throw new LlmError(
        `vision sidecar image limit exceeded: at most ${this.config.maxImagesPerStep} distinct images per step`,
        'VISION_IMAGE_LIMIT',
      )
    }
    const pending = this.describe(attachment, state.sessionId, signal)
    state.descriptions.set(key, pending)
    return pending
  }

  private async describe(
    image: ImageAttachmentRef,
    sessionId: Session['id'],
    signal: AbortSignal,
  ): Promise<string> {
    if (this.ctx.get('attachments') === undefined) {
      throw new LlmError('vision sidecar requires the durable attachment service', 'VISION_ATTACHMENT_SERVICE_MISSING')
    }
    using timer = deadline(signal, this.config.timeoutMs, VISION_SIDECAR_TIMEOUT)
    const options: GenerateOptions = {
      provider: this.config.provider,
      model: this.config.model,
      messages: [createUserMessage({
        content: [
          { type: 'text', text: VISION_DESCRIPTION_PROMPT },
          { type: 'image', attachment: image },
        ],
        source: { kind: 'plugin', plugin: name },
      })],
      maxTokens: this.config.maxOutputTokens,
      signal: timer.signal,
      sessionId,
      purpose: 'vision',
    }
    const assembler = new BlockAssembler()
    for await (const chunk of this.ctx.llm.stream(options)) assembler.push(chunk)
    if (timeoutOf(timer.signal, VISION_SIDECAR_TIMEOUT) !== undefined) {
      throw new LlmError(
        `vision sidecar timed out after ${this.config.timeoutMs}ms`,
        VISION_SIDECAR_TIMEOUT,
      )
    }
    signal.throwIfAborted()
    const finish = assembler.finish
    if (finish.kind === 'error' || finish.kind === 'aborted') {
      throw new LlmError(finish.failure.message, finish.failure.code, {
        ...finish.failure.status === undefined ? {} : { status: finish.failure.status },
        ...finish.failure.providerRetryAfterMs === undefined ? {} : { providerRetryAfterMs: finish.failure.providerRetryAfterMs },
        ...finish.failure.requestId === undefined ? {} : { requestId: finish.failure.requestId },
      })
    }
    const text = assembler.blocks()
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()
    if (text.length === 0) throw new LlmError('vision sidecar returned no description', 'VISION_EMPTY_RESPONSE')
    return text.length <= this.config.maxDescriptionChars
      ? text
      : `${text.slice(0, this.config.maxDescriptionChars - 1)}…`
  }
}

/** Find the surface event that produced one derived message id. */
function messageEvent(events: readonly SessionEvent[], id: Message['id']): SurfaceEvent | undefined {
  return events.findLast((event): event is SurfaceEvent => {
    if (!isSurfaceEvent(event)) return false
    switch (event.type) {
      case 'user/message':
        return event.data.id === id
      case 'assistant/message':
      case 'tool/result':
        return event.data.message.id === id
    }
  })
}

/** Replace one surface node while preserving its event family and metadata. */
function replaceMessage(session: Session, event: SurfaceEvent, message: Message): void {
  const surface = { surfaceOp: { op: 'replace' as const, start: event.seq, end: event.seq }, sourceEventSeqs: [event.seq] }
  switch (event.type) {
    case 'user/message':
      session.append('user/message', message as UserMessage, surface)
      return
    case 'assistant/message':
      session.append('assistant/message', { ...event.data, message: message as AssistantMessage }, surface)
      return
    case 'tool/result':
      session.append('tool/result', { ...event.data, message: message as ToolResultMessage }, surface)
      return
  }
}

/** Mount the sidecar service and its pre-step consumer. */
export function apply(ctx: Context, config: Config): void {
  const sidecar = new VisionSidecar(ctx, config)
  ctx.on('agent/pre-step', async ({ agent, signal }, next): Promise<PreStepDecision> => {
    const decision = await next()
    return sidecar.prepare(agent, decision, signal)
  }, { prepend: true })
}
