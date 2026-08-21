# Widget Packages

English | [中文](README.zh.md)

Local mini-application capability family. Widgets are validated static projects rendered by the desktop client; the Host owns managed storage and all external requests.

| Package | Role | `ctx` key |
|---|---|---|
| [`widgets`](widgets/README.md) | Service Definition, manifest parser, operations, and errors | `widgets` |
| [`widgets-local`](widgets-local/README.md) | Local Service Provider, built-in examples, storage, and network policy | provides `widgets` |

The browser Consumer is [`dsh-client-ui-widgets`](../client/ui-widgets/README.md), and the shipped composition mounts the local provider through [`dsh-web-app`](../bundle/web-app/README.md).
