import { createHash } from 'crypto'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { getUnpackedResourcePath } from './appPaths'
import { getPrisma } from './client'
import { logError, logInfo } from '../services/loggerService'

function getMigrationsDirectory(): string {
  return getUnpackedResourcePath('prisma', 'migrations')
}

function listMigrationNames(migrationsDir: string): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
}

async function ensureMigrationsTable(): Promise<void> {
  const prisma = getPrisma()
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `)
}

async function isMigrationApplied(migrationName: string): Promise<boolean> {
  const prisma = getPrisma()
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count
    FROM "_prisma_migrations"
    WHERE "migration_name" = ${migrationName}
      AND "finished_at" IS NOT NULL
  `

  return Number(rows[0]?.count ?? 0) > 0
}

async function applyMigration(migrationName: string, sql: string): Promise<void> {
  const prisma = getPrisma()
  const checksum = createHash('sha256').update(sql).digest('hex')
  const migrationId = createHash('sha256').update(migrationName).digest('hex').slice(0, 36)

  await prisma.$executeRaw`
    INSERT INTO "_prisma_migrations" (
      "id",
      "checksum",
      "migration_name",
      "started_at",
      "applied_steps_count"
    ) VALUES (
      ${migrationId},
      ${checksum},
      ${migrationName},
      CURRENT_TIMESTAMP,
      0
    )
  `

  for (const statement of splitSqlStatements(sql)) {
    await prisma.$executeRawUnsafe(statement)
  }

  await prisma.$executeRaw`
    UPDATE "_prisma_migrations"
    SET "finished_at" = CURRENT_TIMESTAMP,
        "applied_steps_count" = 1
    WHERE "id" = ${migrationId}
  `
}

/** Apply pending Prisma migration SQL files to the runtime SQLite database. */
export async function runMigrations(): Promise<void> {
  const migrationsDir = getMigrationsDirectory()

  logInfo('database.migrate.start', 'Applying bundled SQLite migrations.', {
    migrationsDir
  })

  if (!existsSync(migrationsDir)) {
    const error = new Error(`Migrations directory not found: ${migrationsDir}`)
    logError('database.migrate.failure', 'Bundled migrations directory is missing.', {
      migrationsDir,
      error
    })
    throw error
  }

  try {
    await ensureMigrationsTable()

    const migrationNames = listMigrationNames(migrationsDir)
    let appliedCount = 0

    for (const migrationName of migrationNames) {
      if (await isMigrationApplied(migrationName)) {
        continue
      }

      const migrationSqlPath = join(migrationsDir, migrationName, 'migration.sql')
      if (!existsSync(migrationSqlPath)) {
        throw new Error(`Migration SQL file not found: ${migrationSqlPath}`)
      }

      const sql = readFileSync(migrationSqlPath, 'utf8')
      await applyMigration(migrationName, sql)
      appliedCount += 1
      logInfo('database.migrate.applied', `Applied migration ${migrationName}.`)
    }

    logInfo('database.migrate.success', 'SQLite migrations completed successfully.', {
      appliedCount,
      totalMigrations: migrationNames.length
    })
  } catch (error) {
    logError('database.migrate.failure', 'SQLite migration runner failed.', {
      migrationsDir,
      error
    })
    throw error
  }
}
