import { useCallback, useEffect, useMemo, useState } from 'react'
import type { IApiClient, WidgetView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import { IconFolderOpenOutline16, IconPlusOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { WidgetFrame, type WidgetChangeSubscriber } from './WidgetFrame.tsx'
import type { WidgetsKey } from './locales.ts'
import css from './WidgetsWorkspace.module.css'

interface WidgetsInjected {
  api: IApiClient
  layout: ILayout
  subscribeChanges: WidgetChangeSubscriber
  editWidget: (widget: WidgetView) => Promise<void>
}

type WidgetsWorkspaceProps =
  & PropsRuntime<'application'>
  & PropsLocale<'widgets'>
  & WidgetsInjected

type WidgetAspectRatio = '1:1' | '16:9' | '9:16'
const ASPECT_RATIO_KEY = 'dsh.widgets.aspect-ratios.v1'

function loadAspectRatios(): Record<string, WidgetAspectRatio> {
  try {
    const raw = localStorage.getItem(ASPECT_RATIO_KEY)
    return raw === null ? {} : JSON.parse(raw) as Record<string, WidgetAspectRatio>
  } catch {
    return {}
  }
}

/** Root Widgets grid application. */
export function WidgetsWorkspace({
  active,
  api,
  subscribeChanges,
  editWidget,
  t,
}: WidgetsWorkspaceProps) {
  const [widgets, setWidgets] = useState<WidgetView[]>([])
  const [aspectRatios, setAspectRatios] = useState(loadAspectRatios)
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const { result } = await api.widgets.list({})
      if (!result.ok) throw new Error(result.error.message)
      setWidgets(result.value.widgets)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void reload() }, [reload])

  const importProject = useCallback(async () => {
    setError(undefined)
    const picked = await api.host.pickDirectory({})
    if (!picked.result.ok) {
      setError(picked.result.error.message)
      return
    }
    if (picked.result.value.path === null) return
    const installed = await api.widgets.install({ path: picked.result.value.path })
    if (!installed.result.ok) {
      setError(installed.result.error.message)
      return
    }
    await reload()
  }, [api, reload])

  const createWidget = useCallback(async () => {
    setCreating(true)
    setError(undefined)
    try {
      const created = await api.widgets.create({})
      if (!created.result.ok) throw new Error(created.result.error.message)
      await reload()
      await editWidget(created.result.value.widget)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setCreating(false)
    }
  }, [api, editWidget, reload])

  const cycleAspectRatio = useCallback((widget: WidgetView) => {
    setAspectRatios((current) => {
      const options = widget.manifest.aspectRatios
      const selected = current[widget.manifest.id] ?? widget.manifest.defaultAspectRatio
      const next = options[(options.indexOf(selected) + 1) % options.length] ?? widget.manifest.defaultAspectRatio
      const value = { ...current, [widget.manifest.id]: next }
      localStorage.setItem(ASPECT_RATIO_KEY, JSON.stringify(value))
      return value
    })
  }, [])

  const edit = useCallback(async (widget: WidgetView) => {
    setError(undefined)
    try {
      await editWidget(widget)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [editWidget])

  const cards = useMemo(() => widgets.map(widget => ({
    widget,
    aspectRatio: aspectRatios[widget.manifest.id] ?? widget.manifest.defaultAspectRatio,
  })), [aspectRatios, widgets])

  if (active !== 'widgets') return null
  return (
    <main className={css.root}>
      <header className={css.pageHeader}>
        <div className={css.pageTitle}>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <div className={css.headerActions}>
          <button type="button" className={css.importButton} onClick={() => { void importProject() }}>
            <IconFolderOpenOutline16 />
            {t('import')}
          </button>
          <button
            type="button"
            className={css.createButton}
            disabled={creating}
            onClick={() => { void createWidget() }}
          >
            <IconPlusOutline16 />
            {creating ? t('creating') : t('create')}
          </button>
        </div>
      </header>

      {error !== undefined && <div className={css.pageError}>{error}</div>}
      {loading && widgets.length === 0 && <div className={css.empty}>{t('loading')}</div>}
      {!loading && widgets.length === 0 && (
        <div className={css.empty}>
          <IconFolderOpenOutline16 size={28} />
          <strong>{t('empty')}</strong>
          <span>{t('emptyDetail')}</span>
        </div>
      )}
      <section className={css.grid} aria-label={t('title')}>
        {cards.map(({ widget, aspectRatio }) => (
          <WidgetFrame
            key={widget.manifest.id}
            api={api}
            widget={widget}
            aspectRatio={aspectRatio}
            t={t as (key: WidgetsKey) => string}
            subscribeChanges={subscribeChanges}
            onCycleAspectRatio={() => { cycleAspectRatio(widget) }}
            onEdit={() => { void edit(widget) }}
          />
        ))}
      </section>
    </main>
  )
}
