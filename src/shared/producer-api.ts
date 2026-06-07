import type {

  CreateEpisodeInput,

  EpisodeDetail,

  UpdateEpisodeInput,

  UpsertQuestionInput,

  UpsertStageConfigInput

} from './db-inputs'

import type { DemoEpisodeResult } from './developer'
import type { Episode } from './episode'
import type { ExportEpisodeResult } from './export'
import type { ImportCompatibilityPreview } from './import-compatibility'

import type { AudioPreviewPayload, FileExistsResult, MediaPickResult } from './media-types'

import type { Question } from './question'
import type {
  ProducerAppSettings,
  UpdateProducerAppSettingsInput
} from './settings'

import type { StageConfig } from './stage-config'
import type { ExportProgressEvent } from './export-progress'
import type { StartupStatus } from './startup'
import type { ValidationResult } from './validation'



/**

 * Public renderer API exposed as `window.producerApi`.

 * Database access is main-process only — never import Prisma in the renderer.

 */

export interface ProducerApi {

  app: {

    getVersion: () => Promise<string>

    ping: () => Promise<{ ok: boolean; message: string }>

    isPackaged: () => Promise<boolean>

    getLogFilePath: () => Promise<string>

    openLogsFolder: () => Promise<void>

    getStartupStatus: () => Promise<StartupStatus>

  }

  window: {
    isFullScreen: () => Promise<boolean>
    toggleFullScreen: () => Promise<boolean>
    subscribeFullScreenChanged: (listener: (isFullScreen: boolean) => void) => () => void
  }

  episodes: {

    create: (input: CreateEpisodeInput) => Promise<EpisodeDetail>

    list: () => Promise<Episode[]>

    get: (id: string) => Promise<EpisodeDetail | null>

    update: (input: UpdateEpisodeInput) => Promise<Episode>

    delete: (id: string) => Promise<void>

    upsertStageConfigs: (

      episodeId: string,

      configs: UpsertStageConfigInput[]

    ) => Promise<StageConfig[]>

  }

  questions: {

    list: (episodeId: string) => Promise<Question[]>

    upsert: (input: UpsertQuestionInput) => Promise<Question>

    delete: (id: string) => Promise<void>

  }

  /** Native file picker — question stem audio (.mp3, .wav, .ogg, .m4a). */

  pickQuestionMusicFile: () => Promise<MediaPickResult>

  /** Native file picker — answer reveal audio. */

  pickAnswerMusicFile: () => Promise<MediaPickResult>

  /** Native file picker — preview image (.jpg, .jpeg, .png, .webp). */

  pickImageFile: () => Promise<MediaPickResult>

  /** Check path exists on disk (main process only). */

  checkFileExists: (path: string) => Promise<FileExistsResult>

  /** Read local audio into a renderer-safe preview payload. */

  readAudioPreview: (path: string) => Promise<AudioPreviewPayload>

  /** Full episode validation (DB + filesystem). Export will require isValid. */
  validateEpisode: (episodeId: string) => Promise<ValidationResult>

  /** Generate an in-memory preview of legacy-compatible question rows. */
  getImportCompatibilityPreview: (episodeId: string) => Promise<ImportCompatibilityPreview>

  /** Copy the current JSON preview to the OS clipboard. */
  copyImportCompatibilityPreviewJson: (jsonText: string) => Promise<void>

  /** Save the current JSON preview to a local debug file. */
  saveImportCompatibilityPreviewJson: (
    jsonText: string,
    defaultName?: string
  ) => Promise<string | null>

  /** Developer-only helper for generating demo seed data. */
  createDemoEpisode: () => Promise<DemoEpisodeResult>

  settings: {
    getSettings: () => Promise<ProducerAppSettings>
    updateSettings: (
      input: UpdateProducerAppSettingsInput
    ) => Promise<ProducerAppSettings>
    resetSettings: () => Promise<ProducerAppSettings>
  }

  /** Select where to save the exported ZIP. */
  chooseExportDestination: (defaultName?: string) => Promise<string | null>

  /** Perform full episode export (validates, packages, and zips it). */
  exportEpisode: (
    episodeId: string,
    destinationPath: string
  ) => Promise<ExportEpisodeResult>

  /** Subscribe to export progress events from the main process. Returns an unsubscribe function. */
  subscribeExportProgress: (
    listener: (progress: ExportProgressEvent) => void
  ) => () => void

  /** Reveal the exported ZIP in the system file manager. */
  showExportInFolder: (zipPath: string) => Promise<void>

  /** Open the folder containing the exported ZIP. */
  openExportFolder: (zipPath: string) => Promise<void>
}


