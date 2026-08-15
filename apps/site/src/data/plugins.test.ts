import { describe, expect, it } from 'vitest'
import { pluginBySlug, plugins } from './plugins'

describe('plugin registry', () => {
  it('contains unique GitHub repositories with public URLs', () => {
    const repositories = plugins.map(
      plugin => `${plugin.owner.toLowerCase()}/${plugin.repo.toLowerCase()}`,
    )

    expect(new Set(repositories).size).toBe(repositories.length)
    expect(
      plugins.every(
        plugin =>
          new URL(plugin.url).hostname === 'github.com' &&
          plugin.stars >= 0 &&
          plugin.forks >= 0,
      ),
    ).toBe(true)
  })

  it('looks up repository slugs without case sensitivity', () => {
    const first = plugins[0]

    expect(
      pluginBySlug(first.owner.toUpperCase(), first.repo.toUpperCase()),
    ).toEqual(first)
    expect(pluginBySlug('missing', 'plugin')).toBeUndefined()
  })
})
