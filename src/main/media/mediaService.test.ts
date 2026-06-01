import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn()
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn(() => undefined)
  }
}))

import { readAudioPreview } from './mediaService'

const testRootDir = path.resolve('.temp-test-media-service')
const audioFilePath = path.join(testRootDir, 'preview.mp3')

describe('readAudioPreview', () => {
  beforeEach(() => {
    fs.mkdirSync(testRootDir, { recursive: true })
    fs.writeFileSync(audioFilePath, 'demo-audio', 'utf8')
  })

  afterEach(() => {
    if (fs.existsSync(testRootDir)) {
      fs.rmSync(testRootDir, { recursive: true, force: true })
    }
  })

  it('returns bytes and mime type for a supported local audio file', () => {
    const preview = readAudioPreview(audioFilePath)

    expect(preview.mimeType).toBe('audio/mpeg')
    expect(preview.bytes).toBeInstanceOf(Uint8Array)
    expect(Buffer.from(preview.bytes).toString('utf8')).toBe('demo-audio')
  })

  it('rejects unsupported audio preview file types', () => {
    const invalidPath = path.join(testRootDir, 'preview.txt')
    fs.writeFileSync(invalidPath, 'not-audio', 'utf8')

    expect(() => readAudioPreview(invalidPath)).toThrow('Unsupported file type')
  })
})
