import { app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { getRuntimeDatabaseUrl } from './client'
import { logError, logInfo } from '../services/loggerService'

const execFileAsync = promisify(execFile)

/** Apply pending Prisma migrations to the runtime SQLite database. */
export async function runMigrations(): Promise<void> {
  const schemaPath = join(app.getAppPath(), 'prisma', 'schema.prisma')
  const prismaCli = join(app.getAppPath(), 'node_modules', 'prisma', 'build', 'index.js')
  const databaseUrl = getRuntimeDatabaseUrl()

  logInfo('database.migrate.start', 'Running Prisma migrations for runtime SQLite database.', {
    schemaPath
  })

  try {
    await execFileAsync(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', `--schema=${schemaPath}`],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          ELECTRON_RUN_AS_NODE: '1'
        }
      }
    )
    logInfo('database.migrate.success', 'Prisma migrations completed successfully.')
  } catch (error) {
    logError('database.migrate.failure', 'Prisma migrate deploy failed.', {
      schemaPath,
      databaseUrl,
      error
    })
    throw error
  }
}
