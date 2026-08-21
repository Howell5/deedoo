# Widget 包

[English](README.md) | 中文

本地微型应用能力系列。Widget 是由桌面客户端渲染的、经过校验的静态项目；宿主持有受管理存储和所有外部请求。

| 包 | 角色 | `ctx` 键 |
|---|---|---|
| [`widgets`](widgets/README.md) | Service Definition、manifest（元数据清单）解析器、操作和错误 | `widgets` |
| [`widgets-local`](widgets-local/README.md) | 本地 Service Provider、内置示例、存储和网络策略 | 提供 `widgets` |

浏览器消费方是 [`dsh-client-ui-widgets`](../client/ui-widgets/README.md)，发行版组合通过 [`dsh-web-app`](../bundle/web-app/README.md) 挂载本地提供方。
