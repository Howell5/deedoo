/** Package-owned invariant companion for the local Widgets provider. @module @deepseek-ai/dsh-widgets-local/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-widgets-local'

/** Cordis companion plugin name. */
export const name = 'widgets-local-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: change notifications may describe a transient invalid edit; reads remain authoritative. */
const install: InvariantInstaller = () => {}

/** Register the package invariant reservation. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
