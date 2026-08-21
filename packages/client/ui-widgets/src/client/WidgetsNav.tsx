import { useSyncExternalStore } from 'react'
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/client'
import { IconDataOutline16, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './WidgetsNav.module.css'

interface WidgetsNavInjected {
  api: IApiClient
  layout: ILayout
}

type WidgetsNavProps =
  & PropsRuntime<'sidebar.application'>
  & PropsLocale<'widgets'>
  & WidgetsNavInjected

/** Sidebar row selecting the Widgets application. */
export function WidgetsNav({ wide, layout, t }: WidgetsNavProps) {
  const active = useSyncExternalStore(
    listener => layout.subscribeApplication(listener),
    () => layout.getApplication(),
    () => layout.getApplication(),
  ) === 'widgets'
  return (
    <Tooltip label={t('nav')} disabled={wide} delayMs={500}>
      <button
        type="button"
        className={css.row}
        data-active={active || undefined}
        aria-current={active ? 'page' : undefined}
        aria-label={t('nav')}
        onClick={() => { layout.selectApplication('widgets') }}
      >
        <IconDataOutline16 size={wide ? 16 : 18} />
        {wide && <span>{t('nav')}</span>}
      </button>
    </Tooltip>
  )
}
