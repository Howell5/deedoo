/** Widgets domain API: installed static projects and their bounded runtime bridge. */

import type { RpcRequest, RpcResponse } from './rpc.ts'

/** Client-safe Widget manifest view. */
export interface WidgetManifestView {
  schemaVersion: 1
  id: string
  name: string
  version: string
  runtime: 'static'
  entry: string
  aspectRatios: Array<'1:1' | '16:9' | '9:16'>
  defaultAspectRatio: '1:1' | '16:9' | '9:16'
  permissions: { network: string[] }
  refresh: {
    mode: 'manual' | 'on-open' | 'visible-interval'
    minimumIntervalSeconds: number
  }
}

/** Installed Widget metadata presented to the desktop client. */
export interface WidgetView {
  manifest: WidgetManifestView
  sourcePath: string
  builtIn: boolean
}

/** Host methods used by the Widgets workspace and sandbox bridge. */
export interface WidgetsApi {
  /** List installed valid Widgets. */
  list(request: RpcRequest<{}>): Promise<RpcResponse<{ widgets: WidgetView[] }>>
  /** Create one managed starter project for Agent authoring. */
  create(request: RpcRequest<{}>): Promise<RpcResponse<{ widget: WidgetView }>>
  /** Read the validated entry HTML for one installed Widget. */
  read(request: RpcRequest<{ id: string }>): Promise<RpcResponse<{ widget: WidgetView; html: string }>>
  /** Validate and copy an absolute local Widget project. */
  install(request: RpcRequest<{ path: string }>): Promise<RpcResponse<{ widget: WidgetView }>>
  /** Remove one non-built-in managed Widget. */
  remove(request: RpcRequest<{ id: string }>): Promise<RpcResponse<{ removed: true }>>
  /** Perform one permission-checked external GET for the calling Widget. */
  fetch(
    request: RpcRequest<{ id: string; url: string }>,
    signal: AbortSignal,
  ): Promise<RpcResponse<{ status: number; contentType: string; body: string }>>
}
