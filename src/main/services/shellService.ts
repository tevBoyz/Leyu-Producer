import { shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/** Reveal an exported ZIP in the system file manager (Explorer on Windows). */
export async function showExportInFolder(zipPath: string): Promise<void> {
  const trimmed = zipPath.trim()
  if (!trimmed) {
    throw new Error('Export path is empty.')
  }

  if (!path.isAbsolute(trimmed)) {
    throw new Error('Export path must be absolute.')
  }

  if (!fs.existsSync(trimmed)) {
    throw new Error(`Export file was not found: ${trimmed}`)
  }

  shell.showItemInFolder(trimmed)
}

/** Open the folder that contains the exported ZIP. */
export async function openExportFolder(zipPath: string): Promise<void> {
  const trimmed = zipPath.trim()
  const folderPath = path.dirname(trimmed)

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Export folder was not found: ${folderPath}`)
  }

  const result = await shell.openPath(folderPath)
  if (result) {
    throw new Error(result)
  }
}
