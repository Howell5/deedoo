# Agent Note: Text-route vision sidecar

Status: implemented

[English](2026-08-19-text-route-vision-sidecar.md) | 中文

## Problem

DeepSeek chat-completions 路由声明只接受文本，而图片附件是持久且面向模型的内容。项目虽然已有独立配置的 GLM 视觉路由，却没有产品侧的准备步骤把其描述交给当前纯文本路由，因此图片进入会话后，请求仍然被 DeepSeek 拒绝。

## Decision

base bundle 挂载 `@deepseek-ai/dsh-llm-vision-sidecar`，并将 `glm-vision` / `glm-4v-flash` 作为配置目标。插件读取主路由和目标路由由 LLM 适配器拥有的 `LlmModelInfo.inputModalities`，不维护按模型名称匹配的能力表。

插件消费 `agent/pre-step`。原生图片路由原样通过。没有声明图片输入的路由会使用配置的目标路由准备，每个图片块都会获得有界的 `{ provider, model, text }` 描述，同时保留持久附件引用。历史消息使用保留消息标识和事件类型的表层替换；新领取的消息从 waterfall 返回，并由 agent loop 在描述已附加后记录。

DeepSeek 和 pi-ai 的纯文本序列化会消费持久描述，只拒绝尚未处理的图片。Host 提示词准入、模型选择和 `read_image` 都接受原生图片能力或可用的旁路。旁路路由失败、附件缺失、空输出、超时和图片数量超限都会在主请求之前失败。

## Alternatives considered

**将所有图片会话路由到 GLM。** 这会提供原生图片输入，但会移除用户选择的 DeepSeek 文本路由及其模型专属的成本、上下文和推理行为。

**改写冻结的 `llm/stream` 请求。** Agent loop 请求来自持久会话事件，并会在分发前冻结。只改写请求会让面向模型的描述不在会话日志中，破坏请求重建。

**由旁路维护按模型名称匹配的能力表。** 模型 catalog 与显式 `input` 声明已经属于 LLM 适配器。再维护一份表会与提供方配置漂移，也无法覆盖用户自定义的网关路由。

## Consequences

原始附件仍可供 UI 渲染，也可供之后的原生图片路由使用；纯文本路由会像普通提示词文本一样为持久描述付费。历史图片会在该会话的下一次请求前先完成旁路准备，后续请求复用持久描述。绕过 `agent/pre-step` 直接调用 `ctx.llm.stream()` 的辅助消费方仍需选择图片路由或自行接入准备过程。
