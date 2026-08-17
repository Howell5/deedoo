import { describe, expect, it } from 'vitest'
import { resolveUpdateDecision } from './check-upstream.ts'

describe('resolveUpdateDecision', () => {
  it('detects a newer upstream rc', async () => {
    const decision = await resolveUpdateDecision({ upstream: '0.1.0-rc.6', current: '0.1.0-rc.5' })
    expect(decision.updateAvailable).toBe(true)
    expect(decision.target).toBe('0.1.0-rc.6')
  })

  it('treats an equal version as no update', async () => {
    const decision = await resolveUpdateDecision({ upstream: '0.1.0-rc.5', current: '0.1.0-rc.5' })
    expect(decision.updateAvailable).toBe(false)
    expect(decision.target).toBeNull()
  })

  it('treats an older upstream as no update', async () => {
    const decision = await resolveUpdateDecision({ upstream: '0.0.1-rc.5', current: '0.1.0-rc.5' })
    expect(decision.updateAvailable).toBe(false)
  })

  it('prefers a stable upstream over a newer rc', async () => {
    const decision = await resolveUpdateDecision({ upstream: '0.1.0', current: '0.1.0-rc.6' })
    expect(decision.updateAvailable).toBe(true)
    expect(decision.target).toBe('0.1.0')
  })

  it('orders prerelease identifiers numerically', async () => {
    const decision = await resolveUpdateDecision({ upstream: '0.1.0-rc.10', current: '0.1.0-rc.9' })
    expect(decision.updateAvailable).toBe(true)
  })

  it('reports the upstream reference URL', async () => {
    const decision = await resolveUpdateDecision({ upstream: '0.1.0-rc.6', current: '0.1.0-rc.5' })
    expect(decision.upstreamUrl).toContain('npmjs.com/package/@deepseek-ai/dsh')
  })
})
