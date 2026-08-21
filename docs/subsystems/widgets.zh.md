# 本地 Widgets

[English](widgets.md) | 中文

Widgets 子系统为桌面客户端安装本地静态微型应用。[`ctx.widgets`](#ctxwidgets--widgets-abstract-seam) 将 manifest（元数据清单）与生命周期操作同本地文件系统提供方、宿主 RPC 和浏览器呈现分离。已安装项目是产品全局数据，不进入 Session 日志或模型上下文。

来源：[`packages/widget/widgets/src/index.ts`](../../packages/widget/widgets/src/index.ts)

## Manifest 与已安装视图

`WidgetId` 是使用小写短横线分段的、不透明 manifest id。第一版 `WidgetManifest` 指定一个静态 HTML 入口、支持的固定画布比例（`1:1`、`16:9` 或 `9:16`）、默认比例、精确网络主机名和刷新元数据。解析器拒绝未知字段、不支持的运行时、格式错误的 id 和不一致的比例声明。浏览器消费方把 iframe 固定为选中的声明比例，禁止文档滚动，并把内容固有溢出报告为无效 Widget 布局。

`WidgetView` 把经过校验的 manifest 与受管理源路径和内置状态组合在一起。`WidgetDocument` 增加用于隔离渲染的受限自包含 HTML。`WidgetFetchResult` 只包含状态、内容类型和受限文本；提供方把传输凭证与网络权限保留在 frame 之外。

## 提供方义务

提供方每次读取时都校验持久路径和文档，只在受管理副本成功后发布安装，并且绝不通过 `remove()` 删除外部源目录。其 `fetch()` 实现执行调用方 manifest 的网络策略、取消和完整响应限制。

本地提供方把项目存储在 `$DSH_HOME/widgets/projects`，写入 Calculator 和 Gold / USD 示例，并且只接受面向已声明公网主机的无凭证 HTTPS GET 请求。[包 README](../../packages/widget/widgets-local/README.md)拥有精确限制和第一版约束。

桌面端的**用 Agent 编辑**操作会把受管理项目路径注册为普通 Workspace，并在 Conversation 中打开其可复用空白会话。通用 `details.application` slot 在右栏承载实时 Widget 预览。精确受管理路径匹配会同时向空白 Hero 和活跃会话页头贡献预览开关，工作区级浏览器偏好会在普通 Session 导航后恢复该栏。本地提供方监听受管理项目，并通过 Remote 白名单转发 `widgets/changed(id)`；文件写入后，匹配的 iframe 会重新读取经过校验的文档。仅打开编辑界面绝不会发送模型请求。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxwidgets--widgets-abstract-seam"></a>

### `ctx.widgets` — `Widgets` (abstract seam)

Registry and runtime operations for installed Widgets.

```ts cordis-catalog
/**
 * List every valid installed Widget in deterministic name order.
 * @returns validated installed Widget metadata.
 */
abstract list(): Promise<WidgetView[]>

/**
 * Create one valid managed starter project for Agent authoring.
 * @returns the newly created Widget metadata.
 */
abstract create(): Promise<WidgetView>

/**
 * Read one Widget's validated entry document.
 * @param id - installed Widget identifier.
 * @returns metadata and self-contained HTML.
 */
abstract read(id: WidgetId): Promise<WidgetDocument>

/**
 * Validate and copy one local static project into managed storage.
 * @param sourcePath - absolute source project directory.
 * @returns the installed Widget metadata.
 */
abstract install(sourcePath: string): Promise<WidgetView>

/**
 * Remove one managed Widget without deleting any external source directory.
 * @param id - installed Widget identifier.
 */
abstract remove(id: WidgetId): Promise<void>

/**
 * Perform one permission-checked external GET for a Widget.
 * @param id - calling Widget identifier.
 * @param url - absolute HTTPS URL.
 * @param signal - caller lifetime.
 * @returns bounded textual response.
 */
abstract fetch(id: WidgetId, url: string, signal: AbortSignal): Promise<WidgetFetchResult>
```

Source: [`packages/widget/widgets/src/index.ts:143`](../../packages/widget/widgets/src/index.ts)

<a id="widgets-events"></a>

### `widgets/*` events

<a id="widgetschanged--emit"></a>

#### `widgets/changed` — emit

A managed Widget project changed on disk.

```ts cordis-catalog
/**
 * A managed Widget project changed on disk.
 * @mode emit
 * @param id - direct managed project directory id.
 */
'widgets/changed'(id: WidgetId): void
```

Source: [`packages/widget/widgets/src/types.ts:19`](../../packages/widget/widgets/src/types.ts)
<!-- END GENERATED cordis-surface -->
