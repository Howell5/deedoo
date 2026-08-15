import { createFileRoute } from '@tanstack/react-router'
import { plugins } from '~/data/plugins'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin
        const urls = [
          `${origin}/`,
          `${origin}/plugins`,
          ...plugins.map(
            plugin => `${origin}/plugins/${plugin.owner}/${plugin.repo}`,
          ),
        ]
        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map(url => `  <url><loc>${url}</loc></url>`),
          '</urlset>',
        ].join('\n')

        return new Response(body, {
          headers: {
            'cache-control': 'public, max-age=3600, s-maxage=86400',
            'content-type': 'application/xml; charset=utf-8',
          },
        })
      },
    },
  },
})
