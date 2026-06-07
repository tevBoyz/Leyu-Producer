import { execFileSync } from 'node:child_process'
import { rmSync, readdirSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function killStaleProducerBuilds() {
  if (process.platform !== 'win32') {
    return
  }

  try {
    const output = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `$p = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'Leyu\\\\producer|electron-builder|electron-builder-win' }; $p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
      ],
      { encoding: 'utf8' }
    )
    if (output.trim()) {
      console.log(output.trim())
    }
  } catch {
    // No matching processes is fine.
  }
}

function removeElectronCacheLocks() {
  const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local')
  const cacheDir = join(localAppData, 'electron', 'Cache')

  try {
    for (const name of readdirSync(cacheDir)) {
      if (name.endsWith('.lock')) {
        unlinkSync(join(cacheDir, name))
        console.log('[clean] Removed lock file:', name)
      }
    }
  } catch {
    // Cache folder may not exist yet.
  }
}

killStaleProducerBuilds()
removeElectronCacheLocks()

try {
  rmSync(join(root, 'release'), { recursive: true, force: true })
  console.log('[clean] Removed release/')
} catch (error) {
  console.warn('[clean] Could not remove release/:', error instanceof Error ? error.message : error)
}

console.log('[clean] Ready for a fresh dist build.')
