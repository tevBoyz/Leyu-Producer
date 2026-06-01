import { describe, it, expect } from 'vitest'
import { buildLegacyRows } from './buildLegacyRows'
import { getFileExtension, padQuestionNo, normalizePathSlashes } from './exportPaths'
import type { Question } from '../../shared/question'

const createMockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'q-id',
  episodeId: 'ep-id',
  stageNo: 1,
  questionNo: 1,
  choiceOne: 'Choice A',
  choiceTwo: 'Choice B',
  choiceThree: 'Choice C',
  choiceFour: 'Choice D',
  actualAnswer: 'Choice A',
  point: 100,
  category: 'Pop Music',
  questionType: 'normal',
  questionMusicPath: '',
  answerMusicPath: '',
  imagePath: '',
  createdAt: '2026-06-01T12:00:00.000Z',
  updatedAt: '2026-06-01T12:00:00.000Z',
  ...overrides
})

describe('Export path helpers', () => {
  it('should extract file extensions correctly', () => {
    expect(getFileExtension('C:\\music\\song.mp3')).toBe('mp3')
    expect(getFileExtension('/var/media/image.PNG')).toBe('PNG')
    expect(getFileExtension('no_extension_file')).toBe('')
    expect(getFileExtension('filename.with.many.dots.wav')).toBe('wav')
    expect(getFileExtension('.gitignore')).toBe('') // hidden file boundary case
  })

  it('should pad question numbers up to 3 digits', () => {
    expect(padQuestionNo(1)).toBe('001')
    expect(padQuestionNo(10)).toBe('010')
    expect(padQuestionNo(105)).toBe('105')
  })

  it('should normalize all backslashes to forward slashes', () => {
    expect(normalizePathSlashes('music\\questions\\stage1.mp3')).toBe('music/questions/stage1.mp3')
    expect(normalizePathSlashes('music/questions/stage1.mp3')).toBe('music/questions/stage1.mp3')
  })
})

