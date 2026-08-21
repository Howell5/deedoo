import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IApiClient, WidgetView } from '@deepseek-ai/dsh-api-remotes/client'
import {
  IconCloseOutline16, IconEllipsisOutline16,
  IconFolderOpenOutline16, IconRefreshOutline16, Menu,
  IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { WidgetsKey } from './locales.ts'
import { instrumentWidgetHtml } from './frame-document.ts'
import css from './WidgetsWorkspace.module.css'

/** Subscribe to managed Widget project changes by id. */
export type WidgetChangeSubscriber = (listener: (id: string) => void) => () => void

interface WidgetFrameProps {
  api: IApiClient
  widget: WidgetView
  aspectRatio: '1:1' | '16:9' | '9:16'
  t: (key: WidgetsKey) => string
  subscribeChanges: WidgetChangeSubscriber
  onCycleAspectRatio?: () => void
  onEdit?: () => void
  onClose?: () => void
  variant?: 'card' | 'details'
}

interface BridgeRequest {
  dshWidget: 1
  kind: 'request'
  requestId: string
  method: 'fetch'
  url: string
}

interface BridgeLayout {
  dshWidget: 1
  kind: 'layout'
  overflow: boolean
  width: number
  height: number
  viewportWidth: number
  viewportHeight: number
}

/** One isolated fixed-canvas Widget and its Host bridge. */
export function WidgetFrame({
  api,
  widget,
  aspectRatio,
  t,
  subscribeChanges,
  onCycleAspectRatio,
  onEdit,
  onClose,
  variant = 'card',
}: WidgetFrameProps) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState<string>()
  const [error, setError] = useState<string>()
  const [layoutError, setLayoutError] = useState<string>()
  const [revision, setRevision] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const id = widget.manifest.id

  useEffect(() => subscribeChanges((changedId) => {
    if (changedId === id) setRevision(value => value + 1)
  }), [id, subscribeChanges])

  useEffect(() => {
    const abort = new AbortController()
    setHtml(undefined)
    setError(undefined)
    setLayoutError(undefined)
    api.widgets.read({ id }, abort.signal).then(({ result }) => {
      if (!result.ok) throw new Error(result.error.message)
      setHtml(instrumentWidgetHtml(result.value.html))
    }).catch((cause: unknown) => {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => { abort.abort() }
  }, [api, id, revision])

  const onMessage = useCallback((event: MessageEvent<unknown>) => {
    if (event.source !== iframe.current?.contentWindow) return
    const message = event.data as Partial<BridgeRequest> | Partial<BridgeLayout> | null
    if (
      message?.dshWidget === 1
      && message.kind === 'layout'
      && typeof message.overflow === 'boolean'
    ) {
      setLayoutError(message.overflow
        ? `${t('overflowDetail')} (${aspectRatio})`
        : undefined)
      return
    }
    if (
      message?.dshWidget !== 1
      || message.kind !== 'request'
      || message.method !== 'fetch'
      || typeof message.requestId !== 'string'
      || typeof message.url !== 'string'
    ) return
    const reply = (payload: object) => {
      iframe.current?.contentWindow?.postMessage({
        dshWidget: 1,
        kind: 'response',
        requestId: message.requestId,
        ...payload,
      }, '*')
    }
    api.widgets.fetch({ id, url: message.url }).then(({ result }) => {
      if (result.ok) reply({ ok: true, value: result.value })
      else reply({ ok: false, error: result.error.message })
    }).catch((cause: unknown) => {
      reply({ ok: false, error: cause instanceof Error ? cause.message : String(cause) })
    })
  }, [api, aspectRatio, id, t])

  useEffect(() => {
    window.addEventListener('message', onMessage)
    return () => { window.removeEventListener('message', onMessage) }
  }, [onMessage])

  const badge = useMemo(
    () => widget.manifest.permissions.network.length === 0
      ? t('offline')
      : `${t('network')}: ${widget.manifest.permissions.network.join(', ')}`,
    [t, widget.manifest.permissions.network],
  )

  const openSource = (): void => {
    void api.host.openPath({ path: widget.sourcePath })
    setMenuOpen(false)
  }

  return (
    <article
      className={`${css.card}${variant === 'details' ? ` ${css.detailsCard}` : ''}`}
      data-aspect-ratio={aspectRatio}
    >
      <header className={css.cardHeader}>
        <div className={css.cardIdentity}>
          <h2>{widget.manifest.name}</h2>
          <span className={css.badge}>{badge}</span>
        </div>
        <div className={css.actions}>
          {widget.manifest.aspectRatios.length > 1 && onCycleAspectRatio !== undefined
            ? <button type="button" title={t('aspectRatio')} onClick={onCycleAspectRatio}>{aspectRatio}</button>
            : <span className={css.aspectRatio}>{aspectRatio}</span>}
          {variant === 'card' && onEdit !== undefined && (
            <button type="button" className={css.editButton} title={t('edit')} onClick={onEdit}>
              <IconSparkle16 />
              <span>{t('edit')}</span>
            </button>
          )}
          <button type="button" title={t('refresh')} onClick={() => { setRevision(value => value + 1) }}>
            <IconRefreshOutline16 />
          </button>
          <Menu
            open={menuOpen}
            onClose={() => { setMenuOpen(false) }}
            items={[{ id: 'open-source', label: t('openSource'), icon: <IconFolderOpenOutline16 /> }]}
            onSelect={(action) => {
              if (action === 'open-source') openSource()
            }}
            align="end"
            portal
            compact
            anchor={(
              <button
                type="button"
                title={t('more')}
                aria-label={t('more')}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => { setMenuOpen(value => !value) }}
              >
                <IconEllipsisOutline16 />
              </button>
            )}
          />
          {variant === 'details' && onClose !== undefined && (
            <button type="button" title={t('closePreview')} aria-label={t('closePreview')} onClick={onClose}>
              <IconCloseOutline16 />
            </button>
          )}
        </div>
      </header>
      <div className={css.frame}>
        {html !== undefined && (
          <iframe
            ref={iframe}
            key={revision}
            title={widget.manifest.name}
            sandbox="allow-scripts"
            srcDoc={html}
          />
        )}
        {html === undefined && error === undefined && <div className={css.status}>{t('loading')}</div>}
        {error !== undefined && <div className={css.error}><strong>{t('failed')}</strong><span>{error}</span></div>}
        {layoutError !== undefined && <div className={css.error}><strong>{t('overflow')}</strong><span>{layoutError}</span></div>}
      </div>
    </article>
  )
}
