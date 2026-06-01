import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import AdmZip from 'adm-zip'
import { exportEpisode } from './exportService'
import * as db from '../db/databaseService'
import * as validation from '../validation/validationService'
import * as settingsService from './settingsService'

vi.mock('../db/databaseService', () => ({
  getEpisode: vi.fn(),
  listQuestions: vi.fn()
}))

vi.mock('../validation/validationService', () => ({
  validateEpisode: vi.fn()
}))

vi.mock('./settingsService', () => ({
  getSettings: vi.fn(() => ({
    schemaVersion: 1,
    defaultExportFolder: '',
    defaultAppVersion: '0.1.0',
    defaultExportVersion: '1.0.0',
    allowExportWithWarnings: true,
    keepTemporaryExportFolder: false,
    preferredAudioExtensions: ['mp3', 'wav', 'm4a', 'ogg'],
    preferredImageExtensions: ['jpg', 'jpeg', 'png', 'webp']
  }))
}))

const testRootDir = path.resolve('.temp-test-export-service')
const sourceMediaDir = path.join(testRootDir, 'source-media')
const exportOutputDir = path.join(testRootDir, 'exports')
const existingQuestionAudio = path.join(sourceMediaDir, 'question-source.mp3')
const existingAnswerAudio = path.join(sourceMediaDir, 'answer-source.wav')
const existingImage = path.join(sourceMediaDir, 'image-source.jpg')

function createEpisodeDetail(episodeId: string, slug: string) {
  return {
    episode: {
      id: episodeId,
      title: 'Ultimate Quiz',
      slug,
      description: 'Mock description',
      producerName: 'John Producer',
      appVersion: '0.1.0',
      exportVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    stageConfigs: [
      {
        id: 'sc-1',
        episodeId,
        stageNo: 1,
        label: 'Stage 1',
        questionCount: 1,
        sortOrder: 1
      }
    ]
  }
}

function createQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q-1',
    episodeId: 'ep-1',
    stageNo: 1,
    questionNo: 1,
    choiceOne: 'A',
    choiceTwo: 'B',
    choiceThree: 'C',
    choiceFour: 'D',
    actualAnswer: 'A',
    point: 100,
    category: 'General',
    questionType: 'normal',
    questionMusicPath: existingQuestionAudio,
    answerMusicPath: existingAnswerAudio,
    imagePath: existingImage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

function createValidationResult(
  episodeId: string,
  slug: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      episodeId,
      episodeTitle: 'Ultimate Quiz',
      episodeSlug: slug,
      totalQuestions: 1,
      totalErrors: 0,
      totalWarnings: 0,
      stages: []
    },
    ...overrides
  }
}

