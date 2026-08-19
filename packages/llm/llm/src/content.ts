/** Content-block structure helpers. @module @deepseek-ai/dsh-llm/content */

import type { ContentBlock } from './types.ts'

/**
 * True when typed model content contains an image block, walking nested
 * tool-result content. This is the one recursive image walk shared by every
 * image policy (capability gating, text-only serialization, compaction
 * survey), so a consumer cannot silently diverge on nesting depth.
 * @param content - typed model content blocks.
 * @returns whether any nested block is an image.
 */
export function contentHasImage(content: readonly ContentBlock[]): boolean {
  return content.some(block => block.type === 'image'
    || (block.type === 'tool-result' && contentHasImage(block.content)))
}

/**
 * True when typed model content contains an image without a durable sidecar
 * description, walking nested tool-result content.
 * @param content - typed model content blocks.
 * @returns whether an image still needs native image input or sidecar work.
 */
export function contentHasUnresolvedImage(content: readonly ContentBlock[]): boolean {
  return content.some(block => (block.type === 'image' && block.vision === undefined)
    || (block.type === 'tool-result' && contentHasUnresolvedImage(block.content)))
}
