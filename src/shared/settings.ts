import {
  APP_VERSION,
  EXPORT_VERSION,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_QUESTION_AUDIO_EXTENSIONS
} from './constants'

export interface ProducerAppSettings {
  schemaVersion: 1
  defaultExportFolder: string
  defaultAppVersion: string
  defaultExportVersion: string
  allowExportWithWarnings: boolean
  keepTemporaryExportFolder: boolean
  preferredAudioExtensions: string[]
  preferredImageExtensions: string[]
}

export interface UpdateProducerAppSettingsInput {
  defaultExportFolder?: string
  defaultAppVersion?: string
  defaultExportVersion?: string
  allowExportWithWarnings?: boolean
  keepTemporaryExportFolder?: boolean
  preferredAudioExtensions?: string[]
  preferredImageExtensions?: string[]
}

export const DEFAULT_PRODUCER_APP_SETTINGS: ProducerAppSettings = {
  schemaVersion: 1,
  defaultExportFolder: '',
  defaultAppVersion: APP_VERSION,
  defaultExportVersion: EXPORT_VERSION,
  allowExportWithWarnings: true,
  keepTemporaryExportFolder: false,
  preferredAudioExtensions: [...SUPPORTED_QUESTION_AUDIO_EXTENSIONS],
  preferredImageExtensions: [...SUPPORTED_IMAGE_EXTENSIONS]
}
