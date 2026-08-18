[English](README.md) | 中文

# @deepseek-ai/dsh-client-ui-update

Deedoo 桌面壳的设置页底部更新提示。

## 用途

打包应用版本落后于 Deedoo 最新 GitHub release 时，在设置面板右下角渲染一个更新提示。
检查中与已是最新的状态不渲染任何内容（零噪音）；有可用更新时渲染一个链接，在系统浏览器中打开 release 页面。

## 行为

- 检测源：`https://api.github.com/repos/Howell5/deedoo/releases?per_page=1`
  （允许 CORS；最新的 release 排在最前，包含预发布）。
- 当前版本：`settings.footer` owner 属性 `currentVersion`，由设置壳从桌面
  启动页的 `<meta name="dsh-version">` 注入。纯 Web 模式没有 meta 标签，
  回退为 `0.0.0`，此时任何已发布 release 都会读作更新。
- 比较：npm `semver` 严格大于，感知 rc。

## 模型体验

- 无 token、无 KV 缓存、无供应商请求。每次打开设置面板一次未认证的 GitHub
  API 调用（60/h 的限流远高于使用量）。
- 拉取失败静默：提示渲染为空而不是报错。

## 已知限制与待办

- 产品文案为内联中文；本地化提取延后。
- 纯 Web 模式无法知道打包版本（没有 meta 标签）；在预发布阶段每个 release
  都是更新，可接受。
