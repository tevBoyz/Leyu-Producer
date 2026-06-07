import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { IpcResponse } from '../shared/ipc-response'
import type { ExportProgressEvent } from '../shared/export-progress'
import type { ProducerApi } from '../shared/producer-api'
import type { ValidationResult } from '../shared/validation'

class ProducerIpcError extends Error {
  validationResult?: ValidationResult

  constructor(message: string, validationResult?: ValidationResult) {
    super(message)
    this.name = 'ProducerIpcError'
    this.validationResult = validationResult
  }
}

async function invokeIpc<T>(channel: string, ...args: unknown[]): Promise<T> {
  const response = await ipcRenderer.invoke(channel, ...args) as IpcResponse<T>

  if (!response.success) {
    throw new ProducerIpcError(response.error, response.validationResult)
  }

  return response.data
}

console.log('[producer] preload loaded')

const producerApi: ProducerApi = {
  app: {
    getVersion: () => invokeIpc<string>(IPC_CHANNELS.app.getVersion),
    ping: () => invokeIpc<{ ok: boolean; message: string }>(IPC_CHANNELS.app.ping),
    isPackaged: () => invokeIpc<boolean>(IPC_CHANNELS.app.isPackaged),
    getLogFilePath: () => invokeIpc<string>(IPC_CHANNELS.app.getLogFilePath),
    openLogsFolder: () => invokeIpc<void>(IPC_CHANNELS.app.openLogsFolder),
    getStartupStatus: () => invokeIpc(IPC_CHANNELS.app.getStartupStatus)
  },

  window: {
    isFullScreen: () => invokeIpc<boolean>(IPC_CHANNELS.window.isFullScreen),
    toggleFullScreen: () => invokeIpc<boolean>(IPC_CHANNELS.window.toggleFullScreen),
    subscribeFullScreenChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, isFullScreen: boolean) => {
        listener(isFullScreen)
      }
      ipcRenderer.on(IPC_CHANNELS.window.fullScreenChanged, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.window.fullScreenChanged, handler)
      }
    }
  },

  episodes: {
    create: (input) => invokeIpc(IPC_CHANNELS.episodes.create, input),
    list: () => invokeIpc(IPC_CHANNELS.episodes.list),
    get: (id) => invokeIpc(IPC_CHANNELS.episodes.get, id),
    update: (input) => invokeIpc(IPC_CHANNELS.episodes.update, input),
    delete: (id) => invokeIpc(IPC_CHANNELS.episodes.delete, id),
    upsertStageConfigs: (episodeId, configs) =>
      invokeIpc(IPC_CHANNELS.episodes.upsertStageConfigs, episodeId, configs)
  },

  questions: {
    list: (episodeId) => invokeIpc(IPC_CHANNELS.questions.list, episodeId),
    upsert: (input) => invokeIpc(IPC_CHANNELS.questions.upsert, input),
    delete: (id) => invokeIpc(IPC_CHANNELS.questions.delete, id)
  },

  pickQuestionMusicFile: () => invokeIpc(IPC_CHANNELS.media.pickQuestionMusic),
  pickAnswerMusicFile: () => invokeIpc(IPC_CHANNELS.media.pickAnswerMusic),
  pickImageFile: () => invokeIpc(IPC_CHANNELS.media.pickImage),
  checkFileExists: (filePath) => invokeIpc(IPC_CHANNELS.media.checkFileExists, filePath),
  readAudioPreview: (filePath) => invokeIpc(IPC_CHANNELS.media.readAudioPreview, filePath),

  validateEpisode: (episodeId) => invokeIpc(IPC_CHANNELS.validation.validateEpisode, episodeId),

  getImportCompatibilityPreview: (episodeId) =>
    invokeIpc(IPC_CHANNELS.compatibility.getPreview, episodeId),

  copyImportCompatibilityPreviewJson: (jsonText) =>
    invokeIpc(IPC_CHANNELS.compatibility.copyPreviewJson, jsonText),

  saveImportCompatibilityPreviewJson: (jsonText, defaultName) =>
    invokeIpc(IPC_CHANNELS.compatibility.savePreviewJson, jsonText, defaultName),

  createDemoEpisode: () => invokeIpc(IPC_CHANNELS.developer.createDemoEpisode),

  settings: {
    getSettings: () => invokeIpc(IPC_CHANNELS.settings.get),
    updateSettings: (input) => invokeIpc(IPC_CHANNELS.settings.update, input),
    resetSettings: () => invokeIpc(IPC_CHANNELS.settings.reset)
  },

  chooseExportDestination: (defaultName) =>
    invokeIpc(IPC_CHANNELS.export.chooseDestination, defaultName),

  exportEpisode: (episodeId, destinationPath) =>
    invokeIpc(IPC_CHANNELS.export.exportEpisode, episodeId, destinationPath),

  subscribeExportProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ExportProgressEvent) => {
      listener(progress)
    }
    ipcRenderer.on(IPC_CHANNELS.export.progress, handler)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.export.progress, handler)
    }
  },

  showExportInFolder: (zipPath) => invokeIpc<void>(IPC_CHANNELS.export.showInFolder, zipPath),

  openExportFolder: (zipPath) => invokeIpc<void>(IPC_CHANNELS.export.openFolder, zipPath)
}

contextBridge.exposeInMainWorld('producerApi', producerApi)
