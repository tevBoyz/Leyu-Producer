import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'node_modules/electron/dist')
const electronExe = join(distDir, 'electron.exe')

function readInstalledElectronVersion() {
  const electronPkg = join(root, 'node_modules/electron/package.json')
  if (existsSync(electronPkg)) {
    return JSON.parse(readFileSync(electronPkg, 'utf8')).version
  }

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  return String(pkg.devDependencies?.electron ?? '').replace(/^\^/, '')
}

function getCacheZipPath(version) {
  const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local')
  return join(localAppData, 'electron', 'Cache', `electron-v${version}-win32-x64.zip`)
}

function extractZip(zipPath, destinationDir) {
  mkdirSync(destinationDir, { recursive: true })
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`
      ],
      { stdio: 'inherit' }
    )
    return
  }

  execFileSync('unzip', ['-o', zipPath, '-d', destinationDir], { stdio: 'inherit' })
}

export function ensureElectronDist() {
  if (existsSync(electronExe)) {
    console.log('[electron] Using existing node_modules/electron/dist')
    return distDir
  }

  const version = readInstalledElectronVersion()
  const zipPath = getCacheZipPath(version)

  if (!existsSync(zipPath)) {
    throw new Error(
      `Electron binary missing and cache zip not found.\nExpected cache zip:\n  ${zipPath}\n\nDownload it from:\n  https://github.com/electron/electron/releases/download/v${version}/electron-v${version}-win32-x64.zip`
    )
  }

  console.log(`[electron] Extracting cached zip into node_modules/electron/dist\n  ${zipPath}`)
  extractZip(zipPath, distDir)

  if (!existsSync(electronExe)) {
    throw new Error(`Extraction finished but electron.exe was not found in ${distDir}`)
  }

  console.log('[electron] Ready:', distDir)
  return distDir
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    ensureElectronDist()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
