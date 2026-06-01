import { StrictMode } from 'react'
import type { ProducerApi } from '../shared/producer-api'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/app.css'

function createUnavailableProducerApi(): ProducerApi {
  const error = new Error(
    'IPC unavailable. This app must run inside Electron to access the local database and file system.'
  )
  async function reject<T>(): Promise<T> {
    throw error
  }

  return {
    app: {
      getVersion: async () => '0.0.0',
      ping: async () => ({ ok: false, message: 'IPC unavailable' }),
      isPackaged: async () => false,
      getLogFilePath: async () => reject(),
      openLogsFolder: async () => reject()
    },
    episodes: {
      create: async () => reject(),
      list: async () => reject(),
      get: async () => reject(),
      update: async () => reject(),
      delete: async () => reject(),
      upsertStageConfigs: async () => reject()
    },
    questions: {
      list: async () => reject(),
      upsert: async () => reject(),
      delete: async () => reject()
    },
    pickQuestionMusicFile: async () => reject(),
    pickAnswerMusicFile: async () => reject(),
    pickImageFile: async () => reject(),
    checkFileExists: async () => reject(),
    readAudioPreview: async () => reject(),
    validateEpisode: async () => reject(),
    getImportCompatibilityPreview: async () => reject(),
    copyImportCompatibilityPreviewJson: async () => reject(),
    saveImportCompatibilityPreviewJson: async () => reject(),
    createDemoEpisode: async () => reject(),
    settings: {
      getSettings: async () => reject(),
      updateSettings: async () => reject(),
      resetSettings: async () => reject()
    },
    chooseExportDestination: async () => reject(),
    exportEpisode: async () => reject()
  }
}

console.log('[producer] renderer bootstrap, producerApi exists?', typeof (window as any).producerApi !== 'undefined')
if (typeof (window as any).producerApi === 'undefined') {
  console.warn('[producer] producerApi missing, using browser fallback')
  console.warn('[producer] renderer URL:', window.location.href)
  console.warn('[producer] renderer UA:', navigator.userAgent)
  ;(window as any).producerApi = createUnavailableProducerApi()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
