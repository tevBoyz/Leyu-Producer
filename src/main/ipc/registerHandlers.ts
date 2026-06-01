import { app } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  CreateEpisodeInput,
  UpdateEpisodeInput,
  UpsertQuestionInput,
  UpsertStageConfigInput
} from '../../shared/db-inputs'
import type { UpdateProducerAppSettingsInput } from '../../shared/settings'
import * as db from '../db/databaseService'
import * as media from '../media/mediaService'
import * as validation from '../validation/validationService'
import * as importCompatibility from '../services/importCompatibilityService'
import * as developerService from '../services/developerService'
import * as exportService from '../services/exportService'
import { handleIpc } from './ipcHandler'
import { getLogFilePath, openLogsFolder } from '../services/loggerService'
import * as settingsService from '../services/settingsService'

/** Register all IPC handlers for the main process. */
export function registerIpcHandlers(): void {
  handleIpc(IPC_CHANNELS.app.getVersion, () => app.getVersion())
  handleIpc(IPC_CHANNELS.app.ping, () => ({
    ok: true,
    message: 'LeyuTune Producer main process is reachable.'
  }))
  handleIpc(IPC_CHANNELS.app.isPackaged, () => app.isPackaged)
  handleIpc(IPC_CHANNELS.app.getLogFilePath, () => getLogFilePath())
  handleIpc(IPC_CHANNELS.app.openLogsFolder, () => openLogsFolder())

  handleIpc(IPC_CHANNELS.episodes.create, (input: CreateEpisodeInput) => db.createEpisode(input))
  handleIpc(IPC_CHANNELS.episodes.list, () => db.listEpisodes())
  handleIpc(IPC_CHANNELS.episodes.get, (id: string) => db.getEpisode(id))
  handleIpc(IPC_CHANNELS.episodes.update, (input: UpdateEpisodeInput) => db.updateEpisode(input))
  handleIpc(IPC_CHANNELS.episodes.delete, (id: string) => db.deleteEpisode(id))
  handleIpc(IPC_CHANNELS.episodes.upsertStageConfigs, (episodeId: string, configs: UpsertStageConfigInput[]) =>
    db.upsertStageConfigs(episodeId, configs)
  )

  handleIpc(IPC_CHANNELS.questions.list, (episodeId: string) => db.listQuestions(episodeId))
  handleIpc(IPC_CHANNELS.questions.upsert, (input: UpsertQuestionInput) => db.upsertQuestion(input))
  handleIpc(IPC_CHANNELS.questions.delete, (id: string) => db.deleteQuestion(id))

  handleIpc(IPC_CHANNELS.media.pickQuestionMusic, () => media.pickQuestionMusicFile())
  handleIpc(IPC_CHANNELS.media.pickAnswerMusic, () => media.pickAnswerMusicFile())
  handleIpc(IPC_CHANNELS.media.pickImage, () => media.pickImageFile())
  handleIpc(IPC_CHANNELS.media.checkFileExists, (filePath: string) =>
    media.checkFileExists(filePath)
  )
  handleIpc(IPC_CHANNELS.media.readAudioPreview, (filePath: string) =>
    media.readAudioPreview(filePath)
  )

  handleIpc(IPC_CHANNELS.validation.validateEpisode, (episodeId: string) =>
    validation.validateEpisode(episodeId)
  )

  handleIpc(IPC_CHANNELS.compatibility.getPreview, (episodeId: string) =>
    importCompatibility.getImportCompatibilityPreview(episodeId)
  )
  handleIpc(IPC_CHANNELS.compatibility.copyPreviewJson, (jsonText: string) =>
    importCompatibility.copyImportCompatibilityPreviewJson(jsonText)
  )
  handleIpc(
    IPC_CHANNELS.compatibility.savePreviewJson,
    (jsonText: string, defaultName?: string) =>
      importCompatibility.saveImportCompatibilityPreviewJson(jsonText, defaultName)
  )

  handleIpc(IPC_CHANNELS.developer.createDemoEpisode, () =>
    developerService.createDemoEpisode()
  )

  handleIpc(IPC_CHANNELS.settings.get, () => settingsService.getSettings())
  handleIpc(IPC_CHANNELS.settings.update, (input: UpdateProducerAppSettingsInput) =>
    settingsService.updateSettings(input)
  )
  handleIpc(IPC_CHANNELS.settings.reset, () => settingsService.resetSettings())

  handleIpc(IPC_CHANNELS.export.chooseDestination, (defaultName?: string) =>
    exportService.chooseExportDestination(defaultName)
  )

  handleIpc(IPC_CHANNELS.export.exportEpisode, (episodeId: string, destinationPath: string) =>
    exportService.exportEpisode(episodeId, destinationPath)
  )
}
