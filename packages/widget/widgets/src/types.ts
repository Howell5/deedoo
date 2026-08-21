/**
 * Client-safe Widget event vocabulary shared with the Remote event projection.
 *
 * @module @deepseek-ai/dsh-widgets/types
 */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** Stable project identifier from a validated Widget manifest. */
export type WidgetId = Branded<'WidgetId'>

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * A managed Widget project changed on disk.
     * @mode emit
     * @param id - direct managed project directory id.
     */
    'widgets/changed'(id: WidgetId): void
  }
}
