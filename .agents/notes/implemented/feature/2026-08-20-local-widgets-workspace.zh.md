# Agent Note: 本地 Widgets 工作台

Status: implemented

[English](2026-08-20-local-widgets-workspace.md) | 中文

## 问题

用户需要天气看板、指定行情视图、汇率转换、计算器和小范围监控器等个人工具。这些工具过于定制，不适合成为永久产品功能，但应该在创建它们的会话结束后继续可用。若把每个生成项目都作为开发服务器运行，桌面运行时就必须承担系统 Node.js、包管理器状态、端口分配、进程监管和宽泛的后端权限。

DeepSeek Harness 需要一个持久位置来安装和再次打开本地微型应用，同时让它们的执行权限窄于桌面宿主。

## 决策

桌面组合包含一个位于 Workspace 浏览器下方、Settings 上方的一级 **Widgets** 应用。选择它会保留当前 Session，并用 Widget 网格替换中间的 Conversation 视图。启动或打开 Session 时会重新选择 Conversation。

第一版接收一个包含严格 `widget.json` manifest（元数据清单）和单个自包含静态 HTML 入口的本地目录。manifest 声明一种或多种固定的 `1:1`、`16:9` 或 `9:16` 画布以及默认画布。本地提供方校验这些文件，并通过暂存重命名将其复制到 `$DSH_HOME/widgets/projects/<id>`。它也可以创建一个具有唯一标识的正方形起始项目，其中包含 manifest、入口和项目本地 `AGENTS.md` 创作规则。Workspace 指令加载器会把这些规则提供给创建或修改 Widget 的每次模型请求。规则要求 Agent 推导使用情境、形成内部设计判断、实现一套符合领域的视觉系统，并自行复查数据状态、无障碍和反模板标准，无需让用户配置风格。提供方绝不调用 `npm install`、包脚本、任意构建命令，也不会为每个 Widget 启动 localhost 服务器。工作台把每张卡片选中的声明画布比例持久化到浏览器存储。

两个内置项目覆盖两条运行路径。Quick Calculator 没有权限，在正方形画布内运行。Gold / USD 适配 `16:9` 画布，通过宿主桥接从 `xaus.com` 请求公开日线历史数据，并绘制最近 90 个观测值；卡片会标明数据仅供参考。

**新建 Widget**会创建受管理的起始项目，立即把其目录作为普通 Workspace 接入，在 Conversation 中打开空白会话，并在右侧详情栏选择实时预览。每张已有卡片的**和它聊聊**操作会执行相同交接。精确受管理路径匹配会同时在空白 Hero 和活跃会话页头加入同一个预览开关。浏览器存储按 Workspace 记录预览是否打开：两种交接都会启用该偏好，从普通 Workspace 或 Session 导航进入时会恢复偏好，而任一预览关闭控件都会停用偏好。这些操作本身绝不发送提示词。本地提供方监听受管理根目录，在写入稳定后发送 `widgets/changed(id)`；Remote 投影转发该失效通知，让该 Widget 的每个可见 frame 重新读取经过校验的入口，并让每个已接入 Workspace 使用当前 manifest 名称作为显示标题。

## 运行时和网络策略

卡片通过 `iframe sandbox="allow-scripts"` 按照选中的 manifest 比例渲染宿主校验后的 HTML。父页面注入固定画布规则，在不缩放内容的前提下禁止滚动。布局观察器向父页面报告内容固有溢出；父页面会用布局无效错误替换发生溢出的文档，生成页面必须适配它声明的每一种比例。父页面还会注入内容安全策略，拒绝直接连接、导航权限、Node 集成和文件系统访问。嵌入脚本通过 `postMessage` 调用 `window.dshWidget.fetch(url)`；父页面只接受来自该卡片 frame 的请求，再把请求转发到带类型的宿主 RPC 域。

本地提供方只允许向 manifest 精确主机名发起无凭证 HTTPS GET 请求。它检查每次重定向和解析地址，拒绝私有目标及非默认端口，把请求限制为 15 秒和三次重定向，并把每个响应限制为 512 KiB。frame 只收到响应状态、内容类型和文本，绝不会收到宿主凭证。

## 包归属

| 包 | 职责 |
|---|---|
| `packages/widget/widgets` | Service Definition、严格 manifest 解析器、品牌化 id、操作和稳定错误 |
| `packages/widget/widgets-local` | 受管理项目存储、内置示例、路径校验、文件变更通知和外部请求策略 |
| `packages/host/apiproxy` | 带类型的 Widget RPC 方法和载体 schema |
| `packages/client/ui-widgets` | 侧边栏入口、工作台网格、Agent 编辑交接、实时预览、隔离 frame 和 frame 到宿主的桥接 |
| `packages/client/ui-layout`、`packages/client/ui-sidebar` 和 `packages/client/ui-conversation` | 通用根应用／详情应用选择，以及会话页头和空白 Hero 工具 slot |

Service Definition 不包含 UI 或传输假设。UI 只通过宿主方法读取项目，绝不直接访问本地目录。

## 验证

提供方测试覆盖起始项目创建、示例写入、静态项目导入、重复拒绝、未声明网络访问拒绝、监听器失效通知和监听器释放。客户端测试覆盖 Agent 编辑所需的 Workspace 复用、接入、manifest 名称同步和预览偏好持久化。构建后的 Web 路径会创建起始项目，进入其空白会话并打开预览，再为已有 Widget 覆盖相同交接和预览恢复。API 载体测试通过真实 fetch handler 验证 Widget 请求与响应序列化。客户端和宿主聚合 TypeScript 程序包含所有新包，发行版 Web／桌面组合会同时挂载提供方和 UI。

## 考虑过的替代方案

**每个 Widget 运行一个 localhost 开发服务器。** 否决，因为它要求最终用户电脑具备 Node.js、依赖、端口、子进程清理和任意后端执行能力。

**把天气、股票、黄金和计算器构建为固定产品组件。** 否决，因为产品价值是承载用户拥有、可由 agent 持续编辑的软件；内置内容只是示例，不是扩展模型。

**只使用声明式仪表盘 schema。** 否决，因为它无法表达用户会提出的交互工具。静态 Web 文档在受限运行时内保留了普通 UI 行为。

**通过 Electron `webview` 或 Node 集成加载项目。** 否决，因为生成代码会继承超出其声明网络主机的桌面权限。

**只在 Widgets 卡片交接时提供预览。** 否决，因为预览属于受管理项目，而非某一条导航路径；从普通 Workspace 浏览器返回时必须保留一个明确的打开入口。

## 后果

桌面端无需系统 Node.js 或项目专属服务器即可运行实用的本地 Widget，联网 Widget 也只有一个可审计的宿主中介点。同一组应用 slot 可以承载后续一级桌面界面，而不必把它们做成 Session 视图。

第一版有意只复制 manifest 和一个自包含 HTML 入口。其创作流程复用普通 Workspace、Session、输入框和详情栏，不新增独立编辑器。预览偏好是浏览器本地 UI 状态，不属于 Session 日志或 Widget 数据。它没有资源目录、凭证桥接、Widget 持久化存储、间隔调度器、权限审批 UI、更新、卡片重排、停用状态或独立聚焦视图。这些扩展会扩大持久状态或运行时权限，因此需要独立决策。
