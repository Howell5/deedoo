import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import { IconPanelLeftOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { WIDGET_DETAILS_APPLICATION } from './editing.ts'
import { isWidgetPreviewPreferred, setWidgetPreviewPreferred } from './preview-preference.ts'
import css from './WidgetPreviewToggle.module.css'

interface WidgetPreviewToggleInjected {
  api: IApiClient
  layout: ILayout
}

type WidgetPreviewRuntimeProps =
  | PropsRuntime<'conversation.hero.utilities'>
  | PropsRuntime<'conversation.session.header.utilities'>

type WidgetPreviewToggleProps =
  & WidgetPreviewRuntimeProps
  & PropsLocale<'widgets'>
  & WidgetPreviewToggleInjected

/**
 * Render the preview toggle for a Session whose cwd exactly matches an
 * installed managed Widget project.
 * @param props - standard Session kit, Widget API, layout controller, and copy.
 * @returns the preview button after a managed-path match, otherwise null.
 */
export function WidgetPreviewToggle({
  api,
  layout,
  sessionId,
  useSessions,
  t,
}: WidgetPreviewToggleProps) {
  const sourcePath = useSessions(state => state.byId[sessionId]?.cwd)
  const [matchedSourcePath, setMatchedSourcePath] = useState<string>()
  const subscribeApplication = useCallback(
    (listener: () => void) => layout.subscribeApplication(listener),
    [layout],
  )
  const getApplication = useCallback(() => layout.getApplication(), [layout])
  const subscribeDetailsApplication = useCallback(
    (listener: () => void) => layout.subscribeDetailsApplication(listener),
    [layout],
  )
  const getDetailsApplication = useCallback(() => layout.getDetailsApplication(), [layout])
  const application = useSyncExternalStore(
    subscribeApplication,
    getApplication,
    getApplication,
  )
  const detailsApplication = useSyncExternalStore(
    subscribeDetailsApplication,
    getDetailsApplication,
    getDetailsApplication,
  )

  useEffect(() => {
    if (sourcePath === undefined) return
    const abort = new AbortController()
    setMatchedSourcePath(undefined)
    api.widgets.list({}, abort.signal).then(({ result }) => {
      if (!result.ok) return
      const match = result.value.widgets.some(widget => widget.sourcePath === sourcePath)
      if (!abort.signal.aborted) setMatchedSourcePath(match ? sourcePath : undefined)
    }).catch(() => {
      // A failed catalog read removes only this optional utility; the Widgets
      // application owns its full retryable error presentation.
    })
    return () => { abort.abort() }
  }, [api, sourcePath])

  useEffect(() => {
    if (
      application === 'conversation'
      && sourcePath !== undefined
      && matchedSourcePath === sourcePath
      && isWidgetPreviewPreferred(sourcePath)
    ) {
      layout.openApplicationDetails(WIDGET_DETAILS_APPLICATION, sessionId)
    }
  }, [application, layout, matchedSourcePath, sessionId, sourcePath])

  if (sourcePath === undefined || matchedSourcePath !== sourcePath) return null
  const active = detailsApplication?.id === WIDGET_DETAILS_APPLICATION
    && detailsApplication.scopeKey === sessionId
  const label = t(active ? 'hidePreview' : 'showPreview')

  return (
    <button
      type="button"
      className={`${css.button}${active ? ` ${css.buttonActive}` : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={() => {
        setWidgetPreviewPreferred(sourcePath, !active)
        if (active) layout.closeDetails()
        else layout.openApplicationDetails(WIDGET_DETAILS_APPLICATION, sessionId)
      }}
    >
      <IconPanelLeftOutline16 className={css.icon} />
    </button>
  )
}
/** Widget Workspace preview utility shared by blank and active conversations. */
