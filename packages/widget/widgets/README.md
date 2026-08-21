# @deepseek-ai/dsh-widgets

English | [中文](README.zh.md)

Service Definition for locally installed Widgets. It owns the version 1 manifest parser, branded Widget identifiers, provider error codes, and the `ctx.widgets` operations used by Host and UI Consumers.

The strict manifest accepts a static entry document, one or more fixed `1:1`/`16:9`/`9:16` canvas proportions, an exact HTTPS hostname allowlist, and a refresh declaration. Unknown fields, malformed ids, unsupported runtimes, and a `defaultAspectRatio` absent from `aspectRatios` fail parsing. The entry must lay out all content inside every declared canvas without document scrolling. Providers expose validated metadata through `list()`, create a managed starter through `create()`, return self-contained HTML through `read()`, copy a local project through `install()`, remove managed projects through `remove()`, and perform bounded permission-checked GET requests through `fetch()`.

Provider failures use `WidgetError` with `invalid-project`, `not-found`, `already-installed`, `permission-denied`, or `network-failed`. Consumers may present the message to the user but use the code for stable branching.

Providers emit `widgets/changed(id)` after a managed project's files change. The event is an invalidation signal rather than a validated document snapshot: Consumers re-read through `read()` and present any transient invalid state while an edit is incomplete.

## Model Experience

None, as this package defines a human-facing local application service and registers no prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the service does not assemble or send provider requests.

## Known Limitations and Deferred Work

- **Version 1 is static-only** — the service has no build, background worker, credential, persistent frame-storage, or arbitrary backend operation.
- **Installation and instance placement are the same unit** — the API has no separate artifact version or multi-instance identity, and duplicate manifest ids are rejected.
