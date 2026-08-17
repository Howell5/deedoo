import { describe, expect, it } from 'vitest'
import {
  parseReleaseTag, resolveUpdateInfo, UNKNOWN_VERSION, type DeedooRelease,
} from '../src/client/update-check.ts'

function release(tagName: string, url = 'https://github.com/Howell5/deedoo/releases/tag/1'): DeedooRelease {
  return { tagName, htmlUrl: url }
}

describe('parseReleaseTag', () => {
  it('strips a leading v', () => {
    expect(parseReleaseTag('v0.1.0-rc.6')).toBe('0.1.0-rc.6')
  })

  it('accepts a bare version', () => {
    expect(parseReleaseTag('0.1.0')).toBe('0.1.0')
  })

  it('rejects non-semver tags', () => {
    expect(parseReleaseTag('latest')).toBeNull()
    expect(parseReleaseTag('v1')).toBeNull()
  })
})

describe('resolveUpdateInfo', () => {
  it('detects a newer rc release', () => {
    const info = resolveUpdateInfo('0.1.0-rc.5', [release('v0.1.0-rc.6', 'https://example.invalid/r6')])
    expect(info.updateAvailable).toBe(true)
    expect(info.latest).toBe('0.1.0-rc.6')
    expect(info.url).toBe('https://example.invalid/r6')
  })

  it('reports up to date for the same version', () => {
    const info = resolveUpdateInfo('0.1.0-rc.6', [release('v0.1.0-rc.6')])
    expect(info.updateAvailable).toBe(false)
  })

  it('skips invalid tags and uses the first valid release', () => {
    const info = resolveUpdateInfo('0.1.0-rc.5', [release('not-a-version'), release('v0.1.0-rc.6', 'https://example.invalid/r6')])
    expect(info.updateAvailable).toBe(true)
    expect(info.latest).toBe('0.1.0-rc.6')
  })

  it('treats any release as an update when the current version is unknown', () => {
    const info = resolveUpdateInfo(UNKNOWN_VERSION, [release('v0.1.0-rc.6')])
    expect(info.updateAvailable).toBe(true)
  })

  it('reports no update when no valid release exists', () => {
    const info = resolveUpdateInfo('0.1.0-rc.5', [release('nothing-here')])
    expect(info.updateAvailable).toBe(false)
    expect(info.latest).toBeNull()
    expect(info.url).toBeNull()
  })

  it('prefers a stable release over a newer rc of the same numbers', () => {
    const info = resolveUpdateInfo('0.1.0-rc.6', [release('v0.1.0')])
    expect(info.updateAvailable).toBe(true)
  })
})
