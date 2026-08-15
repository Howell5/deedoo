import { createFileRoute } from '@tanstack/react-router'
import { plugins } from '~/data/plugins'

export const Route = createFileRoute('/api/plugins')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            count: plugins.length,
            source: 'GitHub',
            plugins,
          },
          {
            headers: {
              'cache-control':
                'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
            },
          },
        ),
    },
  },
})