function assertRelativeZipPath(relativePath: string): void {
  expect(relativePath).not.toContain('\\')
  expect(relativePath.startsWith('/')).toBe(false)
  expect(relativePath).not.toMatch(/^[A-Za-z]:\//)
}

describe('exportEpisode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(settingsService.getSettings).mockReturnValue({
      schemaVersion: 1,
      defaultExportFolder: '',
      defaultAppVersion: '0.1.0',
      defaultExportVersion: '1.0.0',
      allowExportWithWarnings: true,
      keepTemporaryExportFolder: false,
      preferredAudioExtensions: ['mp3', 'wav', 'm4a', 'ogg'],
      preferredImageExtensions: ['jpg', 'jpeg', 'png', 'webp']
    })
    fs.mkdirSync(sourceMediaDir, { recursive: true })
    fs.mkdirSync(exportOutputDir, { recursive: true })
    fs.writeFileSync(existingQuestionAudio, 'dummy question audio', 'utf8')
    fs.writeFileSync(existingAnswerAudio, 'dummy answer audio', 'utf8')
    fs.writeFileSync(existingImage, 'dummy image content', 'utf8')
  })

  afterEach(() => {
    if (fs.existsSync(testRootDir)) {
      fs.rmSync(testRootDir, { recursive: true, force: true })
    }
  })

  it('creates the required zip package with relative JSON paths and copied media files', async () => {
    vi.mocked(db.getEpisode).mockResolvedValue(createEpisodeDetail('ep-1', 'ultimate-quiz') as never)
    vi.mocked(db.listQuestions).mockResolvedValue([createQuestion()] as never)
    vi.mocked(validation.validateEpisode).mockResolvedValue(
      createValidationResult('ep-1', 'ultimate-quiz', {
        warnings: [
          {
            severity: 'warning',
            code: 'ZERO_POINT',
            message: 'Money amount is 0.',
            stageNo: 1,
            questionNo: 1,
            field: 'point'
          }
        ],
        summary: {
          episodeId: 'ep-1',
          episodeTitle: 'Ultimate Quiz',
          episodeSlug: 'ultimate-quiz',
          totalQuestions: 1,
          totalErrors: 0,
          totalWarnings: 1,
          stages: []
        }
      }) as never
    )

    const result = await exportEpisode('ep-1', exportOutputDir)
    const expectedZipPath = path.join(exportOutputDir, 'LeyuTune_Episode_ultimate-quiz.zip')

    expect(result.success).toBe(true)
    expect(result.zipPath).toBe(expectedZipPath)
    expect(fs.existsSync(expectedZipPath)).toBe(true)

    const zip = new AdmZip(expectedZipPath)
    const entryNames = zip.getEntries().map((entry) => entry.entryName)

    expect(entryNames).toContain('manifest.json')
    expect(entryNames).toContain('db/questions.json')
    expect(entryNames).toContain('music/questions/stage1_q001.mp3')
    expect(entryNames).toContain('music/answers/stage1_q001_answer.wav')
    expect(entryNames).toContain('images/stage1_q001.jpg')

    const manifestContent = zip.readAsText('manifest.json')
    const questionsContent = zip.readAsText('db/questions.json')
    const manifest = JSON.parse(manifestContent)
    const questions = JSON.parse(questionsContent)

    expect(manifestContent).toBe(JSON.stringify(manifest, null, 2))
    expect(questionsContent).toBe(JSON.stringify(questions, null, 2))

    expect(Array.isArray(questions)).toBe(true)
    expect(questions[0].asked_flag).toBe(0)
    assertRelativeZipPath(questions[0].url_question)
    assertRelativeZipPath(questions[0].url_answer)
    assertRelativeZipPath(questions[0].url_picture)
    expect(questions[0].url_question).toBe('music/questions/stage1_q001.mp3')
    expect(questions[0].url_answer).toBe('music/answers/stage1_q001_answer.wav')
    expect(questions[0].url_picture).toBe('images/stage1_q001.jpg')

    const serializedManifest = JSON.stringify(manifest)
    expect(serializedManifest).not.toContain(sourceMediaDir.replace(/\\/g, '/'))
    expect(serializedManifest).not.toContain(existingQuestionAudio)
    expect(serializedManifest).not.toContain(existingAnswerAudio)
    expect(serializedManifest).not.toContain(existingImage)
    expect(serializedManifest).not.toContain('C:\\')

    for (const mediaFile of manifest.mediaFiles) {
      assertRelativeZipPath(mediaFile.relativePath)
    }

    const tempExportFoldersExist = fs
      .readdirSync(process.cwd())
      .some((item) => item.startsWith('.temp-export-'))
    expect(tempExportFoldersExist).toBe(false)
  })

  it('blocks export and returns the validation result when the episode has validation errors', async () => {
    const blockedValidation = {
      isValid: false,
      errors: [
        {
          severity: 'error',
          code: 'MISSING_CHOICE',
          message: 'Choice (choiceOne) is required.',
          stageNo: 1,
          questionNo: 1,
          field: 'choiceOne'
        }
      ],
      warnings: [],
      summary: {
        episodeId: 'ep-2',
        episodeTitle: 'Invalid Show',
        episodeSlug: 'invalid-show',
        totalQuestions: 0,
        totalErrors: 1,
        totalWarnings: 0,
        stages: []
      }
    }

    vi.mocked(db.getEpisode).mockResolvedValue(createEpisodeDetail('ep-2', 'invalid-show') as never)
    vi.mocked(validation.validateEpisode).mockResolvedValue(blockedValidation as never)

    const result = await exportEpisode('ep-2', exportOutputDir)

    expect(result.success).toBe(false)
    expect(result.error).toContain('validation errors')
    expect(result.validation).toEqual(blockedValidation)
    expect(fs.existsSync(path.join(exportOutputDir, 'LeyuTune_Episode_invalid-show.zip'))).toBe(false)
  })

  it('blocks export when warnings exist and settings disallow warning exports', async () => {
    vi.mocked(db.getEpisode).mockResolvedValue(createEpisodeDetail('ep-3', 'warning-blocked') as never)
    vi.mocked(validation.validateEpisode).mockResolvedValue(
      createValidationResult('ep-3', 'warning-blocked', {
        warnings: [
          {
            severity: 'warning',
            code: 'ZERO_POINT',
            message: 'Money amount is 0.',
            stageNo: 1,
            questionNo: 1,
            field: 'point'
          }
        ],
        summary: {
          episodeId: 'ep-3',
          episodeTitle: 'Ultimate Quiz',
          episodeSlug: 'warning-blocked',
          totalQuestions: 1,
          totalErrors: 0,
          totalWarnings: 1,
          stages: []
        }
      }) as never
    )
    vi.mocked(settingsService.getSettings).mockReturnValue({
      schemaVersion: 1,
      defaultExportFolder: '',
      defaultAppVersion: '0.1.0',
      defaultExportVersion: '1.0.0',
      allowExportWithWarnings: false,
      keepTemporaryExportFolder: false,
      preferredAudioExtensions: ['mp3', 'wav', 'm4a', 'ogg'],
      preferredImageExtensions: ['jpg', 'jpeg', 'png', 'webp']
    })

    const result = await exportEpisode('ep-3', exportOutputDir)

    expect(result.success).toBe(false)
    expect(result.error).toContain('do not allow export with warnings')
  })

  it('rejects relative export destinations so success cannot point to an unexpected working directory', async () => {
    vi.mocked(db.getEpisode).mockResolvedValue(createEpisodeDetail('ep-5', 'relative-destination') as never)

    const result = await exportEpisode('ep-5', 'LeyuTune_Episode_relative-destination.zip')

    expect(result.success).toBe(false)
    expect(result.error).toContain('absolute folder path or absolute .zip path')
  })

  it('cleans up the staging folder when a media file is missing at copy time', async () => {
    vi.mocked(db.getEpisode).mockResolvedValue(createEpisodeDetail('ep-4', 'missing-media') as never)
    vi.mocked(db.listQuestions).mockResolvedValue([
      createQuestion({
        episodeId: 'ep-4',
        questionMusicPath: path.join(sourceMediaDir, 'does-not-exist.mp3')
      })
    ] as never)
    vi.mocked(validation.validateEpisode).mockResolvedValue(
      createValidationResult('ep-4', 'missing-media') as never
    )

    const result = await exportEpisode('ep-4', exportOutputDir)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Media file not found on disk')

    const tempExportFoldersExist = fs
      .readdirSync(process.cwd())
      .some((item) => item.startsWith('.temp-export-'))
    expect(tempExportFoldersExist).toBe(false)
  })
})
