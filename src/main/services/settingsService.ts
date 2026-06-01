import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {
  DEFAULT_PRODUCER_APP_SETTINGS,
  type ProducerAppSettings,
  type UpdateProducerAppSettingsInput
} from '../../shared/settings'
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_QUESTION_AUDIO_EXTENSIONS
} from '../../shared/constants'

const SETTINGS_FILE_NAME = 'producer-settings.json'

function getSettingsFilePath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE_NAME)
}

function normalizeExtensionList(
  values: string[],
  supportedValues: readonly string[],
  fieldName: string
): string[] {
  const normalized = values.map((value) => value.trim().toLowerCase()).filter(Boolean)
  const unique = Array.from(new Set(normalized))

  if (unique.length === 0) {
    throw new Error(`${fieldName} must include at least one extension.`)
  }

  const invalidValues = unique.filter((value) => !supportedValues.includes(value))
  if (invalidValues.length > 0) {
    throw new Error(
      `${fieldName} contains unsupported values: ${invalidValues.join(', ')}.`
    )
  }

  return unique
}

function validateAndNormalizeSettings(
  input: UpdateProducerAppSettingsInput
): UpdateProducerAppSettingsInput {
  const normalized: UpdateProducerAppSettingsInput = {}

  if (input.defaultExportFolder !== undefined) {
    const value = input.defaultExportFolder.trim()
    if (value !== '' && !path.isAbsolute(value)) {
      throw new Error('Default export folder must be an absolute path or empty.')
    }
    normalized.defaultExportFolder = value
  }

  if (input.defaultAppVersion !== undefined) {
    const value = input.defaultAppVersion.trim()
    if (!value) {
      throw new Error('Default app version is required.')
    }
    normalized.defaultAppVersion = value
  }

  if (input.defaultExportVersion !== undefined) {
    const value = input.defaultExportVersion.trim()
    if (!value) {
      throw new Error('Default export version is required.')
    }
    normalized.defaultExportVersion = value
  }

  if (input.allowExportWithWarnings !== undefined) {
    normalized.allowExportWithWarnings = Boolean(input.allowExportWithWarnings)
  }

  if (input.keepTemporaryExportFolder !== undefined) {
    normalized.keepTemporaryExportFolder = Boolean(input.keepTemporaryExportFolder)
  }

  if (input.preferredAudioExtensions !== undefined) {
    normalized.preferredAudioExtensions = normalizeExtensionList(
      input.preferredAudioExtensions,
      SUPPORTED_QUESTION_AUDIO_EXTENSIONS,
      'Preferred audio extensions'
    )
  }

  if (input.preferredImageExtensions !== undefined) {
    normalized.preferredImageExtensions = normalizeExtensionList(
      input.preferredImageExtensions,
      SUPPORTED_IMAGE_EXTENSIONS,
      'Preferred image extensions'
    )
  }

  return normalized
}

function mergeWithDefaults(
  rawSettings: Partial<ProducerAppSettings> | null | undefined
): ProducerAppSettings {
  return {
    ...DEFAULT_PRODUCER_APP_SETTINGS,
    ...rawSettings,
    schemaVersion: 1,
    preferredAudioExtensions:
      rawSettings?.preferredAudioExtensions?.length
        ? [...rawSettings.preferredAudioExtensions]
        : [...DEFAULT_PRODUCER_APP_SETTINGS.preferredAudioExtensions],
    preferredImageExtensions:
      rawSettings?.preferredImageExtensions?.length
        ? [...rawSettings.preferredImageExtensions]
        : [...DEFAULT_PRODUCER_APP_SETTINGS.preferredImageExtensions]
  }
}

function writeSettingsFile(settings: ProducerAppSettings): void {
  const filePath = getSettingsFilePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8')
}

export function ensureSettingsFile(): ProducerAppSettings {
  const settings = getSettings()
  writeSettingsFile(settings)
  return settings
}

export function getSettingsFileLocation(): string {
  return getSettingsFilePath()
}

export function getSettings(): ProducerAppSettings {
  const filePath = getSettingsFilePath()

  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_PRODUCER_APP_SETTINGS }
  }

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(fileContents) as Partial<ProducerAppSettings>
    const merged = mergeWithDefaults(parsed)

    return {
      ...merged,
      ...validateAndNormalizeSettings(merged)
    } as ProducerAppSettings
  } catch {
    return { ...DEFAULT_PRODUCER_APP_SETTINGS }
  }
}

export function updateSettings(
  updates: UpdateProducerAppSettingsInput
): ProducerAppSettings {
  const current = getSettings()
  const normalizedUpdates = validateAndNormalizeSettings(updates)
  const nextSettings = mergeWithDefaults({
    ...current,
    ...normalizedUpdates
  })

  writeSettingsFile(nextSettings)
  return nextSettings
}

export function resetSettings(): ProducerAppSettings {
  const defaults = { ...DEFAULT_PRODUCER_APP_SETTINGS }
  writeSettingsFile(defaults)
  return defaults
}
