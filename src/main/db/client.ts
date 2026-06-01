import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { logError, logInfo } from '../services/loggerService'

let prisma: PrismaClient | null = null

/**
 * SQLite file under Electron userData — separate from live MySQL.
 * Prisma CLI uses DATABASE_URL from `.env` (prisma/dev.db).
 */
export function getRuntimeDatabaseUrl(): string {
  const dataDir = join(app.getPath('userData'), 'producer-data')
  mkdirSync(dataDir, { recursive: true })
  const dbPath = join(dataDir, 'producer.db')
  return `file:${dbPath}`
}

export async function connectDatabase(): Promise<PrismaClient> {
  if (prisma) return prisma

  const databaseUrl = getRuntimeDatabaseUrl()
  logInfo('database.init.start', 'Initializing SQLite runtime database.', {
    databaseUrl
  })

  try {
    process.env.DATABASE_URL = databaseUrl
    prisma = new PrismaClient()
    await prisma.$connect()
    logInfo('database.init.success', 'SQLite runtime database initialized.')
    return prisma
  } catch (error) {
    prisma = null
    logError('database.init.failure', 'Failed to initialize SQLite runtime database.', {
      databaseUrl,
      error
    })
    throw error
  }
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call connectDatabase() first.')
  }
  return prisma
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    try {
      await prisma.$disconnect()
      logInfo('database.disconnect.success', 'SQLite runtime database disconnected.')
    } catch (error) {
      logError('database.disconnect.failure', 'Failed to disconnect SQLite runtime database.', {
        error
      })
      throw error
    } finally {
      prisma = null
    }
  }
}
