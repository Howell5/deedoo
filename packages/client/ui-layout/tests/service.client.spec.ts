/**
 * LayoutController behavior: the cross-plugin panel-action face. Geometry
 * lives in the entry store (layout-store.spec.ts) — here we assert the
 * delegation contract: panel-action forwarding, first-class application
 * selection notifications, unwired failure, and re-attach replacement.
 */
import { describe, expect, it, vi } from 'vitest'
import { LayoutController } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'
import type { PanelActions } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'

function fakePanels(): PanelActions {
  return {
    setSidebar: vi.fn(),
    setDetails: vi.fn(),
    toggleSidebar: vi.fn(),
    setNarrow: vi.fn(),
    openDetails: vi.fn(),
    closeDetails: vi.fn(),
  }
}

describe('LayoutController', () => {
  it('forwards the three panel actions to the attached set', () => {
    const service = new LayoutController()
    const panels = fakePanels()
    service.attachPanels(panels)

    service.toggleSidebar()
    service.openDetails()
    service.closeDetails()

    expect(panels.toggleSidebar).toHaveBeenCalledTimes(1)
    expect(panels.openDetails).toHaveBeenCalledTimes(1)
    expect(panels.closeDetails).toHaveBeenCalledTimes(1)
    expect(panels.setSidebar).not.toHaveBeenCalled()
    expect(panels.setDetails).not.toHaveBeenCalled()
  })

  it('fails loud before the root entry wired its actions', () => {
    const service = new LayoutController()
    expect(() => { service.toggleSidebar() }).toThrow(/panel actions not wired/)
    expect(() => { service.openDetails() }).toThrow(/panel actions not wired/)
    expect(() => { service.closeDetails() }).toThrow(/panel actions not wired/)
  })

  it('re-attach overwrites the stale action set (entry re-register)', () => {
    const service = new LayoutController()
    const stale = fakePanels()
    const fresh = fakePanels()
    service.attachPanels(stale)
    service.attachPanels(fresh)

    service.toggleSidebar()

    expect(stale.toggleSidebar).not.toHaveBeenCalled()
    expect(fresh.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('selects a first-class application, closes details, and disposes notifications', () => {
    const service = new LayoutController()
    const panels = fakePanels()
    const listener = vi.fn()
    service.attachPanels(panels)
    const dispose = service.subscribeApplication(listener)

    service.selectApplication('widgets')
    service.selectApplication('widgets')
    expect(service.getApplication()).toBe('widgets')
    expect(panels.closeDetails).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledTimes(1)

    dispose()
    service.selectApplication('conversation')
    expect(service.getApplication()).toBe('conversation')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty application id without changing the current selection', () => {
    const service = new LayoutController()
    expect(() => { service.selectApplication('  ') }).toThrow(/must be non-empty/)
    expect(service.getApplication()).toBe('conversation')
  })

  it('selects one session-bound feature details surface and clears it on ordinary details', () => {
    const service = new LayoutController()
    const panels = fakePanels()
    const listener = vi.fn()
    service.attachPanels(panels)
    const dispose = service.subscribeDetailsApplication(listener)

    service.openApplicationDetails('widgets', 'session-1')
    service.openApplicationDetails('widgets', 'session-1')
    expect(service.getDetailsApplication()).toEqual({ id: 'widgets', scopeKey: 'session-1' })
    expect(panels.openDetails).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenCalledTimes(1)

    service.openDetails()
    expect(service.getDetailsApplication()).toBeUndefined()
    expect(listener).toHaveBeenCalledTimes(2)

    dispose()
    service.closeDetails()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('rejects incomplete feature details selections', () => {
    const service = new LayoutController()
    expect(() => { service.openApplicationDetails('', 'session-1') }).toThrow(/must be non-empty/)
    expect(() => { service.openApplicationDetails('widgets', ' ') }).toThrow(/must be non-empty/)
    expect(service.getDetailsApplication()).toBeUndefined()
  })
})
