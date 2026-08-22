import { describe, expect, it } from 'vitest'
import { instrumentWidgetHtml } from '../src/client/frame-document.ts'

describe('fixed Widget canvas document', () => {
  it('denies scrolling and reports overflow to the parent bridge', () => {
    const document = instrumentWidgetHtml('<!doctype html><html><head><title>Widget</title></head><body></body></html>')
    expect(document).toContain('data-dsh-widget-canvas')
    expect(document).toContain('overflow:hidden')
    expect(document).toContain("kind:'layout'")
    expect(document).toContain('width>root.clientWidth+1||height>root.clientHeight+1')
  })

  it('injects the canvas rules into documents without a head', () => {
    const document = instrumentWidgetHtml('<main>Widget</main>')
    expect(document.indexOf('data-dsh-widget-canvas')).toBeLessThan(document.indexOf('<main>'))
  })
})
