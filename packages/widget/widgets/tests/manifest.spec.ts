import { describe, expect, it } from 'vitest'
import { parseWidgetManifest } from '../src/index.ts'

const base = {
  schemaVersion: 1,
  id: 'fixed-canvas',
  name: 'Fixed canvas',
  version: '1',
  runtime: 'static',
  entry: 'dist/index.html',
  aspectRatios: ['1:1', '16:9'],
  defaultAspectRatio: '1:1',
  permissions: { network: [] },
  refresh: { mode: 'manual', minimumIntervalSeconds: 30 },
} as const

describe('Widget manifest', () => {
  it('accepts only the fixed canvas aspect ratios', () => {
    expect(parseWidgetManifest(base)).toMatchObject({
      aspectRatios: ['1:1', '16:9'],
      defaultAspectRatio: '1:1',
    })
    expect(() => parseWidgetManifest({
      ...base,
      aspectRatios: ['4:3'],
      defaultAspectRatio: '4:3',
    })).toThrow()
  })

  it('requires the default canvas to be declared', () => {
    expect(() => parseWidgetManifest({
      ...base,
      defaultAspectRatio: '9:16',
    })).toThrow(/defaultAspectRatio must appear in aspectRatios/)
  })
})
