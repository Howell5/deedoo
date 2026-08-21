# @deepseek-ai/dsh-widgets-local

[English](README.md) | 中文

[`@deepseek-ai/dsh-widgets`](../widgets/README.md) 的本地 Service Provider。默认把受管理项目存放在 `$DSH_HOME/widgets/projects`，每次读取时重新校验 manifest 和入口，并在未关闭 `seedExamples` 时写入离线计算器与联网的黄金／美元走势 Widget。

`root` 可以覆盖受管理项目目录。`seedExamples` 默认为 `true`；写入示例绝不会替换具有相同 id 的现有目录。`watch` 默认为 `true`，`watchDebounceMs` 默认为 120 毫秒。监听器忽略初始发现，对后续文件系统变更所属的直接受管理项目发送 `widgets/changed`，并随提供方 fiber 一同关闭。内置示例不能通过 Widget 生命周期 API 移除。

`create()` 会写入一个具有唯一标识的正方形起始项目，其中包含 `widget.json`、自包含的 `dist/index.html` 和项目本地 `AGENTS.md` 创作规则，再通过原子重命名发布。该项目不需要构建命令或开发服务器，可以直接成为普通 Agent Workspace。

安装操作接受包含 `widget.json` 及其声明入口的绝对源目录。它只把规范化 manifest 和入口 HTML 复制到私有暂存目录，再通过原子重命名发布。manifest 上限为 64 KiB，HTML 入口上限为 512 KiB。入口路径遍历、逃逸符号链接、非文件、重复 id 和格式错误的 manifest 都会在发布前失败。

Widget 网络请求是无凭证的 HTTPS GET。每个目标和重定向都必须匹配 manifest 中的精确主机名，只解析到公网地址，使用默认端口，在 15 秒内完成，不超过三次重定向，并且返回内容不超过 512 KiB。提供方向 frame 桥接返回文本，绝不暴露宿主凭证。

计算器声明正方形画布。黄金／美元示例声明 `16:9` 画布，只允许 `xaus.com`，请求其公开日线历史端点，并渲染最近 90 个观测值。两个入口的完整布局都位于声明画布以内；黄金显示仅供参考，不是交易报价。

起始项目的 `AGENTS.md` 会把视觉设计纳入普通 Workspace Agent 的每次创建和重设计，包括增量修改。它要求 Agent 推导受众、使用时刻、主要信号和情绪基调，确定一套符合领域的视觉系统，实现相关数据状态和无障碍行为，并按照明确的反模板规则自行复查结果。现有 Workspace 指令加载机制会把该文件提供给模型请求，无需让用户配置风格；浏览器容器会独立强制固定画布。

## 模型体验

间接产生影响，途径是 Workspace 指令加载器使用起始项目的 `AGENTS.md`：创建的项目成为 Workspace 后，加载器会把该文件记录为模型可见上下文，并同时用于首次创建和后续编辑；这组指令不增加工具或 schema。

#### KV Cache effect

已记录的指令载荷会保留在 Session 前缀中。修改 `AGENTS.md` 会从更新位置起改变后续模型上下文；Widget 数据请求仍是独立的宿主 HTTP 请求，绝不进入模型请求。

## 已知限制与暂缓事项

- **静态资源必须是单文件** —— 安装只复制 `widget.json` 和声明的 HTML 入口，因此脚本、样式、字体和图片必须嵌入该文档。
- **更新需要新 id 或手动移除** —— 安装现有 id 会失败，内置示例则有意保持不可变。
- **刷新声明仅为元数据** —— 本提供方不调度可见区间刷新，也不保留上一次成功的网络响应。
