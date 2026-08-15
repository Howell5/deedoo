import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin
        return new Response(
          `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
          {
            headers: {
              'cache-control': 'public, max-age=3600, s-maxage=86400',
              'content-type': 'text/plain; charset=utf-8',
            },
          },
        )
      },
    },
  },
})
