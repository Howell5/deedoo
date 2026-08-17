/**
 * Deedoo update pipeline — upstream version detection.
 *
 * The Deedoo desktop shell packages the DeepSeek Harness runtime, whose only
 * authoritative release stream is the npm `latest` dist-tag of
 * `@deepseek-ai/dsh` (upstream publishes no GitHub Releases or git tags).
 * This script fetches that tag, compares it to the version currently packaged
 * in this workspace (root package.json), and prints a machine-readable JSON
 * decision for the release workflow.
 *
 * Deterministic and injectable: callers may pass --upstream and --current to
 * pin both sides, which is how the unit tests and dry runs drive it.
 */

import { compareVersions } from '../release/bump.ts'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = '@deepseek-ai/dsh'
const DIST_TAGS_URL = `https://registry.npmjs.org/-/package/${PACKAGE_NAME}/dist-tags`
const NPM_PAGE_URL = `https://www.npmjs.com/package/${PACKAGE_NAME}`
const FETCH_TIMEOUT_MS = 10_000

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Machine-readable decision consumed by the release workflow. */
export interface UpdateDecision {
  /** Upstream npm `latest` dist-tag. */
  upstream: string
  /** Version currently packaged in this workspace. */
  current: string
  /** Whether upstream latest is strictly newer than current. */
  updateAvailable: boolean
  /** The version to build and release, when an update is available. */
  target: string | null
  /** Human reference to the upstream package page. */
  upstreamUrl: string
}

/** Fetch the npm `latest` dist-tag, failing loudly on network or parse errors. */
export async function fetchLatestDistTag(): Promise<string> {
  const response = await fetch(DIST_TAGS_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'deedoo-update-pipeline' },
  })
  if (!response.ok) {
    throw new Error(`npm dist-tags request failed with ${response.status}`)
  }
  const tags: unknown = await response.json()
  const latest = (tags as Record<string, string> | null)?.latest
  if (typeof latest !== 'string' || latest.length === 0) {
    throw new Error(`npm dist-tags payload has no "latest" tag: ${JSON.stringify(tags)}`)
  }
  return latest
}

/** Read the workspace root version, the version the desktop shell packages. */
export async function readCurrentVersion(): Promise<string> {
  const manifest = JSON.parse(
    await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
  ) as { version?: unknown }
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error('root package.json has no "version"')
  }
  return manifest.version
}

/** Compare upstream latest against current and produce the decision. */
export async function resolveUpdateDecision(
  overrides: { upstream?: string; current?: string } = {},
): Promise<UpdateDecision> {
  const upstream = overrides.upstream ?? (await fetchLatestDistTag())
  const current = overrides.current ?? (await readCurrentVersion())
  // Repo-owned semver comparator (standard precedence: a stable release
  // outranks the prerelease of the same numbers).
  const updateAvailable = compareVersions(upstream, current) > 0
  return {
    upstream,
    current,
    updateAvailable,
    target: updateAvailable ? upstream : null,
    upstreamUrl: NPM_PAGE_URL,
  }
}

/** Parse --key=value CLI overrides. */
function parseArgv(argv: readonly string[]): { upstream?: string; current?: string } {
  const overrides: { upstream?: string; current?: string } = {}
  for (const arg of argv) {
    const match = /^--(upstream|current)=(.+)$/.exec(arg)
    if (match !== null) {
      const key = match[1] as 'upstream' | 'current'
      const value = match[2]
      if (value !== undefined) overrides[key] = value
    }
  }
  return overrides
}

async function main(): Promise<void> {
  const decision = await resolveUpdateDecision(parseArgv(process.argv.slice(2)))
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main().catch((error: unknown) => {
    console.error(`[deedoo-update] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
}
