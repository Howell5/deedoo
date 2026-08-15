import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const registryPath = fileURLToPath(
  new URL('../registry/plugins.json', import.meta.url),
)

const pluginSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  language: z.string().min(1),
  license: z.string().min(1),
  createdAt: z.string().datetime(),
  pushedAt: z.string().datetime(),
  url: z.string().url(),
  installSpec: z.string().min(1).nullable(),
  featured: z.boolean(),
  firstSeenAt: z.string().date(),
})

const repositorySchema = z.object({
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  language: z.string().nullable(),
  license: z.object({ spdx_id: z.string().nullable() }).nullable(),
  created_at: z.string().datetime(),
  pushed_at: z.string().datetime(),
  html_url: z.string().url(),
  archived: z.boolean(),
})

const registry = z
  .array(pluginSchema)
  .parse(JSON.parse(await readFile(registryPath, 'utf8')))

const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'deedoo-plugin-index',
  'X-GitHub-Api-Version': '2022-11-28',
}
if (process.env.GITHUB_TOKEN !== undefined) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

const updated = []
for (const plugin of registry) {
  const response = await fetch(
    `https://api.github.com/repos/${plugin.owner}/${plugin.repo}`,
    { headers },
  )
  if (!response.ok) {
    throw new Error(
      `GitHub metadata failed for ${plugin.owner}/${plugin.repo}: ${String(response.status)}`,
    )
  }
  const repository = repositorySchema.parse(await response.json())
  if (repository.archived) {
    process.stderr.write(
      `warning: ${plugin.owner}/${plugin.repo} is archived but remains indexed\n`,
    )
  }
  updated.push({
    ...plugin,
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    language: repository.language ?? plugin.language,
    license: repository.license?.spdx_id ?? plugin.license,
    createdAt: repository.created_at,
    pushedAt: repository.pushed_at,
    url: repository.html_url,
  })
}

await writeFile(registryPath, `${JSON.stringify(updated, undefined, 2)}\n`)
process.stdout.write(`updated ${String(updated.length)} plugin records\n`)
