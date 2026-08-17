/**
 * Deedoo update pipeline — release manifest generation.
 *
 * Writes the machine-readable latest.json that the release workflow attaches
 * to each GitHub Release. The desktop client (M2) reads the newest release's
 * manifest to learn the packaged version and download page URL.
 */

import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/** Per-release manifest attached to every Deedoo GitHub Release. */
export interface ReleaseManifest {
  /** Version packaged in this release. */
  version: string
  /** GitHub Release page the client opens for manual download. */
  url: string
  /** ISO timestamp of the release publication. */
  publishedAt?: string
}

/** Build the manifest for one release. Pure function, unit-testable. */
export function buildReleaseManifest(
  version: string,
  url: string,
  publishedAt?: string,
): ReleaseManifest {
  return {
    version,
    url,
    ...(publishedAt === undefined ? {} : { publishedAt }),
  }
}

/** Parse --key=value CLI arguments. */
function parseArgv(argv: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/.exec(arg)
    if (match !== null) {
      const key = match[1]
      const value = match[2]
      if (key !== undefined && value !== undefined) out[key] = value
    }
  }
  return out
}

async function main(): Promise<void> {
  const args = parseArgv(process.argv.slice(2))
  const version = args['version']
  const url = args['release-url']
  const output = args['output'] ?? 'dist/latest.json'
  if (version === undefined || url === undefined) {
    throw new Error('--version and --release-url are required')
  }
  const manifest = buildReleaseManifest(version, url, new Date().toISOString())
  const target = resolve(output)
  await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  process.stdout.write(`wrote ${target}\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main().catch((error: unknown) => {
    console.error(`[deedoo-update] ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
}
