/**
 * Widgets application browser plugin: registers the application, live details,
 * and conversation preview controls backed by the Host Widgets RPC domain.
 */

import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import {
  editWidgetWithAgent, syncWidgetWorkspaceNames, WIDGET_DETAILS_APPLICATION,
} from './editing.ts'
import { WidgetDetails } from './WidgetDetails.tsx'
import { WidgetPreviewToggle } from './WidgetPreviewToggle.tsx'
import type { WidgetChangeSubscriber } from './WidgetFrame.tsx'
import { WidgetsNav } from './WidgetsNav.tsx'
import { WidgetsWorkspace } from './WidgetsWorkspace.tsx'
import { en, zh, type WidgetsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    widgets: WidgetsKey
  }
}

const NS = 'widgets'

/** Required client services for navigation, Host calls, slots, and copy. */
export const inject = ['connection', 'layout', 'slots', 'locale', 'remote', 'sessions', 'workspaces']

/** Register the Widgets application and sidebar entry. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-widgets: dictionaries')
  const api = (ctx.get('connection') as ConnectionHandle).api
  const subscribeChanges: WidgetChangeSubscriber = listener =>
    ctx.remote.$on('widgets/changed', listener)
  const syncWorkspaceNames = (id?: string): void => {
    void syncWidgetWorkspaceNames(api, ctx.workspaces, id).catch((error: unknown) => {
      ctx.logger.warn('ui-widgets: failed to synchronize Widget Workspace names')
      ctx.logger.warn(error)
    })
  }
  ctx.effect(() => {
    const dispose = ctx.remote.$on('widgets/changed', syncWorkspaceNames)
    syncWorkspaceNames()
    return dispose
  }, 'ui-widgets: Widget Workspace name synchronization')
  const injected = () => ({
    api,
    layout: ctx.layout,
    subscribeChanges,
    editWidget: async (widget: Parameters<typeof editWidgetWithAgent>[3]) => {
      await editWidgetWithAgent(ctx.workspaces, ctx.sessions, ctx.layout, widget)
    },
  })
  ctx.slots.inject('sidebar.application', () =>
    ctx.slots.inject('application', () =>
      ctx.slots.inject('details.application', () =>
        ctx.slots.inject('conversation.hero.utilities', () =>
          ctx.slots.inject('conversation.session.header.utilities', function* () {
            yield ctx.slots.register({
              name: 'sidebar.application',
              id: 'widgets',
              order: 0,
              locale: NS,
              inject: injected,
            }, WidgetsNav)
            yield ctx.slots.register({
              name: 'application',
              id: 'widgets',
              order: 0,
              locale: NS,
              inject: injected,
            }, WidgetsWorkspace)
            yield ctx.slots.register({
              name: 'details.application',
              id: WIDGET_DETAILS_APPLICATION,
              order: 0,
              locale: NS,
              inject: injected,
            }, WidgetDetails)
            yield ctx.slots.register({
              name: 'conversation.hero.utilities',
              id: 'widget-preview',
              order: 0,
              locale: NS,
              inject: injected,
            }, WidgetPreviewToggle)
            yield ctx.slots.register({
              name: 'conversation.session.header.utilities',
              id: 'widget-preview',
              order: 0,
              locale: NS,
              inject: injected,
            }, WidgetPreviewToggle)
          })))))
}
