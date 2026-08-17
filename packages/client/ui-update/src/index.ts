/**
 * Web update plugin, node half.
 *
 * Deliberately empty. Update detection is a browser capability: the renderer
 * fetches the Deedoo GitHub releases endpoint directly (CORS-enabled) and
 * renders the settings-footer indicator. The host has no role in this flow,
 * and mounting anything here would add a server round-trip for no benefit.
 */

/** Host plugin body — the update flow is client-only. */
export function apply(): void {}
