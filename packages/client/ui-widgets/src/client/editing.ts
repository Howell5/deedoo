import type { IApiClient, WidgetView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ISessions, IWorkspaces } from '@deepseek-ai/dsh-client-runtime/client'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import { setWidgetPreviewPreferred } from './preview-preference.ts'

/** Stable `details.application` id owned by the Widgets client plugin. */
export const WIDGET_DETAILS_APPLICATION = 'widgets'

type WidgetWorkspaces = Pick<IWorkspaces, 'list' | 'create' | 'rename' | 'connectWorkspace'>
type WidgetSessions = Pick<ISessions, 'open'>
type WidgetLayout = Pick<ILayout, 'selectApplication' | 'openApplicationDetails'>

/**
 * Keep adopted Workspace display titles aligned with current Widget names.
 * @param api - Widget API client.
 * @param workspaces - client Workspace service.
 * @param changedId - optional Widget id to synchronize instead of every Widget.
 */
export async function syncWidgetWorkspaceNames(
  api: Pick<IApiClient, 'widgets'>,
  workspaces: Pick<IWorkspaces, 'list' | 'rename'>,
  changedId?: string,
): Promise<void> {
  const { result } = await api.widgets.list({})
  if (!result.ok) throw new Error(result.error.message)
  const registered = workspaces.list.getSnapshot().items
  await Promise.all(result.value.widgets
    .filter(widget => changedId === undefined || widget.manifest.id === changedId)
    .map(async (widget) => {
      const workspace = registered.find(candidate => candidate.path === widget.sourcePath)
      if (workspace !== undefined && workspace.title !== widget.manifest.name) {
        await workspaces.rename(workspace.workspaceId, widget.manifest.name)
      }
    }))
}

/**
 * Adopt a managed Widget directory as a Workspace and open its Agent session
 * with the live preview selected.
 * @param workspaces - client Workspace service.
 * @param sessions - client Session service.
 * @param layout - root application and details controller.
 * @param widget - installed managed Widget.
 */
export async function editWidgetWithAgent(
  workspaces: WidgetWorkspaces,
  sessions: WidgetSessions,
  layout: WidgetLayout,
  widget: WidgetView,
): Promise<void> {
  const existing = workspaces.list.getSnapshot().items
    .find(workspace => workspace.path === widget.sourcePath)
  const workspace = existing ?? await workspaces.create({ path: widget.sourcePath })
  if (workspace.title !== widget.manifest.name) {
    await workspaces.rename(workspace.workspaceId, widget.manifest.name)
  }
  const sessionId = await workspaces.connectWorkspace(workspace.workspaceId)
  sessions.open(sessionId)
  layout.selectApplication('conversation')
  setWidgetPreviewPreferred(widget.sourcePath, true)
  layout.openApplicationDetails(WIDGET_DETAILS_APPLICATION, sessionId)
}