describe('buildLegacyRows mapping logic', () => {
  it('should construct correct legacy rows with asked_flag = 0 and Id = null', () => {
    const questions = [
      createMockQuestion({
        stageNo: 1,
        questionNo: 1,
        choiceOne: 'One',
        choiceTwo: 'Two',
        choiceThree: 'Three',
        choiceFour: 'Four',
        actualAnswer: 'One',
        point: 500,
        category: 'Rock'
      })
    ]

    const { legacyRows, mediaCopyPlan } = buildLegacyRows(questions)

    expect(legacyRows.length).toBe(1)
    const row = legacyRows[0]

    expect(row.Id).toBeNull()
    expect(row.Stage_No).toBe(1)
    expect(row.question_no).toBe(1)
    expect(row.choice_one).toBe('One')
    expect(row.choice_two).toBe('Two')
    expect(row.choice_three).toBe('Three')
    expect(row.choice_four).toBe('Four')
    expect(row.actual_answer).toBe('One')
    expect(row.asked_flag).toBe(0)
    expect(row.point).toBe(500)
    expect(row.category).toBe('Rock')
    expect(Object.keys(row).sort()).toEqual(
      [
        'Id',
        'Stage_No',
        'actual_answer',
        'asked_flag',
        'category',
        'choice_four',
        'choice_one',
        'choice_three',
        'choice_two',
        'point',
        'question_no',
        'url_answer',
        'url_picture',
        'url_question'
      ].sort()
    )
    expect(mediaCopyPlan.length).toBe(0)
  })

  it('should omit questionType from legacyRows but preserve it as part of any implicit schema check', () => {
    const questions = [
      createMockQuestion({
        questionType: 'jackpot'
      })
    ]

    const { legacyRows } = buildLegacyRows(questions)
    const row = legacyRows[0] as any

    expect(row.questionType).toBeUndefined()
    expect(row.question_type).toBeUndefined()
  })

  it('should map relative paths for media files and exclude absolute paths in legacyRows', () => {
    const questions = [
      createMockQuestion({
        stageNo: 2,
        questionNo: 15,
        questionMusicPath: 'C:\\Users\\Victus\\Music\\q_track.mp3',
        answerMusicPath: 'C:\\Users\\Victus\\Music\\a_track.wav',
        imagePath: '/absolute/path/to/img.jpeg'
      })
    ]

    const { legacyRows, mediaCopyPlan } = buildLegacyRows(questions)
    const row = legacyRows[0]

    // Verify relative paths in legacy rows
    expect(row.url_question).toBe('music/questions/stage2_q015.mp3')
    expect(row.url_answer).toBe('music/answers/stage2_q015_answer.wav')
    expect(row.url_picture).toBe('images/stage2_q015.jpeg')
    expect(row.url_question).not.toContain('\\')
    expect(row.url_answer).not.toContain('\\')
    expect(row.url_picture).not.toContain('\\')

    // Verify absolute paths are NOT in legacy rows
    expect(row.url_question).not.toContain('C:')
    expect(row.url_answer).not.toContain('C:')
    expect(row.url_picture).not.toContain('absolute')

    // Verify mediaCopyPlan structures
    expect(mediaCopyPlan.length).toBe(3)

    expect(mediaCopyPlan[0]).toEqual({
      sourceAbsolutePath: 'C:\\Users\\Victus\\Music\\q_track.mp3',
      targetRelativePath: 'music/questions/stage2_q015.mp3',
      kind: 'questionMusic',
      stageNo: 2,
      questionNo: 15
    })

    expect(mediaCopyPlan[1]).toEqual({
      sourceAbsolutePath: 'C:\\Users\\Victus\\Music\\a_track.wav',
      targetRelativePath: 'music/answers/stage2_q015_answer.wav',
      kind: 'answerMusic',
      stageNo: 2,
      questionNo: 15
    })

    expect(mediaCopyPlan[2]).toEqual({
      sourceAbsolutePath: '/absolute/path/to/img.jpeg',
      targetRelativePath: 'images/stage2_q015.jpeg',
      kind: 'image',
      stageNo: 2,
      questionNo: 15
    })
  })

  it('should map stage 1 question media to the expected portable zip locations', () => {
    const { legacyRows } = buildLegacyRows([
      createMockQuestion({
        stageNo: 1,
        questionNo: 1,
        questionMusicPath: 'C:\\media\\question.mp3',
        answerMusicPath: 'C:\\media\\answer.mp3',
        imagePath: 'C:\\media\\picture.jpg'
      })
    ])

    expect(legacyRows[0].url_question).toBe('music/questions/stage1_q001.mp3')
    expect(legacyRows[0].url_answer).toBe('music/answers/stage1_q001_answer.mp3')
    expect(legacyRows[0].url_picture).toBe('images/stage1_q001.jpg')
  })

  it('should sort questions by Stage_No ascending, then question_no ascending', () => {
    const q1 = createMockQuestion({ stageNo: 2, questionNo: 2 })
    const q2 = createMockQuestion({ stageNo: 1, questionNo: 5 })
    const q3 = createMockQuestion({ stageNo: 2, questionNo: 1 })
    const q4 = createMockQuestion({ stageNo: 3, questionNo: 1 })

    const { legacyRows } = buildLegacyRows([q1, q2, q3, q4])

    expect(legacyRows.length).toBe(4)

    // Expected order:
    // 1. Stage 1, question 5
    // 2. Stage 2, question 1
    // 3. Stage 2, question 2
    // 4. Stage 3, question 1
    expect(legacyRows[0].Stage_No).toBe(1)
    expect(legacyRows[0].question_no).toBe(5)

    expect(legacyRows[1].Stage_No).toBe(2)
    expect(legacyRows[1].question_no).toBe(1)

    expect(legacyRows[2].Stage_No).toBe(2)
    expect(legacyRows[2].question_no).toBe(2)

    expect(legacyRows[3].Stage_No).toBe(3)
    expect(legacyRows[3].question_no).toBe(1)
  })

  it('should process final/bonus questions successfully', () => {
    const questions = [
      createMockQuestion({
        stageNo: 4, // Final/bonus stage
        questionNo: 1,
        questionType: 'final'
      })
    ]

    const { legacyRows } = buildLegacyRows(questions)
    expect(legacyRows.length).toBe(1)
    expect(legacyRows[0].Stage_No).toBe(4)
    expect(legacyRows[0].question_no).toBe(1)
  })
})
