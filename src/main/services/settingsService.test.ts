import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const testUserDataDir = path.resolve('.temp-test-settings-userdata')

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => testUserDataDir)
  }
}))

import {
  ensureSettingsFile,
  getSettings,
  getSettingsFileLocation,
  resetSettings,
  updateSettings
} from './settingsService'

describe('settingsService', () => {
  beforeEach(() => {
    if (fs.existsSync(testUserDataDir)) {
      fs.rmSync(testUserDataDir, { recursive: true, force: true })
    }
  })

  afterEach(() => {
    if (fs.existsSync(testUserDataDir)) {
      fs.rmSync(testUserDataDir, { recursive: true, force: true })
    }
  })

  it('creates and returns default settings in the Electron userData directory', () => {
    const settings = ensureSettingsFile()

    expect(settings.defaultAppVersion).toBe('0.1.0')
    expect(settings.defaultExportVersion).toBe('1.0.0')
    expect(fs.existsSync(getSettingsFileLocation())).toBe(true)
  })

  it('updates and persists local producer settings', () => {
    ensureSettingsFile()

    const updated = updateSettings({
      defaultExportFolder: 'C:\\Exports\\LeyuTune',
      allowExportWithWarnings: false,
      keepTemporaryExportFolder: true,
      preferredAudioExtensions: ['wav', 'mp3'],
      preferredImageExtensions: ['png']
    })

    expect(updated.defaultExportFolder).toBe('C:\\Exports\\LeyuTune')
    expect(updated.allowExportWithWarnings).toBe(false)
    expect(updated.keepTemporaryExportFolder).toBe(true)
    expect(updated.preferredAudioExtensions).toEqual(['wav', 'mp3'])
    expect(updated.preferredImageExtensions).toEqual(['png'])
    expect(getSettings().defaultExportFolder).toBe('C:\\Exports\\LeyuTune')
  })

  it('rejects invalid setting values', () => {
    expect(() =>
      updateSettings({
        defaultExportFolder: 'relative\\path'
      })
    ).toThrow('absolute path')

    expect(() =>
      updateSettings({
        preferredImageExtensions: ['gif']
      })
    ).toThrow('unsupported values')
  })

  it('resets settings back to defaults', () => {
    updateSettings({
      defaultExportFolder: 'C:\\Exports\\LeyuTune',
      keepTemporaryExportFolder: true
    })

    const reset = resetSettings()

    expect(reset.defaultExportFolder).toBe('')
    expect(reset.keepTemporaryExportFolder).toBe(false)
  })
})
