/**
 * Settings-footer update indicator.
 *
 * Renders nothing while checking and when up to date (zero-noise principle);
 * when the running app is behind the newest Deedoo release it renders a
 * bottom-right link that opens the release page in the system browser (the
 * desktop shell routes external http(s) links there). Pure presentation: all
 * data arrives through the owner prop and the injected fetcher, and the
 * decision logic lives in update-check.ts.
 */

import { useEffect, useState } from 'react'
import { fetchDeedooReleases, resolveUpdateInfo, type DeedooRelease } from './update-check.ts'
import css from './UpdateStatus.module.css'

/** Owner props from the `settings.footer` seat. */
export interface UpdateStatusProps {
  /** Version packaged in the running app. */
  currentVersion: string
}

type Status = 'checking' | 'latest' | 'available'

/** Render one update indicator. */
export function UpdateStatus({
  currentVersion,
  fetchReleases = fetchDeedooReleases,
}: UpdateStatusProps & { fetchReleases?: () => Promise<readonly DeedooRelease[]> }) {
  const [status, setStatus] = useState<Status>('checking')
  const [latest, setLatest] = useState<string>('')
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    void fetchReleases()
      .then((releases) => {
        const info = resolveUpdateInfo(currentVersion, releases)
        if (cancelled) return
        if (info.updateAvailable && info.latest !== null && info.url !== null) {
          setLatest(info.latest)
          setUrl(info.url)
          setStatus('available')
        } else {
          setStatus('latest')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('latest')
      })
    return () => { cancelled = true }
  }, [currentVersion, fetchReleases])

  if (status !== 'available') return null
  return (
    <a
      className={css.badge}
      href={url}
      target="_blank"
      rel="noreferrer"
      data-testid="update-available"
    >
      <span className={css.dot} aria-hidden="true" />
      <span>新版本 v{latest} 可用</span>
      <span className={css.arrow} aria-hidden="true">→</span>
    </a>
  )
}
