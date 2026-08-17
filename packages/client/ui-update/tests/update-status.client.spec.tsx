// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UpdateStatus } from '../src/client/UpdateStatus.tsx'
import type { DeedooRelease } from '../src/client/update-check.ts'

const release: DeedooRelease = {
  tagName: 'v0.1.0-rc.6',
  htmlUrl: 'https://github.com/Howell5/deedoo/releases/tag/v0.1.0-rc.6',
}

describe('UpdateStatus', () => {
  it('renders nothing while checking', () => {
    const { container } = render(
      <UpdateStatus currentVersion="0.1.0-rc.5" fetchReleases={() => new Promise(() => {})} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when up to date', async () => {
    const fetchReleases = vi.fn(async () => [release])
    const { container } = render(
      <UpdateStatus currentVersion="0.1.0-rc.6" fetchReleases={fetchReleases} />,
    )
    await vi.waitFor(() => { expect(fetchReleases).toHaveBeenCalled() })
    expect(container.firstChild).toBeNull()
  })

  it('renders an update link with the new version when available', async () => {
    render(
      <UpdateStatus
        currentVersion="0.1.0-rc.5"
        fetchReleases={async () => [release]}
      />,
    )
    const link = await screen.findByTestId('update-available')
    expect(link.textContent).toContain('0.1.0-rc.6')
    expect(link.getAttribute('href')).toBe(release.htmlUrl)
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('stays silent when the fetch fails', async () => {
    const fetchReleases = vi.fn(async () => { throw new Error('network down') })
    const { container } = render(
      <UpdateStatus currentVersion="0.1.0-rc.5" fetchReleases={fetchReleases} />,
    )
    await vi.waitFor(() => { expect(fetchReleases).toHaveBeenCalled() })
    expect(container.firstChild).toBeNull()
  })
})
