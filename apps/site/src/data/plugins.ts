import { z } from 'zod'
import registry from '../../registry/plugins.json'

const pluginSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum([
    'Fun',
    'Runtime',
    'Themes',
    'Tools',
    'UI',
    'Vision',
    'Workflow',
  ]),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  language: z.string().min(1),
  license: z.string().min(1),
  createdAt: z.iso.datetime(),
  pushedAt: z.iso.datetime(),
  url: z.url(),
  installSpec: z.string().min(1).nullable(),
  featured: z.boolean(),
  firstSeenAt: z.iso.date(),
})

export type Plugin = z.infer<typeof pluginSchema>

export const plugins = z.array(pluginSchema).parse(registry)

export const categories = [
  'All',
  ...Array.from(new Set(plugins.map(plugin => plugin.category))).sort(),
] as const

export function pluginBySlug(owner: string, repo: string): Plugin | undefined {
  return plugins.find(
    plugin =>
      plugin.owner.toLowerCase() === owner.toLowerCase() &&
      plugin.repo.toLowerCase() === repo.toLowerCase(),
  )
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatRelativeDate(value: string): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000),
  )
  if (days === 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  return `Updated ${days} days ago`
}
