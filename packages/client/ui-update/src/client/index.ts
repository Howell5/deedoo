/**
 * Web update plugin, browser half: the settings-footer update indicator,
 * registered into the `settings.footer` seat owned by the settings domain.
 * Zero business face — the version arrives through the seat owner prop and
 * the release list through the injected fetcher; the decision logic is pure
 * (update-check.ts). Copy is inline Chinese (product copy); locale extraction
 * is deferred.
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings slot contract (SlotMap seat + owner props)
// and the ui-slots Context merge (ctx.slots) into the program.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { UpdateStatus } from './UpdateStatus.tsx'

export { fetchDeedooReleases, parseReleaseTag, resolveUpdateInfo } from './update-check.ts'
export type { DeedooRelease, UpdateInfo } from './update-check.ts'
export type { UpdateStatusProps } from './UpdateStatus.tsx'

/** Required service: the slot registry. */
export const inject = ['slots']

/**
 * Client plugin body: register the update indicator into the settings footer.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('settings.footer', () => ctx.slots.register(
    { name: 'settings.footer' },
    UpdateStatus,
  ))
}
