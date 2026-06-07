import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureElectronDist } from './ensure-electron-dist.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = ensureElectronDist()

process.env.ELECTRON_OVERRIDE_DIST_PATH = distDir

const extraArgs = process.argv.slice(2)
const result = spawnSync('npx', ['electron-builder', '--win', ...extraArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: root,
  env: process.env
})

process.exit(result.status ?? 1)
