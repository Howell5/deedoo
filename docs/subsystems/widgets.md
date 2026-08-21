# Local Widgets

English | [中文](widgets.zh.md)

The Widgets subsystem installs local static mini-applications for the desktop client. [`ctx.widgets`](#ctxwidgets--widgets-abstract-seam) separates manifest and lifecycle operations from the local filesystem provider, Host RPC, and browser presentation. Installed projects are product-global data and do not enter the Session log or model context.

Source: [`packages/widget/widgets/src/index.ts`](../../packages/widget/widgets/src/index.ts)

## Manifest and installed views

`WidgetId` is an opaque manifest id using lowercase dash-separated segments. A version 1 `WidgetManifest` names one static HTML entry, supported fixed canvas proportions (`1:1`, `16:9`, or `9:16`), a default proportion, exact network hostnames, and refresh metadata. The parser rejects unknown fields, unsupported runtimes, malformed ids, and inconsistent aspect-ratio declarations. The browser Consumer fixes the iframe to the selected declared proportion, disables document scrolling, and reports intrinsic content overflow as an invalid Widget layout.

`WidgetView` combines a validated manifest with its managed source path and built-in status. `WidgetDocument` adds the bounded self-contained HTML returned for isolated rendering. `WidgetFetchResult` contains only status, content type, and bounded text; providers keep transport credentials and network authority outside the frame.

## Provider obligations

A provider validates durable paths and documents on every read, publishes installation only after its managed copy succeeds, and never deletes an external source directory through `remove()`. Its `fetch()` implementation enforces the calling manifest's network policy, cancellation, and complete response limits.

The local provider stores projects under `$DSH_HOME/widgets/projects`, seeds Calculator and Gold / USD examples, and accepts only credential-free HTTPS GET requests to declared public hosts. The [package README](../../packages/widget/widgets-local/README.md) owns exact limits and first-release restrictions.

The desktop **Edit with Agent** action registers the managed project path as an ordinary Workspace and opens its reusable blank Session in Conversation. A generic `details.application` slot carries the live Widget preview in the right column. Exact managed-path matching contributes a preview toggle to both the blank Hero and active Session header, and a Workspace-level browser preference restores the column after ordinary Session navigation. The local provider watches managed projects and forwards `widgets/changed(id)` through the Remote allowlist, so the matching iframe re-reads its validated document after file writes. Opening the editor itself never sends a model request.

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
