// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  SessionId, WidgetView, WorkspaceId, WorkspaceView,
} from '@deepseek-ai/dsh-api-remotes/client'
import { editWidgetWithAgent, syncWidgetWorkspaceNames } from '../src/client/editing.ts'

const widget = {
  sourcePath: '/managed/widgets/gold-price',
  manifest: { id: 'gold-price', name: 'Gold / USD' },
} as WidgetView

const sessionId = 'session-1' as SessionId

function workspace(path = widget.sourcePath, title = 'Gold / USD'): WorkspaceView {
  return {
    workspaceId: 'workspace-1' as WorkspaceId,
    path,
    title,
    sessionIds: [],
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  }
}

describe('editWidgetWithAgent', () => {
  beforeEach(() => { localStorage.clear() })

  it('reuses an exact managed-path Workspace and opens its preview session', async () => {
    const existing = workspace()
    const create = vi.fn()
    const rename = vi.fn()
    const connectWorkspace = vi.fn(async () => sessionId)
    const open = vi.fn()
    const selectApplication = vi.fn()
    const openApplicationDetails = vi.fn()

    await editWidgetWithAgent({
      list: { getSnapshot: () => ({ items: [existing] }), subscribe: () => () => {} } as never,
      create,
      rename,
      connectWorkspace,
    }, { open }, { selectApplication, openApplicationDetails }, widget)

    expect(create).not.toHaveBeenCalled()
    expect(rename).not.toHaveBeenCalled()
    expect(connectWorkspace).toHaveBeenCalledWith('workspace-1')
    expect(open).toHaveBeenCalledWith('session-1')
    expect(selectApplication).toHaveBeenCalledWith('conversation')
    expect(openApplicationDetails).toHaveBeenCalledWith('widgets', 'session-1')
    expect(localStorage.getItem('dsh.widgets.preview-open.v1')).toContain(widget.sourcePath)
  })

  it('adopts the managed path when no Workspace exists', async () => {
    const created = workspace(widget.sourcePath, 'gold-price')
    const create = vi.fn(async () => created)
    const rename = vi.fn()
    const connectWorkspace = vi.fn(async () => sessionId)

    await editWidgetWithAgent({
      list: { getSnapshot: () => ({ items: [workspace('/somewhere-else')] }), subscribe: () => () => {} } as never,
      create,
      rename,
      connectWorkspace,
    }, { open: vi.fn() }, {
      selectApplication: vi.fn(),
      openApplicationDetails: vi.fn(),
    }, widget)

    expect(create).toHaveBeenCalledWith({ path: widget.sourcePath })
    expect(rename).toHaveBeenCalledWith('workspace-1', 'Gold / USD')
    expect(connectWorkspace).toHaveBeenCalledWith('workspace-1')
  })

  it('synchronizes an adopted Workspace after the Agent names its Widget', async () => {
    const rename = vi.fn()
    const list = vi.fn(async () => ({ result: { ok: true, value: { widgets: [widget] } } }))

    await syncWidgetWorkspaceNames(
      { widgets: { list } } as never,
      {
        list: {
          getSnapshot: () => ({ items: [workspace(widget.sourcePath, 'New Widget')] }),
          subscribe: () => () => {},
        } as never,
        rename,
      },
      widget.manifest.id,
    )

    expect(rename).toHaveBeenCalledWith('workspace-1', 'Gold / USD')
  })
})
