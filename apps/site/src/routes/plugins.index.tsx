import { createFileRoute } from '@tanstack/react-router'
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PluginCard } from '~/components/PluginCard'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { categories, plugins } from '~/data/plugins'
import { seo } from '~/utils/seo'

type SortMode = 'new' | 'stars' | 'updated'

export const Route = createFileRoute('/plugins/')({
  head: () => ({
    meta: seo({
      title: 'Plugins — Deedoo',
      description:
        'Discover community-built plugins, tools, interfaces, and workflows for DeepSeek Harness.',
      keywords: 'DeepSeek Harness plugins, DSH plugins, Deedoo marketplace',
    }),
  }),
  component: PluginDirectory,
})

function PluginDirectory() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof categories)[number]>('All')
  const [sort, setSort] = useState<SortMode>('stars')

  const visiblePlugins = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = plugins.filter((plugin) => {
      const matchesCategory =
        category === 'All' || plugin.category === category
      const matchesQuery =
        needle === '' ||
        [
          plugin.name,
          plugin.owner,
          plugin.repo,
          plugin.description,
          plugin.category,
        ].some(value => value.toLowerCase().includes(needle))
      return matchesCategory && matchesQuery
    })

    return filtered.sort((left, right) => {
      if (sort === 'new') {
        return Date.parse(right.firstSeenAt) - Date.parse(left.firstSeenAt)
      }
      if (sort === 'updated') {
        return Date.parse(right.pushedAt) - Date.parse(left.pushedAt)
      }
      return right.stars - left.stars
    })
  }, [category, query, sort])

  return (
    <main className="market-page">
      <SiteHeader inverse />

      <section className="market-hero">
        <div>
          <p className="market-kicker">
            <Sparkles aria-hidden="true" size={16} />
            The open DSH ecosystem
          </p>
          <h1>
            Find the missing
            <br />
            piece of your <em>Harness.</em>
          </h1>
        </div>
        <div className="market-intro">
          <p>
            A living index of community plugins for DeepSeek Harness, collected
            from public GitHub repositories and organized for people.
          </p>
          <div>
            <strong>{plugins.length}</strong>
            <span>curated projects in the first collection</span>
          </div>
        </div>
      </section>

      <section className="plugin-browser" aria-label="Plugin directory">
        <div className="browser-toolbar">
          <label className="search-field">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Search plugins</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
              placeholder="Search plugins, authors, or capabilities"
            />
            <kbd>⌘ K</kbd>
          </label>
          <label className="sort-field">
            <SlidersHorizontal aria-hidden="true" size={16} />
            <span className="sr-only">Sort plugins</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortMode)
              }}
            >
              <option value="stars">Most starred</option>
              <option value="updated">Recently updated</option>
              <option value="new">Newly added</option>
            </select>
          </label>
        </div>

        <div className="category-row" aria-label="Plugin categories">
          {categories.map(item => (
            <button
              className={item === category ? 'active' : undefined}
              type="button"
              key={item}
              onClick={() => {
                setCategory(item)
              }}
            >
              {item}
              <span>
                {item === 'All'
                  ? plugins.length
                  : plugins.filter(plugin => plugin.category === item).length}
              </span>
            </button>
          ))}
        </div>

        <div className="browser-result-line">
          <p>
            {visiblePlugins.length === plugins.length
              ? 'All community plugins'
              : `${visiblePlugins.length} matching plugins`}
          </p>
          <span>GitHub metadata synced August 15, 2026</span>
        </div>

        {visiblePlugins.length === 0 ? (
          <div className="market-empty">
            <strong>No plugin found.</strong>
            <p>Try a broader search or clear the active category.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('All')
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="plugin-grid">
            {visiblePlugins.map((plugin, index) => (
              <PluginCard
                plugin={plugin}
                priority={index < 2 && query === '' && category === 'All'}
                key={`${plugin.owner}/${plugin.repo}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="market-disclaimer">
        <span>Community index</span>
        <p>
          Listings are collected from public repositories and are not a
          security review or endorsement. Read each project’s source, license,
          and installation notes before use.
        </p>
        <a href="https://github.com/Howell5/deedoo/issues/new">
          Submit a plugin <span aria-hidden="true">↗</span>
        </a>
      </section>

      <SiteFooter />
    </main>
  )
}
