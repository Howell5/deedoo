import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Code2,
  GitFork,
  Scale,
  Star,
} from 'lucide-react'
import { CopyInstall } from '~/components/CopyInstall'
import { PluginCard } from '~/components/PluginCard'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import {
  formatCompactNumber,
  formatRelativeDate,
  pluginBySlug,
  plugins,
} from '~/data/plugins'
import { seo } from '~/utils/seo'

export const Route = createFileRoute('/plugins/$owner/$repo')({
  loader: ({ params }) => {
    const plugin = pluginBySlug(params.owner, params.repo)
    // TanStack Router uses a tagged not-found value to select its 404 boundary.
    // oxlint-disable-next-line typescript/only-throw-error
    if (plugin === undefined) throw notFound()
    return plugin
  },
  head: ({ loaderData }) => ({
    meta:
      loaderData === undefined
        ? []
        : [
          ...seo({
            title: `${loaderData.name} — Deedoo Plugins`,
            description: loaderData.description,
            keywords: `${loaderData.name}, DeepSeek Harness plugin, DSH`,
          }),
          { name: 'twitter:image', content: '' },
          { property: 'og:image', content: '' },
        ],
  }),
  component: PluginDetail,
})

function PluginDetail() {
  const plugin = Route.useLoaderData()
  const related = [...plugins]
    .filter(
      candidate =>
        candidate.category === plugin.category &&
        candidate.repo !== plugin.repo,
    )
    .sort((left, right) => right.stars - left.stars)
    .slice(0, 3)
  const installCommand =
    plugin.installSpec === null
      ? null
      : `dsh plugin --profile web add ${plugin.installSpec}`

  return (
    <main className="plugin-detail-page">
      <SiteHeader />

      <article className="plugin-detail">
        <Link className="back-link" to="/plugins">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to all plugins
        </Link>

        <div className="plugin-detail-heading">
          <div className="detail-mark">{plugin.name.slice(0, 1)}</div>
          <div>
            <span>{plugin.category}</span>
            <p>{plugin.owner}</p>
            <h1>{plugin.name}</h1>
          </div>
        </div>

        <p className="detail-description">{plugin.description}</p>

        <div className="detail-actions">
          <a className="button button-primary" href={plugin.url}>
            View on GitHub
            <ArrowUpRight aria-hidden="true" size={17} />
          </a>
          <Link className="button button-secondary" to="/plugins">
            Browse more
          </Link>
        </div>

        <div className="detail-grid">
          <section className="detail-main">
            <p className="detail-section-label">Install</p>
            <h2>Bring it into your web profile.</h2>
            {installCommand === null ? (
              <div className="install-unavailable">
                <strong>Follow the project install guide</strong>
                <p>
                  This repository uses a custom package layout. Open its GitHub
                  documentation for the current installation command.
                </p>
              </div>
            ) : (
              <>
                <CopyInstall command={installCommand} />
                <p className="install-note">
                  This command installs third-party code from GitHub. Review the
                  repository before running it.
                </p>
              </>
            )}

            <div className="about-project">
              <p className="detail-section-label">About this listing</p>
              <p>
                Deedoo indexes public community work so people can discover the
                emerging DeepSeek Harness ecosystem in one place. Metadata
                comes from GitHub; the description and category are curated by
                the directory.
              </p>
            </div>
          </section>

          <aside className="detail-sidebar">
            <div>
              <Star aria-hidden="true" size={18} />
              <span>GitHub stars</span>
              <strong>{formatCompactNumber(plugin.stars)}</strong>
            </div>
            <div>
              <GitFork aria-hidden="true" size={18} />
              <span>Forks</span>
              <strong>{formatCompactNumber(plugin.forks)}</strong>
            </div>
            <div>
              <Code2 aria-hidden="true" size={18} />
              <span>Primary language</span>
              <strong>{plugin.language}</strong>
            </div>
            <div>
              <Scale aria-hidden="true" size={18} />
              <span>License</span>
              <strong>{plugin.license}</strong>
            </div>
            <div>
              <CalendarDays aria-hidden="true" size={18} />
              <span>Activity</span>
              <strong>{formatRelativeDate(plugin.pushedAt)}</strong>
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="related-plugins">
          <div className="related-heading">
            <span>Keep exploring</span>
            <h2>More in {plugin.category}</h2>
          </div>
          <div className="plugin-grid">
            {related.map(candidate => (
              <PluginCard
                plugin={candidate}
                key={`${candidate.owner}/${candidate.repo}`}
              />
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  )
}
