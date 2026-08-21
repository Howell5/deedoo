/**
 * Local provider for the Widgets registry. Projects are self-contained static
 * HTML directories under DSH_HOME; reads revalidate the manifest and entry,
 * while external requests pass through exact-host HTTPS policy.
 * @module @deepseek-ai/dsh-widgets-local
 */

import { randomUUID } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { constants } from 'node:fs'
import {
  access, lstat, mkdir, mkdtemp, opendir, readFile, realpath, rename, rm,
} from 'node:fs/promises'
import { isIP } from 'node:net'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { Service } from '@deepseek-ai/cordis'
import { watch as chokidarWatch } from 'chokidar'
import z from '@deepseek-ai/schemastery'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import {
  WidgetError, WidgetId, Widgets, parseWidgetManifest, type WidgetDocument,
  type WidgetFetchResult, type WidgetManifest, type WidgetView,
} from '@deepseek-ai/dsh-widgets'
import { BUILT_IN_WIDGETS } from './examples.ts'

const MAX_MANIFEST_BYTES = 64 * 1024
const MAX_HTML_BYTES = 512 * 1024
const MAX_FETCH_BYTES = 512 * 1024
const FETCH_TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 3

const STARTER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Widget</title>
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    body {
      display: grid;
      place-items: center;
      padding: 12%;
      background: #f4f1ea;
      color: #27251f;
      font-family: ui-sans-serif, system-ui, sans-serif;
      text-align: center;
    }
    main { max-width: 28rem; }
    small { color: #817b70; font-size: clamp(9px, 2.5vw, 12px); letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: .7rem 0; font-size: clamp(22px, 7vw, 44px); line-height: 1.04; letter-spacing: -.04em; }
    p { margin: 0; color: #6e685e; font-size: clamp(11px, 3vw, 15px); line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <small>New Widget</small>
    <h1>Tell Agent what this should become.</h1>
    <p>Describe the information, action, or change you want in the conversation beside this preview.</p>
  </main>
</body>
</html>
`

const STARTER_INSTRUCTIONS = `# Widget project

This directory is one local Widget shown inside DeepSeek Harness. Edit the files directly when the user asks to create or change the Widget.

## Design workflow

Apply this workflow to every creation and redesign, including incremental changes. When the purpose gives enough context, make the visual decisions instead of asking the user to choose a style.

1. Infer the audience, the moment of use, the primary information or action, and the feeling the Widget should create.
2. Form one private design read before editing: choose a domain-appropriate visual metaphor, the primary glance signal, typography roles, palette, geometry, density, and only the motion that communicates state or feedback.
3. Implement one coherent visual system. A financial ledger, laboratory instrument, classroom notebook, ambient display, and personal utility should not look like recolored versions of one template.
4. Review the finished HTML and CSS against the quality bar below before ending the task. Fix generic or inconsistent choices without waiting for the user to point them out.

## Quality bar

- Make the result feel like a purpose-built desktop object, not a website or dashboard squeezed into a card. The main signal must be understandable at a glance.
- Let the subject determine the visual language. Treat object metaphors as creative prompts, not fixed templates to repeat across Widgets.
- Choose deliberate typography with suitable CJK, numeral, and fallback behavior. Do not use Inter or a default system stack without a reason.
- Lock one palette, one accent, and one geometry system. Use cards only when grouping or elevation carries meaning.
- Avoid generic dashboards, repeated metric cards, AI-purple gradients, decorative status dots, fake precision, and visual themes reused from unrelated Widgets.
- Provide loading, empty, error, and stale states when the Widget depends on data. Label invented values as sample data.
- Give interactive controls visible hover, active, and keyboard-focus states. Preserve readable contrast, system color preference, and reduced-motion behavior.

## Runtime rules

- Keep \`widget.json\` valid and keep its id unchanged.
- Keep the entry self-contained: inline its scripts, styles, fonts, and images.
- Do not add Node.js dependencies, a build step, or a localhost server.
- For public network data, add each exact HTTPS hostname to \`permissions.network\` and call \`window.dshWidget.fetch(url)\` from the entry document.
- Update the Widget name and version in \`widget.json\` when the visible product changes.
`

/** Local provider configuration. */
export interface Config {
  /** Explicit managed-project root; omitted resolves below DSH_HOME. */
  root?: string
  /** Seed calculator and gold examples when absent. */
  seedExamples: boolean
  /** Watch managed projects and publish live-change events. */
  watch: boolean
  /** File write settle window before publishing a change. */
  watchDebounceMs: number
}

/** Local provider configuration validator. */
export const Config: z<Config> = z.object({
  root: z.string(),
  seedExamples: z.boolean().default(true),
  watch: z.boolean().default(true),
  watchDebounceMs: z.number().min(20).max(5_000).step(1).default(120),
})

/** Convert unknown filesystem/parser failures into the provider error vocabulary. */
function invalidProject(path: string, error: unknown): WidgetError {
  return error instanceof WidgetError
    ? error
    : new WidgetError('invalid-project', `Widget project '${path}' is invalid: ${error instanceof Error ? error.message : String(error)}`)
}

/** Report whether an unknown filesystem failure carries a Node error code. */
function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

/** Resolve one changed path to its direct managed Widget id. */
function changedWidgetId(root: string, changedPath: string): WidgetId | undefined {
  const local = relative(root, changedPath)
  if (local === '' || local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) return undefined
  const [id] = local.split(sep)
  if (id === undefined || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) return undefined
  return WidgetId(id)
}

/** Read a bounded UTF-8 text file. */
async function readBounded(path: string, maxBytes: number): Promise<string> {
  const info = await lstat(path)
  if (!info.isFile()) throw new Error(`'${path}' is not a regular file`)
  if (info.size > maxBytes) throw new Error(`'${path}' exceeds ${maxBytes} bytes`)
  return readFile(path, 'utf8')
}

/** Resolve an entry below one real project root without following it outside. */
async function resolveEntry(project: string, entry: string): Promise<string> {
  if (isAbsolute(entry) || entry.split(/[\\/]/).includes('..')) {
    throw new Error('entry must be a relative path without parent traversal')
  }
  const root = await realpath(project)
  const candidate = await realpath(resolve(root, entry))
  const rel = relative(root, candidate)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error('entry resolves outside the project directory')
  }
  return candidate
}

/** Reject literal and resolved destinations that can reach the local machine or private networks. */
function isPrivateAddress(address: string): boolean {
  if (address === '::1' || address === '::' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe8') || address.startsWith('fe9') || address.startsWith('fea') || address.startsWith('feb')) return true
  if (!address.includes('.')) return false
  const [first = 0, second = 0] = address.split('.').map(Number)
  return first === 10
    || first === 127
    || first === 0
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
}

/** Validate one external URL against the exact manifest allowlist and resolved addresses. */
async function assertAllowedUrl(url: URL, manifest: WidgetManifest): Promise<void> {
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') {
    throw new WidgetError('permission-denied', 'Widgets may request only credential-free HTTPS URLs on the default port')
  }
  if (!manifest.permissions.network.includes(url.hostname)) {
    throw new WidgetError('permission-denied', `Widget '${manifest.id}' has no network permission for '${url.hostname}'`)
  }
  const addresses = isIP(url.hostname) === 0
    ? await lookup(url.hostname, { all: true })
    : [{ address: url.hostname }]
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new WidgetError('permission-denied', `Widget network destination '${url.hostname}' resolves to a private address`)
  }
}

