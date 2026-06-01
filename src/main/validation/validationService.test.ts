import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { validateEpisode } from './validationService'
import * as db from '../db/databaseService'

vi.mock('../db/databaseService', () => ({
  getEpisode: vi.fn(),
  listQuestions: vi.fn()
}))

const testRootDir = path.resolve('.temp-test-validation-service')
const existingMediaDir = path.join(testRootDir, 'existing-media')
const existingQuestionAudio = path.join(existingMediaDir, 'question.mp3')
const existingAnswerAudio = path.join(existingMediaDir, 'answer.wav')
const existingImage = path.join(existingMediaDir, 'image.jpg')

function createEpisodeDetail(overrides: Record<string, unknown> = {}) {
  return {
    episode: {
      id: 'ep-1',
      title: 'Validation Episode',
      slug: 'validation-episode',
      description: '',
      producerName: '',
      appVersion: '0.1.0',
      exportVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    },
    stageConfigs: [
      { id: 'sc-1', episodeId: 'ep-1', stageNo: 1, label: 'Stage 1', questionCount: 2, sortOrder: 1 },
      { id: 'sc-2', episodeId: 'ep-1', stageNo: 2, label: 'Stage 2', questionCount: 1, sortOrder: 2 },
      { id: 'sc-3', episodeId: 'ep-1', stageNo: 3, label: 'Stage 3', questionCount: 1, sortOrder: 3 },
      { id: 'sc-4', episodeId: 'ep-1', stageNo: 4, label: 'Final / Bonus', questionCount: 1, sortOrder: 4 }
    ]
  }
}

function createQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: `q-${Math.random()}`,
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

describe('validateEpisode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    fs.mkdirSync(existingMediaDir, { recursive: true })
    fs.writeFileSync(existingQuestionAudio, 'question audio', 'utf8')
    fs.writeFileSync(existingAnswerAudio, 'answer audio', 'utf8')
    fs.writeFileSync(existingImage, 'image data', 'utf8')
    vi.mocked(db.getEpisode).mockResolvedValue(createEpisodeDetail() as never)
  })

  afterEach(() => {
    if (fs.existsSync(testRootDir)) {
      fs.rmSync(testRootDir, { recursive: true, force: true })
    }
  })

  it('reports missing choices and actualAnswer', async () => {
    vi.mocked(db.listQuestions).mockResolvedValue([
      createQuestion({
        choiceOne: '',
        choiceThree: '',
        actualAnswer: ''
      })
    ] as never)

    const result = await validateEpisode('ep-1')

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_CHOICE', field: 'choiceOne' }),
        expect.objectContaining({ code: 'MISSING_CHOICE', field: 'choiceThree' }),
        expect.objectContaining({ code: 'MISSING_ACTUAL_ANSWER', field: 'actualAnswer' })
      ])
    )
  })

  it('reports invalid point values when money amount is missing or not positive whole number', async () => {
    vi.mocked(db.listQuestions).mockResolvedValue([
      createQuestion({ point: -1 })
    ] as never)

    const result = await validateEpisode('ep-1')

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_POINT',
          field: 'point',
          questionNo: 1
        })
      ])
    )
  })

  it('reports duplicate question numbers within a stage', async () => {
    vi.mocked(db.listQuestions).mockResolvedValue([
      createQuestion({ id: 'q-1', stageNo: 1, questionNo: 1 }),
      createQuestion({ id: 'q-2', stageNo: 1, questionNo: 1 })
    ] as never)

    const result = await validateEpisode('ep-1')

    expect(result.isValid).toBe(false)
    expect(result.errors.filter((issue) => issue.code === 'DUPLICATE_QUESTION_NO').length).toBeGreaterThan(0)
  })

  it('blocks an episode when referenced media files are missing on disk', async () => {
    vi.mocked(db.listQuestions).mockResolvedValue([
      createQuestion({
        questionMusicPath: path.join(existingMediaDir, 'missing-question.mp3'),
        answerMusicPath: path.join(existingMediaDir, 'missing-answer.wav'),
        imagePath: path.join(existingMediaDir, 'missing-image.jpg')
      })
    ] as never)

    const result = await validateEpisode('ep-1')

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MEDIA_FILE_NOT_FOUND', field: 'questionMusicPath' }),
        expect.objectContaining({ code: 'MEDIA_FILE_NOT_FOUND', field: 'answerMusicPath' }),
        expect.objectContaining({ code: 'MEDIA_FILE_NOT_FOUND', field: 'imagePath' })
      ])
    )
  })

  it('blocks unsupported media extensions', async () => {
    const unsupportedQuestionAudio = path.join(existingMediaDir, 'question.txt')
    const unsupportedImage = path.join(existingMediaDir, 'image.gif')
    fs.writeFileSync(unsupportedQuestionAudio, 'bad audio', 'utf8')
    fs.writeFileSync(unsupportedImage, 'bad image', 'utf8')

    vi.mocked(db.listQuestions).mockResolvedValue([
      createQuestion({
        questionMusicPath: unsupportedQuestionAudio,
        imagePath: unsupportedImage
      })
    ] as never)

    const result = await validateEpisode('ep-1')

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'UNSUPPORTED_MEDIA_EXTENSION', field: 'questionMusicPath' }),
        expect.objectContaining({ code: 'UNSUPPORTED_MEDIA_EXTENSION', field: 'imagePath' })
      ])
    )
  })

  it('reports missing required question slots per stage', async () => {
    vi.mocked(db.listQuestions).mockResolvedValue([
      createQuestion({ stageNo: 1, questionNo: 1 }),
      createQuestion({ id: 'q-2', stageNo: 2, questionNo: 1 }),
      createQuestion({ id: 'q-3', stageNo: 3, questionNo: 1 }),
      createQuestion({ id: 'q-4', stageNo: 4, questionNo: 1, questionType: 'final' })
    ] as never)

    const result = await validateEpisode('ep-1')

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'STAGE_QUESTION_COUNT_MISMATCH', stageNo: 1 }),
        expect.objectContaining({ code: 'MISSING_QUESTION_SLOT', stageNo: 1, questionNo: 2 })
      ])
    )
  })

  it('reports out-of-range question numbers', async () => {
    vi.mocked(db.listQuestions).mockResolvedValue([
      createQuestion({ stageNo: 1, questionNo: 3 }),
      createQuestion({ id: 'q-2', stageNo: 2, questionNo: 1 }),
      createQuestion({ id: 'q-3', stageNo: 3, questionNo: 1 }),
      createQuestion({ id: 'q-4', stageNo: 4, questionNo: 1, questionType: 'final' })
    ] as never)

    const result = await validateEpisode('ep-1')

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'QUESTION_NO_OUT_OF_RANGE',
          stageNo: 1,
          questionNo: 3
        })
      ])
    )
  })
})
