# Deedoo 网站

[English](README.md) | 中文

这个 TanStack Start 应用同时承载 Deedoo 官网与 DeepSeek Harness 社区插件目录。Cloudflare Workers 负责渲染页面并提供静态资源。

## 路由

| 路由 | 用途 |
|---|---|
| `/` | 产品介绍与桌面应用下载链接 |
| `/plugins` | 支持搜索、分类和 GitHub 元数据排序的插件目录 |
| `/plugins/:owner/:repo` | 经整理的插件详情与安装说明 |
| `/api/plugins` | 经过校验的公开 JSON 插件注册表 |
| `/sitemap.xml` 和 `/robots.txt` | 搜索爬虫发现入口 |

## 开发

在仓库根目录运行：

```sh
pnpm install
pnpm site:dev
pnpm site:build
```

## 插件注册表

[`registry/plugins.json`](registry/plugins.json) 是插件描述、分类和安装参数经过评审的来源。`pnpm site:sync` 会刷新公开的 GitHub Star 数、Fork 数、主要语言、许可证和活动时间字段。设置 `GITHUB_TOKEN` 可以提高 GitHub API 速率上限；未设置 Token 时，脚本也能在公开额度内运行。

定时 [GitHub 工作流](../../.github/workflows/site-plugin-sync.yml) 每六小时刷新一次注册表，验证生产构建，并提交发生变化的元数据。新项目需经过评审后收录，不提供不受限制的提交 API。

## 部署

[`wrangler.jsonc`](wrangler.jsonc) 为 Cloudflare Workers 配置 TanStack Start 服务端入口、Static Assets 和生产自定义域名 `deedoo.willhong.dev`。完成 Cloudflare 身份验证后，`pnpm --filter @deepseek-ai/dsh-site deploy` 会直接通过 Wrangler 构建并部署网站。Cloudflare 是默认且持有部署的托管平台；除非用户明确要求，否则 ChatGPT Sites 不作为部署回退。

## 局限

本目录索引第三方代码仓库；被收录不代表通过安全审查、得到兼容性保证或官方背书。Deedoo 桌面应用在签名构建准备期间继续链接到 GitHub Releases。只有当桌面客户端提供需用户同意的协议处理器和版本化安装请求后，才会加入 Web 到桌面的一键安装。
