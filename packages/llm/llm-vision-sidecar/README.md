# @deepseek-ai/dsh-llm-vision-sidecar

English | [中文](README.zh.md)

The vision sidecar makes image attachments usable by a text-only conversation route. It resolves one configured image-capable LLM route from `ctx.llm.resolveModelInfo`, describes each unresolved image during `agent/pre-step`, and stores the bounded description beside the original attachment in the same durable message. The raw attachment remains available to the UI and to a later native image-capable route.

## Config

```yaml
- id: llm-vision-sidecar
  name: '@deepseek-ai/dsh-llm-vision-sidecar'
  config:
    enabled: true
    provider: glm-vision
    model: glm-4v-flash
    timeoutMs: 60000
    maxOutputTokens: 1024
    maxDescriptionChars: 4000
    maxImagesPerStep: 8
```

`provider` and `model` identify the sidecar route; the owning LLM adapter supplies its capability metadata. The plugin does not maintain a model-name capability table. The configured route must resolve `inputModalities: [text, image]`, otherwise image preparation fails before the main text-only request.

`enabled` controls both admission and preparation. `timeoutMs`, `maxOutputTokens`, `maxDescriptionChars`, and `maxImagesPerStep` are validated positive bounds. The default base bundle points this plugin at `glm-vision` / `glm-4v-flash`; the `llm-pi-ai` settings section must define that route and its credential before an image request can use it.

## Runtime semantics

The listener delegates the complete `agent/pre-step` waterfall before preparing content, so other listeners can add or replace messages first. It then checks the main route's declared modalities. Native image routes pass through unchanged; routes without an explicit image capability use the configured sidecar.

Descriptions are cached within one pre-step by attachment id, bounded by `maxImagesPerStep`, and requested with `purpose: vision`. A historical image is written back with a surface replacement event that preserves the message id and source event family. A newly claimed image is returned in the final entered batch and is logged by `dsh-agent-loop` with its description already attached.

Sidecar failures are fail-closed. Missing route metadata, missing durable attachments, an empty response, timeout, or an image-count overflow prevents the main model request instead of silently dropping the image or sending it to a text-only adapter.

## Model Experience

### Text-only route

#### What the model sees

DeepSeek chat-completions and pi-ai text-only routes receive the original surrounding text plus a bounded `[Image description]` section. They do not receive the raw image bytes. The durable message still contains the image reference, so the UI and a later image-capable route can use the original attachment.

#### Token effect

The description is charged as ordinary text on every request until compaction shadows the message. The one-time vision request has its own provider cost and output cap.

#### KV Cache effect

The first request after enrichment changes the conversation prefix. Later requests can reuse the text description as part of the normal provider cache prefix.

### Native image route

#### What the model sees

An image-capable route receives the original attachment through its adapter. If a message was previously enriched for a text-only route, the native route may also receive the persisted description as supporting text.

#### Token effect

Native image tokenization remains provider-owned. Persisted descriptions do not replace or delete the original attachment.

#### KV Cache effect

The provider decides how native image parts and persisted descriptions affect its cache prefix.

## Known Limitations and Deferred Work

- **One description prompt per distinct attachment id per pre-step** — prompt-specific descriptions and cross-process description caches are not part of this plugin.
- **The sidecar is an agent-step consumer** — auxiliary consumers that call `ctx.llm.stream()` directly, such as an independently configured compactor, must select an image-capable route or add their own preparation integration.
- **The description is not a transcript row** — the image block remains the user-visible durable unit; the sidecar metadata is adapter-facing persistence on that block.
