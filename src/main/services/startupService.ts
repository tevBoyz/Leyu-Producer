import { app } from 'electron'
import type { StartupCheck, StartupStatus } from '../../shared/startup'
import * as db from '../db/databaseService'
import { getPrisma } from '../db/client'
import { getSettings } from './settingsService'

function check(
  id: string,
  label: string,
  ok: boolean,
  message: string
): StartupCheck {
  return { id, label, ok, message }
}

/** Verify core systems before the renderer workspace is shown. */
export async function getStartupStatus(): Promise<StartupStatus> {
  const checks: StartupCheck[] = []

  checks.push(
    check('bridge', 'App bridge', true, 'Electron main process is reachable.')
  )

  try {
    await getPrisma().$queryRaw`SELECT 1`
    const episodes = await db.listEpisodes()
    checks.push(
      check(
        'database',
        'Local SQLite database',
        true,
        `Connected · ${episodes.length} episode(s) loaded.`
      )
    )
  } catch (error) {
    checks.push(
      check(
        'database',
        'Local SQLite database',
        false,
        error instanceof Error ? error.message : 'Database is not ready.'
      )
    )
  }

  try {
    getSettings()
    checks.push(check('settings', 'Producer settings', true, 'Settings file is available.'))
  } catch (error) {
    checks.push(
      check(
        'settings',
        'Producer settings',
        false,
        error instanceof Error ? error.message : 'Settings could not be loaded.'
      )
    )
  }

  checks.push(
    check('export', 'Export engine', true, 'Validation and ZIP export services are registered.')
  )

  const ready = checks.every((item) => item.ok)

  return {
    ready,
    appVersion: app.getVersion(),
    checks
  }
}
