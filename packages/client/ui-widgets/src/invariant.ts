/** Package-owned invariant companion for the Widgets client application. @module @deepseek-ai/dsh-client-ui-widgets/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-widgets'

/** Cordis companion plugin name. */
export const name = 'client-ui-widgets-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: the client slot registrations are lifecycle-tested directly. */
const install: InvariantInstaller = () => {}

/** Register the package invariant reservation. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
