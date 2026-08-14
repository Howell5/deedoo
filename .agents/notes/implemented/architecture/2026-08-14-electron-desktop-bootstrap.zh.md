# Agent Note：Electron 桌面端启动——沙箱渲染器、Utility Process 后端与可部署运行时闭包

Status: implemented

[English](2026-08-14-electron-desktop-bootstrap.md) | 中文

## Problem

DeepSeek Harness 已有完整的浏览器产品，但当前使用方式假设用户能够安装并操作
Node.js 命令行工具。桌面发行版必须能在没有 Node.js 的电脑上运行，保留现有的
插件化 UI 与协议行为，将后端故障与窗口进程隔离，并生成依赖完整的平台产物。

协议架构预留了 Electron IPC 载体，但目前尚无 IPC client、流桥接、插件 bundle
传输或桌面组合。一次性实现这四个边界会推迟首个可用桌面应用，也会重复已经验证的
Web 启动行为。

## Decision

**在 `apps/desktop` 中交付首个 Electron 桌面启动版本。** Electron 提供 Node.js
运行时，因此开发产物与打包应用都不会调用系统 Node 二进制。桌面壳在 Electron
Utility Process 中以 `web --port 0` 启动构建后的 `@deepseek-ai/dsh` CLI，并将
现有的 `dsh web:` URL 输出作为就绪信号；随后 BrowserWindow 加载未经改写的
Web 客户端。

**保持渲染器无特权。** BrowserWindow 启用 Chromium 沙箱与上下文隔离，关闭
Node 集成，保留 Web 安全，拒绝权限请求，阻止子窗口，并仅通过操作系统打开经过
协议校验的 HTTP(S) 外链。Harness 页面导航被限制在分配到的回环 origin。

**明确进程所有权。** 一个应用实例拥有一个 Utility Process。启动具备有界就绪
超时，并通过原生重试／退出界面报告失败。后端意外退出时，窗口回到启动界面。重启
会先等待后端关闭；应用退出会发送常规 SIGTERM 路径，并在有界清理后退出。
打包后的 Electron 应用会移除 Cordis HMR 所需的 Node internals 标志，因此桌面调用
会关闭 profile patch watcher；profile 编辑会在重启后生效。

**打包实体化的生产依赖闭包。** Electron Builder 创建 DMG/ZIP、NSIS 或
AppImage 产物前，`pnpm deploy --prod` 会暂存桌面包及所有 workspace 运行时依赖。
应用资源保持未封装状态：Utility Process 需要实体入口文件，而启动版本会直接 fork
CLI 入口。因此平台签名属于发行边界，不把 ASAR 当作完整性机制。

本决策部分取代
[GUI 分层与 RPC 协议](2026-07-19-gui-layering-and-rpc-protocol.md)
中的 Electron 载体部分：IPC 载体仍是生产硬化目标，但不再是首个桌面可执行文件的
前置条件。启动版本暂时在操作系统分配的回环端口上复用 `dsh-host-webserver`。

## Alternatives considered

**先实现 IPC 再创建桌面壳。** 启动阶段不采用。当前客户端会动态加载插件 bundle，
并在 unary fetch 之外拥有两条流式通道；三类传输及其清理语义必须同时完成，UI
才能渲染。

**在 Electron Main 中运行 Harness tree。** 不采用。模型执行、插件故障、原生
模块和长连接会与原生窗口共享同一故障域。

**启动外部 `node` 或 `dsh` 可执行文件。** 不采用。这会重新引入桌面产品本应消除
的安装要求，也会把运行时版本漂移交给用户处理。

**重写桌面专用前端。** 不采用。现有 Web 客户端已经是产品界面，且组合由插件定义；
第二套 UI 会拆分行为和验证。

## Consequences

用户无需安装 Node.js 即可打开原生窗口，现有 onboarding、设置、工作区、会话、
插件、unary RPC 与 WebSocket 流均保持不变。后端崩溃时无需退出原生壳即可恢复，
打包流程也拥有明确的独立依赖边界。

启动版本接受的风险是本机可达性：服务器仅绑定到 `127.0.0.1` 的随机端口，且端口
不会在父进程之外主动公布，但以同一用户身份运行的其他进程仍可探测本地端口。IPC
会消除该暴露，因此在把载体视为完全硬化之前仍需完成。平台签名、公证、自动更新和
系统钥匙串凭据 provider 属于独立的发行工作；本启动版本不宣称已经完成这些能力。
