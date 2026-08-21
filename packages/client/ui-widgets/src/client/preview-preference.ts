/** Browser persistence for Widget Workspace preview visibility. */

const PREVIEW_PREFERENCE_KEY = 'dsh.widgets.preview-open.v1'

function preferredSourcePaths(): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PREVIEW_PREFERENCE_KEY) ?? '[]')
    if (!Array.isArray(value)) return new Set()
    return new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry !== ''))
  } catch {
    return new Set()
  }
}

/**
 * Whether a managed Widget Workspace prefers its live preview open.
 * @param sourcePath - exact managed Widget source directory.
 * @returns true when the user left this Workspace's preview open.
 */
export function isWidgetPreviewPreferred(sourcePath: string): boolean {
  return preferredSourcePaths().has(sourcePath)
}

/**
 * Persist one managed Widget Workspace's preview preference.
 * @param sourcePath - exact managed Widget source directory.
 * @param open - whether later visits should restore the preview.
 */
export function setWidgetPreviewPreferred(sourcePath: string, open: boolean): void {
  if (sourcePath === '') return
  const paths = preferredSourcePaths()
  if (open) paths.add(sourcePath)
  else paths.delete(sourcePath)
  try {
    if (paths.size === 0) localStorage.removeItem(PREVIEW_PREFERENCE_KEY)
    else localStorage.setItem(PREVIEW_PREFERENCE_KEY, JSON.stringify([...paths]))
  } catch {
    // Browser storage can be unavailable under privacy policies; the current
    // preview action still succeeds and only cross-visit restoration is lost.
  }
}
