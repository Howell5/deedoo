/** Package-owned invariant companion for the Widgets Service Definition. @module @deepseek-ai/dsh-widgets/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-widgets'

/** Cordis companion plugin name. */
export const name = 'widgets-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: provider operations expose no Cordis event stream to cross-check. */
const install: InvariantInstaller = () => {}

/** Register the package invariant reservation. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
