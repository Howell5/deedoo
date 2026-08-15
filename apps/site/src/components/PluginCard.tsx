import { Link } from '@tanstack/react-router'
import { ArrowUpRight, GitFork, Star } from 'lucide-react'
import {
  formatCompactNumber,
  formatRelativeDate,
  type Plugin,
} from '~/data/plugins'

const categoryMarks: Record<Plugin['category'], string> = {
  Fun: '✦',
  Runtime: '⌘',
  Themes: '◐',
  Tools: '⌁',
  UI: '▦',
  Vision: '◉',
  Workflow: '↝',
}

export function PluginCard({
  plugin,
  priority = false,
}: {
  plugin: Plugin
  priority?: boolean
}) {
  return (
    <article className={`plugin-card${priority ? ' plugin-card-featured' : ''}`}>
      <Link
        className="plugin-card-link"
        to="/plugins/$owner/$repo"
        params={{ owner: plugin.owner, repo: plugin.repo }}
        aria-label={`View ${plugin.name}`}
      >
        <div className="plugin-card-top">
          <div className={`plugin-mark category-${plugin.category.toLowerCase()}`}>
            {categoryMarks[plugin.category]}
          </div>
          <span className="plugin-category">{plugin.category}</span>
          <ArrowUpRight aria-hidden="true" size={16} />
        </div>
        <div className="plugin-identity">
          <p>{plugin.owner}</p>
          <h2>{plugin.name}</h2>
        </div>
        <p className="plugin-description">{plugin.description}</p>
        <div className="plugin-card-meta">
          <span>
            <Star aria-hidden="true" size={14} />
            {formatCompactNumber(plugin.stars)}
          </span>
          <span>
            <GitFork aria-hidden="true" size={14} />
            {formatCompactNumber(plugin.forks)}
          </span>
          <span className="plugin-updated">
            {formatRelativeDate(plugin.pushedAt)}
          </span>
        </div>
      </Link>
    </article>
  )
}
