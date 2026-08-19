/** Package-owned invariant companion for the vision sidecar. @module @deepseek-ai/dsh-llm-vision-sidecar/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-llm-vision-sidecar'

/** Cordis companion plugin name. */
export const name = 'llm-vision-sidecar-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * The sidecar stores its descriptions in ordinary image blocks, so session
 * projection and replay enforce the durable relationship without a separate
 * event family.
 */
const install: InvariantInstaller = () => {
  // No runtime invariant: descriptions remain ordinary image-block data and
  // session projection already validates their durable ownership.
}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
