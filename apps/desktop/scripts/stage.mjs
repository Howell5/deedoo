import { lstat, mkdir, readdir, rm, symlink } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(packageDir, '../..')
const appDir = resolve(packageDir, 'dist/app')
await rm(appDir, { recursive: true, force: true })

const result = spawnSync(
  'pnpm',
  [
    '--filter',
    '@deepseek-ai/dsh-desktop',
    'deploy',
    '--prod',
    '--legacy',
    appDir,
  ],
  { cwd: repositoryRoot, stdio: 'inherit' },
)

if (result.error !== undefined) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

// Cordis loads configured plugin package names with native ESM import().
// pnpm's isolated deploy layout keeps transitive workspace packages only
// inside peer-context directories, outside that resolver's parent walk.
// Materialize the one flat scope the Harness plugin graph owns, matching the
// flat installation fallback maintained by the CLI for normal installations.
const modulesDir = resolve(appDir, 'node_modules')
const virtualStore = resolve(modulesDir, '.pnpm')
const scopeDir = resolve(modulesDir, '@deepseek-ai')
await mkdir(scopeDir, { recursive: true })

for (const entry of (await readdir(virtualStore)).sort()) {
  const candidateScope = resolve(virtualStore, entry, 'node_modules/@deepseek-ai')
  let packages
  try {
    packages = await readdir(candidateScope)
  } catch {
    continue
  }
  for (const packageName of packages.sort()) {
    const link = resolve(scopeDir, packageName)
    try {
      await lstat(link)
      continue
    } catch {
      // Missing is the ordinary path; symlink() below reports other failures.
    }
    const target = resolve(candidateScope, packageName)
    await symlink(relative(dirname(link), target), link, 'dir')
  }
}

// Legacy deploy temporarily injects workspace packages and leaves the source
// installation in its production-only status shape. Restore the checkout so
// packaging can continue with Electron Builder and repeated stage runs remain
// deterministic. All artifacts above are detached clones in appDir.
const restore = spawnSync('pnpm', ['install', '--offline'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
})
if (restore.error !== undefined) throw restore.error
if (restore.status !== 0) process.exit(restore.status ?? 1)
