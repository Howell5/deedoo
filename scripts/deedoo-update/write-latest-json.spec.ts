import { describe, expect, it } from 'vitest'
import { buildReleaseManifest } from './write-latest-json.ts'

describe('buildReleaseManifest', () => {
  it('includes version and release url', () => {
    const manifest = buildReleaseManifest('0.1.0-rc.6', 'https://github.com/Howell5/deedoo/releases/tag/v0.1.0-rc.6')
    expect(manifest.version).toBe('0.1.0-rc.6')
    expect(manifest.url).toContain('releases/tag/v0.1.0-rc.6')
  })

  it('omits publishedAt when absent', () => {
    const manifest = buildReleaseManifest('0.1.0-rc.6', 'https://example.invalid/')
    expect('publishedAt' in manifest).toBe(false)
  })

  it('serializes to JSON with a trailing newline', () => {
    const manifest = buildReleaseManifest('0.1.0-rc.6', 'https://example.invalid/')
    expect(`${JSON.stringify(manifest, null, 2)}\n`).toMatch(/\n$/)
  })
})
