import { describe, expect, it } from 'vitest'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { CallId } from '../src/brand.ts'
import { contentHasImage, contentHasUnresolvedImage } from '../src/content.ts'

const image: ImageAttachmentRef = {
  attachmentId: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as ImageAttachmentRef['attachmentId'],
  mediaType: 'image/png',
  bytes: 1,
  width: 1,
  height: 1,
}

describe('content image predicates', () => {
  it('walks nested tool results for raw and enriched images', () => {
    const raw = { type: 'image' as const, attachment: image }
    const enriched = {
      type: 'image' as const,
      attachment: image,
      vision: { provider: 'glm-vision', model: 'glm-4v-flash', text: 'a square' },
    }
    const nestedRaw = { type: 'tool-result' as const, toolCallId: CallId('call-1'), content: [raw] }
    const nestedEnriched = { ...nestedRaw, content: [enriched] }

    expect(contentHasImage([])).toBe(false)
    expect(contentHasImage([{ type: 'text', text: 'plain' }])).toBe(false)
    expect(contentHasImage([raw])).toBe(true)
    expect(contentHasImage([nestedRaw])).toBe(true)

    expect(contentHasUnresolvedImage([])).toBe(false)
    expect(contentHasUnresolvedImage([{ type: 'text', text: 'plain' }])).toBe(false)
    expect(contentHasUnresolvedImage([raw])).toBe(true)
    expect(contentHasUnresolvedImage([enriched])).toBe(false)
    expect(contentHasUnresolvedImage([nestedRaw])).toBe(true)
    expect(contentHasUnresolvedImage([nestedEnriched])).toBe(false)
  })
})