/** Read a response stream while enforcing the complete body bound. */
async function readResponseBody(response: Response): Promise<string> {
  if (response.body === null) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      bytes += next.value.byteLength
      if (bytes > MAX_FETCH_BYTES) {
        await reader.cancel()
        throw new WidgetError('network-failed', `Widget response exceeds ${MAX_FETCH_BYTES} bytes`)
      }
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const combined = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(combined)
}

/** Local filesystem and network implementation of the Widgets service. */
export default class LocalWidgets extends Widgets {
  static Config = Config
  private readonly root: string
  private readonly shouldSeedExamples: boolean
  private readonly shouldWatch: boolean
  private readonly watchDebounceMs: number
  private readonly builtIns = new Set(BUILT_IN_WIDGETS.map(widget => widget.id))

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.root = resolve(config.root ?? join(resolveDshHome(), 'widgets', 'projects'))
    this.shouldSeedExamples = config.seedExamples
    this.shouldWatch = config.watch
    this.watchDebounceMs = config.watchDebounceMs
  }

  /** Seed examples, then observe managed project edits until disposal. */
  async* [Service.init](): AsyncGenerator<() => Promise<void>, void, void> {
    if (this.shouldSeedExamples) await this.seedExamples()
    else await mkdir(this.root, { recursive: true, mode: 0o700 })
    if (!this.shouldWatch) return
    let closed = false
    const watcher = chokidarWatch(this.root, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.watchDebounceMs,
        pollInterval: Math.max(10, Math.min(this.watchDebounceMs, 50)),
      },
    })
    watcher.on('all', (_event, changedPath) => {
      if (closed) return
      const id = changedWidgetId(this.root, changedPath)
      if (id !== undefined) this.ctx.emit('widgets/changed', id)
    })
    watcher.on('error', (error) => {
      this.ctx.logger.warn('widgets-local: watcher error under %s', this.root)
      this.ctx.logger.warn(error)
    })
    yield async () => {
      closed = true
      await watcher.close()
    }
  }

  /** Seed built-ins without replacing a project the user already owns. */
  private async seedExamples(): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    for (const example of BUILT_IN_WIDGETS) {
      const project = join(this.root, example.id)
      try {
        await access(project, constants.F_OK)
        continue
      } catch {
        // Absence is the only expected reason to create the example.
      }
      const staging = await mkdtemp(join(this.root, `.seed-${example.id}-`))
      try {
        await writeFileAtomic(join(staging, 'widget.json'), example.manifest, { mode: 0o600, dirMode: 0o700 })
        await writeFileAtomic(join(staging, 'dist', 'index.html'), example.html, { mode: 0o600, dirMode: 0o700 })
        await rename(staging, project)
      } catch (error) {
        await rm(staging, { recursive: true, force: true })
        // Another process may have won the same first-run seed.
        try {
          await access(project, constants.F_OK)
        } catch {
          throw error
        }
      }
    }
  }

  /** Read and validate one managed project. */
  private async project(id: WidgetId | string): Promise<WidgetDocument> {
    const path = join(this.root, id)
    try {
      const root = await realpath(path)
      if (dirname(root) !== await realpath(this.root) || basename(root) !== id) {
        throw new Error('managed project path is not a direct real directory child')
      }
      const rawManifest = await readBounded(join(root, 'widget.json'), MAX_MANIFEST_BYTES)
      const manifest = parseWidgetManifest(JSON.parse(rawManifest))
      if (manifest.id !== id) throw new Error(`manifest id '${manifest.id}' does not match directory '${id}'`)
      const entry = await resolveEntry(root, manifest.entry)
      const html = await readBounded(entry, MAX_HTML_BYTES)
      return {
        widget: { manifest, sourcePath: root, builtIn: this.builtIns.has(manifest.id) },
        html,
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | null)?.code
      if (code === 'ENOENT') throw new WidgetError('not-found', `Widget '${id}' is not installed`)
      throw invalidProject(path, error)
    }
  }

  async list(): Promise<WidgetView[]> {
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    const views: WidgetView[] = []
    const directory = await opendir(this.root)
    for await (const entry of directory) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      try {
        views.push((await this.project(entry.name)).widget)
      } catch (error) {
        this.ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
      }
    }
    return views.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
  }

  async create(): Promise<WidgetView> {
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    const id = WidgetId(`widget-${randomUUID()}`)
    const target = join(this.root, id)
    const staging = await mkdtemp(join(this.root, '.create-'))
    const manifest: WidgetManifest = {
      schemaVersion: 1,
      id,
      name: 'New Widget',
      version: '0.1.0',
      runtime: 'static',
      entry: 'dist/index.html',
      aspectRatios: ['1:1'],
      defaultAspectRatio: '1:1',
      permissions: { network: [] },
      refresh: { mode: 'manual', minimumIntervalSeconds: 30 },
    }
    try {
      await writeFileAtomic(join(staging, 'widget.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, dirMode: 0o700 })
      await writeFileAtomic(join(staging, manifest.entry), STARTER_HTML, { mode: 0o600, dirMode: 0o700 })
      await writeFileAtomic(join(staging, 'AGENTS.md'), STARTER_INSTRUCTIONS, { mode: 0o600, dirMode: 0o700 })
      await rename(staging, target)
      return (await this.project(id)).widget
    } catch (error) {
      await rm(staging, { recursive: true, force: true })
      throw invalidProject(target, error)
    }
  }

  read(id: WidgetId): Promise<WidgetDocument> {
    return this.project(id)
  }

  async install(sourcePath: string): Promise<WidgetView> {
    if (!isAbsolute(sourcePath)) throw new WidgetError('invalid-project', 'Widget source path must be absolute')
    let source: string
    try {
      source = await realpath(sourcePath)
      const raw = await readBounded(join(source, 'widget.json'), MAX_MANIFEST_BYTES)
      const manifest = parseWidgetManifest(JSON.parse(raw))
      const entry = await resolveEntry(source, manifest.entry)
      const html = await readBounded(entry, MAX_HTML_BYTES)
      const target = join(this.root, manifest.id)
      try {
        await access(target, constants.F_OK)
        throw new WidgetError('already-installed', `Widget '${manifest.id}' is already installed`)
      } catch (error) {
        if (error instanceof WidgetError) throw error
      }
      await mkdir(this.root, { recursive: true, mode: 0o700 })
      const staging = await mkdtemp(join(this.root, `.install-${manifest.id}-`))
      try {
        await writeFileAtomic(join(staging, 'widget.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, dirMode: 0o700 })
        await writeFileAtomic(join(staging, manifest.entry), html, { mode: 0o600, dirMode: 0o700 })
        await rename(staging, target)
      } catch (error) {
        await rm(staging, { recursive: true, force: true })
        throw error
      }
      return (await this.project(manifest.id)).widget
    } catch (error) {
      throw invalidProject(sourcePath, error)
    }
  }

  async remove(id: WidgetId): Promise<void> {
    if (this.builtIns.has(id)) throw new WidgetError('permission-denied', `Built-in Widget '${id}' cannot be removed`)
    const target = join(this.root, id)
    const info = await lstat(target).catch((error: unknown) => {
      if (isErrnoException(error) && error.code === 'ENOENT') {
        throw new WidgetError('not-found', `Widget '${id}' is not installed`)
      }
      throw error
    })
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new WidgetError('invalid-project', `Managed Widget '${id}' is not a real directory`)
    }
    await rm(target, { recursive: true })
  }

  /**
   * Perform a bounded external GET after checking the calling manifest.
   * @param id - calling installed Widget.
   * @param rawUrl - absolute external HTTPS URL.
   * @param signal - caller cancellation lifetime.
   * @returns bounded textual response.
   */
  async fetch(id: WidgetId, rawUrl: string, signal: AbortSignal): Promise<WidgetFetchResult> {
    const { widget } = await this.project(id)
    let current: URL
    try {
      current = new URL(rawUrl)
    } catch {
      throw new WidgetError('permission-denied', 'Widget fetch URL is invalid')
    }
    const combined = AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)])
    try {
      for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
        await assertAllowedUrl(current, widget.manifest)
        const response = await fetch(current, {
          method: 'GET',
          redirect: 'manual',
          signal: combined,
          headers: { accept: 'application/json,text/plain,text/csv;q=0.9' },
        })
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location')
          if (location === null || redirects === MAX_REDIRECTS) {
            throw new WidgetError('network-failed', 'Widget request exceeded the redirect limit')
          }
          current = new URL(location, current)
          continue
        }
        return {
          status: response.status,
          contentType: response.headers.get('content-type') ?? 'text/plain',
          body: await readResponseBody(response),
        }
      }
      throw new WidgetError('network-failed', 'Widget request exceeded the redirect limit')
    } catch (error) {
      if (error instanceof WidgetError) throw error
      if (combined.aborted) throw new WidgetError('network-failed', 'Widget request timed out or was cancelled')
      throw new WidgetError('network-failed', `Widget request failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
