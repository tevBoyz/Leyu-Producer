import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const testUserDataDir = path.resolve('.temp-test-logger-userdata')
const { openPathMock } = vi.hoisted(() => ({
  openPathMock: vi.fn(async () => '')
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => testUserDataDir)
  },
  shell: {
    openPath: openPathMock
  }
}))

import { getLogFilePath, logError, logInfo, openLogsFolder } from './loggerService'

describe('loggerService', () => {
  beforeEach(() => {
    openPathMock.mockClear()
    if (fs.existsSync(testUserDataDir)) {
      fs.rmSync(testUserDataDir, { recursive: true, force: true })
    }
  })

  afterEach(() => {
    if (fs.existsSync(testUserDataDir)) {
      fs.rmSync(testUserDataDir, { recursive: true, force: true })
    }
  })

  it('writes logs to the Electron userData logs directory', () => {
    logInfo('app.start', 'Producer app started.')
    logError('export.failure', 'Export failed.', { code: 'EACCES' })

    const logFilePath = getLogFilePath()
    expect(logFilePath).toBe(path.join(testUserDataDir, 'logs', 'producer.log'))
    expect(fs.existsSync(logFilePath)).toBe(true)

    const logContents = fs.readFileSync(logFilePath, 'utf8')
    expect(logContents).toContain('INFO | app.start | Producer app started.')
    expect(logContents).toContain('ERROR | export.failure | Export failed.')
    expect(logContents).toContain('"code":"EACCES"')
  })

  it('opens the logs folder through the Electron shell API', async () => {
    await openLogsFolder()

    expect(openPathMock).toHaveBeenCalledWith(path.join(testUserDataDir, 'logs'))
  })
})
