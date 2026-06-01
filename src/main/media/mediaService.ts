import { dialog, BrowserWindow } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { extname } from 'path'
import {
  SUPPORTED_ANSWER_AUDIO_EXTENSIONS,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_QUESTION_AUDIO_EXTENSIONS
} from '../../shared/constants'
import type {
  AudioPreviewPayload,
  FileExistsResult,
  MediaPickResult
} from '../../shared/media-types'
import { logError } from '../services/loggerService'

const AUDIO_EXTENSIONS = [...SUPPORTED_QUESTION_AUDIO_EXTENSIONS] as string[]
const IMAGE_EXTENSIONS = [...SUPPORTED_IMAGE_EXTENSIONS] as string[]
const AUDIO_MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg'
}

function getParentWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? undefined
}

function extensionOf(filePath: string): string {
  return extname(filePath).toLowerCase().replace(/^\./, '')
}

function validateExtension(
  filePath: string,
  allowed: readonly string[]
): { ok: true } | { ok: false; error: string } {
  const ext = extensionOf(filePath)
  if (!ext || !allowed.includes(ext)) {
    return {
      ok: false,
      error: `Unsupported file type ".${ext || '?'}". Allowed: ${allowed.map((e) => `.${e}`).join(', ')}`
    }
  }
  return { ok: true }
}

function validatePickedFile(
  filePath: string,
  allowed: readonly string[]
): MediaPickResult {
  const extCheck = validateExtension(filePath, allowed)
  if (!extCheck.ok) {
    return { canceled: false, error: extCheck.error }
  }
  if (!existsSync(filePath)) {
    return { canceled: false, error: 'Selected file was not found on disk.' }
  }
  return { canceled: false, path: filePath }
}

async function pickFile(
  title: string,
  extensions: string[]
): Promise<MediaPickResult> {
  try {
    const options = {
      title,
      properties: ['openFile'] as ('openFile')[],
      filters: [{ name: 'Files', extensions }]
    }
    const parent = getParentWindow()
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    return validatePickedFile(result.filePaths[0], extensions)
  } catch (error) {
    logError('filePicker.error', `File picker failed for "${title}".`, {
      title,
      extensions,
      error
    })
    throw new Error(`Failed to open the file picker for "${title}".`)
  }
}

export async function pickQuestionMusicFile(): Promise<MediaPickResult> {
  return pickFile('Select question music', AUDIO_EXTENSIONS)
}

export async function pickAnswerMusicFile(): Promise<MediaPickResult> {
  return pickFile('Select answer reveal music', AUDIO_EXTENSIONS)
}

export async function pickImageFile(): Promise<MediaPickResult> {
  return pickFile('Select preview image', IMAGE_EXTENSIONS)
}

export function checkFileExists(filePath: string): FileExistsResult {
  try {
    const trimmed = filePath?.trim() ?? ''
    if (!trimmed) {
      return { exists: false }
    }

    const ext = extensionOf(trimmed)
    const isImage = IMAGE_EXTENSIONS.includes(ext)
    const isAudio = AUDIO_EXTENSIONS.includes(ext)

    if (!isImage && !isAudio) {
      return {
        exists: false,
        error: `Unsupported file type ".${ext || '?'}".`
      }
    }

    return { exists: existsSync(trimmed) }
  } catch (error) {
    logError('media.checkFileExists.failure', 'Failed to check media file existence.', {
      filePath,
      error
    })
    throw new Error('Failed to verify the selected media file.')
  }
}

export function readAudioPreview(filePath: string): AudioPreviewPayload {
  try {
    const trimmed = filePath?.trim() ?? ''
    if (!trimmed) {
      throw new Error('Audio preview path is required.')
    }

    const extCheck = validateExtension(trimmed, AUDIO_EXTENSIONS)
    if (!extCheck.ok) {
      throw new Error(extCheck.error)
    }

    if (!existsSync(trimmed)) {
      throw new Error('Selected audio file was not found on disk.')
    }

    const ext = extensionOf(trimmed)
    const mimeType = AUDIO_MIME_TYPES[ext] || 'audio/mpeg'
    const bytes = Uint8Array.from(readFileSync(trimmed))

    return {
      mimeType,
      bytes
    }
  } catch (error) {
    logError('media.audioPreview.failure', 'Failed to read local audio preview payload.', {
      filePath,
      error
    })
    throw error instanceof Error
      ? error
      : new Error('Failed to prepare local audio preview.')
  }
}
