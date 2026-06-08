import { app, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

type LogLevel = 'INFO' | 'WARN' | 'ERROR'

function getLogsDirectoryPath(): string {
  return path.join(app.getPath('userData'), 'logs')
}

export function getLogFilePath(): string {
  return path.join(getLogsDirectoryPath(), 'producer.log')
}

function ensureLogsDirectory(): void {
  fs.mkdirSync(getLogsDirectoryPath(), { recursive: true })
}

function safeSerializeMeta(meta: unknown): string {
  try {
    return JSON.stringify(
      meta,
      (_key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          }
        }

        return value
      }
    )
  } catch {
    return JSON.stringify({ error: 'Failed to serialize log metadata.' })
  }
}

function canWriteToConsole(): boolean {
  if (process.platform === 'win32') {
    return Boolean(process.stdout.isTTY)
  }

  return true
}

function writeLog(level: LogLevel, event: string, message: string, meta?: unknown): void {
  const line = [
    new Date().toISOString(),
    level,
    event,
    message,
    meta === undefined ? '' : safeSerializeMeta(meta)
  ]
    .filter(Boolean)
    .join(' | ')

  try {
    ensureLogsDirectory()
    fs.appendFileSync(getLogFilePath(), `${line}\n`, 'utf8')
  } catch (error) {
    if (canWriteToConsole()) {
      console.error('[producer:logger] failed to write log file', error)
    }
  }

  if (!canWriteToConsole()) {
    return
  }

  if (level === 'ERROR') {
    console.error(line)
  } else if (level === 'WARN') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export function logInfo(event: string, message: string, meta?: unknown): void {
  writeLog('INFO', event, message, meta)
}

export function logWarn(event: string, message: string, meta?: unknown): void {
  writeLog('WARN', event, message, meta)
}

export function logError(event: string, message: string, meta?: unknown): void {
  writeLog('ERROR', event, message, meta)
}

export async function openLogsFolder(): Promise<void> {
  ensureLogsDirectory()
  const openResult = await shell.openPath(getLogsDirectoryPath())
  if (openResult) {
    throw new Error(openResult)
  }
}
