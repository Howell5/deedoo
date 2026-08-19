# @deepseek-ai/dsh-llm-vision-sidecar

[English](README.md) | 中文

视觉旁路让纯文本对话路由也能使用图片附件。它通过 `ctx.llm.resolveModelInfo` 解析一条已配置且支持图片的 LLM 路由，在 `agent/pre-step` 期间描述每个尚未处理的图片，并把有界描述与原始附件写入同一条持久消息。原始附件仍可供 UI 使用，也可在之后切换到原生支持图片的路由。

## 配置

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

`provider` 和 `model` 标识旁路路由；能力元数据由所属 LLM 适配器提供。插件不维护按模型名称匹配的能力表。配置的路由必须解析出 `inputModalities: [text, image]`，否则会在主纯文本请求之前失败。

`enabled` 同时控制入口准入和准备过程。`timeoutMs`、`maxOutputTokens`、`maxDescriptionChars` 与 `maxImagesPerStep` 都会校验为正数边界。默认 base bundle 将插件指向 `glm-vision` / `glm-4v-flash`；在图片请求使用它之前，`llm-pi-ai` settings 分节必须定义该路由及其凭据。

## 运行时语义

监听器会先委托完整的 `agent/pre-step` waterfall，让其他监听器先添加或替换消息，然后准备内容。它会检查主路由声明的模态能力。原生图片路由原样通过；没有明确图片能力的路由使用配置的视觉旁路。

旁路会在单个 pre-step 内按附件 id 缓存描述，受 `maxImagesPerStep` 限制，并使用 `purpose: vision` 发起请求。历史图片通过表层替换事件写回，同时保留消息 id 和来源事件类型。新领取的图片会在最终进入步骤的批次中返回，并由 `dsh-agent-loop` 在描述已附加后记录。

旁路失败时会 fail-closed。路由元数据缺失、持久附件缺失、返回空内容、超时或图片数量超限都会阻止主模型请求，而不会静默丢弃图片或将图片发送给纯文本适配器。

## 模型体验

### 纯文本路由

#### 模型看到的内容

DeepSeek chat-completions 与 pi-ai 纯文本路由会收到原有上下文文字，以及有界的 `[Image description]` 区块，不会收到原始图片字节。持久消息仍包含图片引用，因此 UI 和之后的图片路由仍可使用原始附件。

#### Token 影响

描述会像普通文本一样，在压缩遮蔽消息之前计入每次请求。一次性的视觉请求有自己的提供方费用和输出上限。

#### KV Cache 影响

图片完成描述后首次请求会改变对话前缀；后续请求可以像普通文本前缀一样复用该描述。

### 原生图片路由

#### 模型看到的内容

支持图片的路由会通过自己的适配器接收原始附件。如果某条消息此前为纯文本路由生成过描述，原生路由还可能收到作为辅助文本的持久描述。

#### Token 影响

原生图片的 token 计算仍由提供方负责。持久描述不会替换或删除原始附件。

#### KV Cache 影响

由提供方决定原生图片部分和持久描述如何影响其缓存前缀。

## 已知限制与暂缓事项

- **每个 pre-step 对每个不同附件 id 生成一次描述**：提示词特定描述和跨进程描述缓存不属于本插件。
- **旁路是 agent 步骤消费方**：独立调用 `ctx.llm.stream()` 的辅助消费方（例如独立配置的压缩器）必须选择图片路由，或自行接入准备过程。
- **描述不是单独的 transcript 行**：图片块仍是面向用户的持久单元；旁路元数据是该图片块上的适配器持久信息。
