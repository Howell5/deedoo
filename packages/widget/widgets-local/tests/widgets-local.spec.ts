import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { WidgetError, WidgetId } from '@deepseek-ai/dsh-widgets'
import LocalWidgets from '../src/index.ts'

const watcher = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => void>(),
  close: vi.fn(async () => {}),
}))

vi.mock('chokidar', () => ({
  watch: vi.fn(() => {
    const instance = {
      on(event: string, listener: (...args: unknown[]) => void) {
        watcher.handlers.set(event, listener)
        return instance
      },
      close: watcher.close,
    }
    return instance
  }),
}))

vi.mock('node:dns/promises', () => ({
  lookup: async () => [{ address: '93.184.216.34', family: 4 }],
}))

const roots: string[] = []

async function harness(seedExamples = true, watch = false) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-widgets-'))
  roots.push(root)
  const ctx = new Context()
  const fiber = ctx.plugin(LocalWidgets, {
    root,
    seedExamples,
    watch,
    watchDebounceMs: 120,
  })
  await fiber.await()
  return { ctx, fiber, root }
}

afterEach(async () => {
  vi.unstubAllGlobals()
  watcher.handlers.clear()
  watcher.close.mockClear()
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('LocalWidgets', () => {
  it('seeds readable calculator and gold projects without requiring a build server', async () => {
    const { ctx, fiber } = await harness()
    try {
      const widgets = await ctx.widgets.list()
      expect(widgets.map(widget => widget.manifest.id)).toEqual(['gold-price', 'calculator'])
      expect(widgets.find(widget => widget.manifest.id === 'calculator')?.manifest.aspectRatios).toEqual(['1:1'])
      expect(widgets.find(widget => widget.manifest.id === 'gold-price')?.manifest.aspectRatios).toEqual(['16:9'])
      expect(widgets.find(widget => widget.manifest.id === 'calculator')?.manifest.permissions.network).toEqual([])
      expect(widgets.find(widget => widget.manifest.id === 'gold-price')?.manifest.permissions.network).toEqual(['xaus.com'])
      const calculator = await ctx.widgets.read(WidgetId('calculator'))
      expect(calculator.widget.builtIn).toBe(true)
      expect(calculator.html).toContain('Calculator keypad')
    } finally {
      await fiber.dispose()
    }
  })

  it('creates an isolated starter project for Agent authoring', async () => {
    const { ctx, fiber } = await harness(false)
    try {
      const first = await ctx.widgets.create()
      const second = await ctx.widgets.create()
      expect(first).toMatchObject({
        manifest: {
          name: 'New Widget',
          aspectRatios: ['1:1'],
          permissions: { network: [] },
        },
        builtIn: false,
      })
      expect(second.manifest.id).not.toBe(first.manifest.id)
      expect((await ctx.widgets.read(first.manifest.id)).html).toContain('Tell Agent what this should become.')
      const instructions = await readFile(join(first.sourcePath, 'AGENTS.md'), 'utf8')
      expect(instructions).toContain('window.dshWidget.fetch(url)')
      expect(instructions).toContain('Apply this workflow to every creation and redesign, including incremental changes.')
      expect(instructions).toContain('Form one private design read before editing')
      expect(instructions).toContain('purpose-built desktop object')
      expect(instructions).toContain('Provide loading, empty, error, and stale states when the Widget depends on data.')
      expect(instructions).not.toContain('document scrolling')
    } finally {
      await fiber.dispose()
    }
  })

  it('imports a self-contained static project and rejects duplicate ids', async () => {
    const { ctx, fiber, root } = await harness(false)
    const source = join(root, '..', 'source')
    await mkdir(join(source, 'dist'), { recursive: true })
    await writeFile(join(source, 'widget.json'), JSON.stringify({
      schemaVersion: 1,
      id: 'hello',
      name: 'Hello',
      version: '1',
      runtime: 'static',
      entry: 'dist/index.html',
      aspectRatios: ['1:1'],
      defaultAspectRatio: '1:1',
      permissions: { network: [] },
      refresh: { mode: 'manual', minimumIntervalSeconds: 30 },
    }))
    await writeFile(join(source, 'dist', 'index.html'), '<!doctype html><title>Hello</title>')
    try {
      await expect(ctx.widgets.install(source)).resolves.toMatchObject({
        manifest: { id: 'hello' },
        builtIn: false,
      })
      await expect(ctx.widgets.install(source)).rejects.toMatchObject({
        code: 'already-installed',
      })
    } finally {
      await fiber.dispose()
    }
  })

  it('denies a network host absent from the manifest before issuing fetch', async () => {
    const { ctx, fiber } = await harness()
    try {
      await expect(ctx.widgets.fetch(
        WidgetId('calculator'),
        'https://xaus.com/api/v1/history',
        new AbortController().signal,
      )).rejects.toEqual(expect.objectContaining<Partial<WidgetError>>({
        code: 'permission-denied',
      }))
    } finally {
      await fiber.dispose()
    }
  })

  it('returns a bounded response for the gold example through its declared host', async () => {
    const { ctx, fiber } = await harness()
    const networkFetch = vi.fn(async () => new Response(
      JSON.stringify({ points: [{ d: '2026-08-19', c: 3331.2 }, { d: '2026-08-20', c: 3350.4 }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', networkFetch)
    try {
      await expect(ctx.widgets.fetch(
        WidgetId('gold-price'),
        'https://xaus.com/api/v1/history',
        new AbortController().signal,
      )).resolves.toEqual({
        status: 200,
        contentType: 'application/json',
        body: '{"points":[{"d":"2026-08-19","c":3331.2},{"d":"2026-08-20","c":3350.4}]}',
      })
      expect(networkFetch).toHaveBeenCalledWith(
        new URL('https://xaus.com/api/v1/history'),
        expect.objectContaining({ method: 'GET', redirect: 'manual' }),
      )
    } finally {
      await fiber.dispose()
    }
  })

  it('publishes direct managed-project changes and closes its watcher on disposal', async () => {
    const { ctx, fiber, root } = await harness(false, true)
    const changes: string[] = []
    const stop = ctx.on('widgets/changed', (id) => { changes.push(id) })
    try {
      watcher.handlers.get('all')?.('change', join(root, 'gold-price', 'dist', 'index.html'))
      watcher.handlers.get('all')?.('change', join(root, '..', 'outside.html'))
      expect(changes).toEqual(['gold-price'])
    } finally {
      stop()
      await fiber.dispose()
    }
    expect(watcher.close).toHaveBeenCalledTimes(1)
  })
})
