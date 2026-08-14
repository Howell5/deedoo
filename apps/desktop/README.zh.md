# DeepSeek Harness 桌面端

[English](README.md) | 中文

这是随 DeepSeek Harness Web 客户端交付的 Electron 桌面壳。渲染器启用
Chromium 沙箱、关闭 Node 集成、启用上下文隔离，并默认拒绝权限请求。Harness
profile 运行于独立的 Electron Utility Process，并监听由操作系统分配的随机回环端口。

## 开发

在仓库根目录运行：

```sh
pnpm run dev:desktop
```

该命令会先构建 Host 库、浏览器 bundle 和桌面入口，再打开 Electron。运行中的
应用不会使用系统安装的 Node.js；Utility Process 使用 Electron 自带的运行时。

## 打包

```sh
pnpm run package:desktop
```

暂存步骤通过 `pnpm deploy` 生成桌面应用及其完整生产依赖闭包，然后由 Electron
Builder 创建对应平台的安装产物。由于 Electron Utility Process 的入口必须是实体
文件，应用资源暂不封装进 ASAR。

## 当前边界

首版桌面载体通过随机回环端口复用已经验证的 HTTP/WebSocket Web profile。后端
进程与桌面主进程隔离，端口不会监听到回环之外，但本机其他进程仍可能探测它。
后续生产硬化会把载体替换为已经规划的 IPC 传输；该改动不需要重写产品 UI。

Electron 会在打包应用中阻止 Node internals 标志，因此此界面不启用 profile patch
实时监听。编辑 profile patch 后需要重启桌面应用。
