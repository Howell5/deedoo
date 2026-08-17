/**
 * Deedoo update detection — pure decision logic for the settings-footer
 * update indicator.
 *
 * The Deedoo desktop shell packages a DeepSeek Harness runtime whose version
 * tracks the workspace root. This module decides whether a newer packaged
 * version exists by comparing the running version against the newest release
 * published on the Deedoo GitHub repository. Pure functions only: the fetch
 * wrapper is the single wire boundary, and every decision is injectable for
 * tests.
 */

import semver from 'semver'

/** One GitHub release, reduced to the fields the indicator needs. */
export interface DeedooRelease {
  /** Release tag, e.g. `v0.1.0-rc.6`. */
  tagName: string
  /** Release page the user opens for the manual download. */
  htmlUrl: string
}

/** The update decision rendered by the settings footer. */
export interface UpdateInfo {
  /** Version packaged in the running app. */
  current: string
  /** Newest publishable version, when any release has a valid tag. */
  latest: string | null
  /** Whether the running app is behind the newest release. */
  updateAvailable: boolean
  /** Release page to open, when an update is available. */
  url: string | null
}

/** Version value when the running app version is unknown (web-only mode). */
export const UNKNOWN_VERSION = '0.0.0'

/** Default endpoint: newest release on the Deedoo repository. */
export const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/Howell5/deedoo/releases?per_page=1'

/** Strip a leading `v` from a release tag and validate the semver shape. */
export function parseReleaseTag(tag: string): string | null {
  const match = /^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(tag.trim())
  return match?.[1] ?? null
}

/**
 * Decide whether the running app is behind the newest valid release.
 * @param currentVersion - packaged version (`UNKNOWN_VERSION` when unknown).
 * @param releases - newest-first GitHub releases.
 * @returns The update decision.
 */
export function resolveUpdateInfo(
  currentVersion: string,
  releases: readonly DeedooRelease[],
): UpdateInfo {
  for (const release of releases) {
    const latest = parseReleaseTag(release.tagName)
    if (latest === null) continue
    const updateAvailable = currentVersion === UNKNOWN_VERSION || semver.gt(latest, currentVersion)
    return { current: currentVersion, latest, updateAvailable, url: release.htmlUrl }
  }
  return { current: currentVersion, latest: null, updateAvailable: false, url: null }
}

/**
 * Fetch the newest Deedoo release from the GitHub API (CORS-enabled). Wire
 * boundary: the response payload is validated before mapping.
 * @returns The newest release, or an empty list when the endpoint yields none.
 */
export async function fetchDeedooReleases(): Promise<readonly DeedooRelease[]> {
  const response = await fetch(GITHUB_RELEASES_URL, {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) {
    throw new Error(`GitHub releases request failed with ${response.status}`)
  }
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) {
    throw new Error('GitHub releases payload is not an array')
  }
  return payload.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return []
    const record = entry as Record<string, unknown>
    const tagName = typeof record.tag_name === 'string' ? record.tag_name : ''
    const htmlUrl = typeof record.html_url === 'string' ? record.html_url : ''
    return tagName.length > 0 && htmlUrl.length > 0
      ? [{ tagName, htmlUrl }]
      : []
  })
}
