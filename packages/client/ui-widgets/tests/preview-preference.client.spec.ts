// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isWidgetPreviewPreferred,
  setWidgetPreviewPreferred,
} from '../src/client/preview-preference.ts'

describe('Widget preview preference', () => {
  beforeEach(() => { localStorage.clear() })

  it('remembers open Workspaces independently and removes closed entries', () => {
    setWidgetPreviewPreferred('/widgets/gold', true)
    setWidgetPreviewPreferred('/widgets/weather', true)
    setWidgetPreviewPreferred('/widgets/gold', false)

    expect(isWidgetPreviewPreferred('/widgets/gold')).toBe(false)
    expect(isWidgetPreviewPreferred('/widgets/weather')).toBe(true)
  })

  it('treats malformed or unavailable browser storage as a closed preference', () => {
    localStorage.setItem('dsh.widgets.preview-open.v1', '{bad json')
    expect(isWidgetPreviewPreferred('/widgets/gold')).toBe(false)

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => { setWidgetPreviewPreferred('/widgets/gold', true) }).not.toThrow()
  })
})
