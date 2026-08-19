# Agent Note: Text-route vision sidecar

Status: implemented

English | [中文](2026-08-19-text-route-vision-sidecar.zh.md)

## Problem

The DeepSeek chat-completions route declares text-only input, while image attachments are durable model-visible content. A configured GLM vision route existed independently, but no product-owned preparation step transferred its description to the selected text route, so DeepSeek rejected the request after the image had entered the session.

## Decision

`@deepseek-ai/dsh-llm-vision-sidecar` is mounted in the base bundle with `glm-vision` / `glm-4v-flash` as its configured target. It reads the main route's `LlmModelInfo.inputModalities` and the target route's same adapter-owned metadata; it does not maintain a model-name capability table.

The plugin consumes `agent/pre-step`. Native image routes pass unchanged. A route without declared image input is prepared through the configured target, and each image block receives a bounded `{ provider, model, text }` description while retaining its durable attachment reference. Historical messages use a surface replacement that preserves message identity and event family; newly claimed messages return from the waterfall and are logged by the agent loop with the description already attached.

DeepSeek and pi-ai text-only serialization consume the persisted description and reject only unresolved images. Host prompt admission, model selection, and `read_image` accept either native image capability or an available sidecar. Sidecar route failure, missing attachments, empty output, timeout, and image-count overflow fail before the main request.

## Alternatives considered

**Route every image conversation to GLM.** This would provide native image input, but it would remove the user's selected DeepSeek text route and its model-specific cost, context, and reasoning behavior.

**Rewrite frozen `llm/stream` requests.** Agent-loop requests are derived from durable session events and are frozen before dispatch. Rewriting only the request would make the model-visible description absent from the session log and would fail request reconstruction.

**Maintain a sidecar-owned model-name capability table.** Model catalogs and explicit `input` declarations already belong to LLM adapters. A second table would drift from provider configuration and would not cover user-defined gateway routes.

## Consequences

The original attachment remains available for UI rendering and later native image routes, while text-only routes pay for the persisted description as ordinary prompt text. A first request on a historical image-bearing session performs sidecar preparation before the main model call; subsequent requests reuse the durable description. Direct auxiliary callers of `ctx.llm.stream()` that bypass `agent/pre-step` still need an image-capable route or their own preparation integration.
