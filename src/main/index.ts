import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { connectDatabase, disconnectDatabase } from './db/client'
import { runMigrations } from './db/migrate'
import { registerIpcHandlers } from './ipc/registerHandlers'
import { ensureSettingsFile } from './services/settingsService'
import { logError, logInfo } from './services/loggerService'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'LeyuTune Producer'
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer console] (${sourceId}:${line}) ${message}`)
  })

  mainWindow.webContents.once('dom-ready', () => {
    mainWindow?.webContents
      .executeJavaScript('typeof window.producerApi !== "undefined"')
      .then((attached) => {
        console.log('[producer] preload attached?', attached)
      })
      .catch((error) => {
        console.error('[producer] preload check failed:', error)
      })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

process.on('unhandledRejection', (reason) => {
  logError('process.unhandledRejection', 'Unhandled promise rejection in main process.', {
    reason
  })
})

process.on('uncaughtException', (error) => {
  logError('process.uncaughtException', 'Uncaught exception in main process.', {
    error
  })
})

app.whenReady()
  .then(async () => {
    logInfo('app.start', 'LeyuTune Producer starting.', {
      appVersion: app.getVersion(),
      packaged: app.isPackaged
    })

    await connectDatabase()
    await runMigrations()
    ensureSettingsFile()
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error) => {
    logError('app.start.failure', 'LeyuTune Producer failed to start.', {
      error
    })
    throw error
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    void disconnectDatabase().catch((error) => {
      logError('database.disconnect.failure', 'Failed to disconnect database during window-all-closed.', {
        error
      })
    })
    app.quit()
  }
})

app.on('before-quit', () => {
  void disconnectDatabase().catch((error) => {
    logError('database.disconnect.failure', 'Failed to disconnect database during before-quit.', {
      error
    })
  })
})
