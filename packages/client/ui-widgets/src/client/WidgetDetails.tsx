import { useEffect, useState } from 'react'
import type { IApiClient, WidgetView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { WIDGET_DETAILS_APPLICATION } from './editing.ts'
import { setWidgetPreviewPreferred } from './preview-preference.ts'
import { WidgetFrame, type WidgetChangeSubscriber } from './WidgetFrame.tsx'
import css from './WidgetsWorkspace.module.css'

interface WidgetDetailsInjected {
  api: IApiClient
  layout: ILayout
  subscribeChanges: WidgetChangeSubscriber
}

type WidgetDetailsProps =
  & PropsRuntime<'details.application'>
  & PropsLocale<'widgets'>
  & WidgetDetailsInjected

/** Live fixed-canvas preview for the Widget Workspace of the current session. */
export function WidgetDetails({
  active,
  api,
  layout,
  sessionId,
  useSessions,
  subscribeChanges,
  t,
}: WidgetDetailsProps) {
  const sourcePath = useSessions(state => state.byId[sessionId]?.cwd)
  const [widget, setWidget] = useState<WidgetView>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (active !== WIDGET_DETAILS_APPLICATION || sourcePath === undefined) return
    const abort = new AbortController()
    setWidget(undefined)
    setError(undefined)
    api.widgets.list({}, abort.signal).then(({ result }) => {
      if (!result.ok) throw new Error(result.error.message)
      const match = result.value.widgets.find(candidate => candidate.sourcePath === sourcePath)
      if (match === undefined) throw new Error(t('previewNotFound'))
      setWidget(match)
    }).catch((cause: unknown) => {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => { abort.abort() }
  }, [active, api, sourcePath, t])

  if (active !== WIDGET_DETAILS_APPLICATION) return null
  if (error !== undefined) return <div className={css.detailsStatus}>{error}</div>
  if (widget === undefined) return <div className={css.detailsStatus}>{t('loading')}</div>
  return (
    <WidgetFrame
      api={api}
      widget={widget}
      aspectRatio={widget.manifest.defaultAspectRatio}
      subscribeChanges={subscribeChanges}
      t={t}
      variant="details"
      onClose={() => {
        if (sourcePath !== undefined) setWidgetPreviewPreferred(sourcePath, false)
        layout.closeDetails()
      }}
    />
  )
}
