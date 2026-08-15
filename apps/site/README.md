# Deedoo website

English | [中文](README.zh.md)

This TanStack Start application is the public home for Deedoo and the community DeepSeek Harness plugin directory. Cloudflare Workers renders the pages and serves the static assets.

## Routes

| Route | Purpose |
|---|---|
| `/` | Product overview and desktop download links |
| `/plugins` | Searchable plugin directory with category and GitHub metadata sorting |
| `/plugins/:owner/:repo` | Curated plugin detail and installation guidance |
| `/api/plugins` | Public JSON copy of the validated registry |
| `/sitemap.xml` and `/robots.txt` | Search crawler discovery |

## Development

From the repository root:

```sh
pnpm install
pnpm site:dev
pnpm site:build
```

## Plugin registry

[`registry/plugins.json`](registry/plugins.json) is the reviewed source for listing descriptions, categories, and install specifications. `pnpm site:sync` refreshes public GitHub stars, forks, language, license, and activity fields. Set `GITHUB_TOKEN` to increase the GitHub API rate limit; the script also works without a token at the public limit.

The scheduled [GitHub workflow](../../.github/workflows/site-plugin-sync.yml) refreshes the registry every six hours, verifies the production build, and commits changed metadata. New projects enter through review instead of an unrestricted submission API.

## Deployment

[`wrangler.jsonc`](wrangler.jsonc) configures the TanStack Start server entry for Cloudflare Workers and Static Assets. `pnpm --filter @deepseek-ai/dsh-site deploy` builds and deploys through Wrangler after Cloudflare authentication.

## Limitations

The directory indexes third-party repositories; a listing is not a security review, compatibility guarantee, or endorsement. Deedoo desktop downloads remain linked to GitHub Releases while signed builds are prepared. Web-to-desktop one-click installation is intentionally absent until the desktop client owns a consented protocol handler and a versioned installation request.
