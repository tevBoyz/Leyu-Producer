import { describe, expect, it } from 'vitest'
import type { Question } from '../../shared/question'
import { areChoicesRequiredForStage } from '../../shared/question-rules'
import { isQuestionComplete, validateQuestionForm } from './questionHelpers'

function createQuestion(overrides: Partial<Question> = {}): Question {
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
    category: '',
    questionType: 'normal',
    questionMusicPath: '',
    answerMusicPath: '',
    imagePath: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

describe('stage 3 optional choices', () => {
  it('does not require choices for stage 3 in form validation', () => {
    const errors = validateQuestionForm(
      {
        episodeId: 'ep-1',
        stageNo: 3,
        questionNo: 1,
        choiceOne: '',
        choiceTwo: '',
        choiceThree: '',
        choiceFour: '',
        actualAnswer: 'Manual answer',
        point: 100,
        category: '',
        questionType: 'normal',
        questionMusicPath: '',
        answerMusicPath: '',
        imagePath: ''
      },
      []
    )

    expect(errors.choiceOne).toBeUndefined()
    expect(errors.choiceTwo).toBeUndefined()
    expect(errors.choiceThree).toBeUndefined()
    expect(errors.choiceFour).toBeUndefined()
  })

  it('still requires choices for other stages', () => {
    const errors = validateQuestionForm(
      {
        episodeId: 'ep-1',
        stageNo: 2,
        questionNo: 1,
        choiceOne: '',
        choiceTwo: '',
        choiceThree: '',
        choiceFour: '',
        actualAnswer: 'Manual answer',
        point: 100,
        category: '',
        questionType: 'normal',
        questionMusicPath: '',
        answerMusicPath: '',
        imagePath: ''
      },
      []
    )

    expect(errors.choiceOne).toBe('Required')
  })

  it('treats stage 3 questions as complete without choices', () => {
    expect(
      isQuestionComplete(
        createQuestion({
          stageNo: 3,
          choiceOne: '',
          choiceTwo: '',
          choiceThree: '',
          choiceFour: '',
          actualAnswer: 'Answer',
          point: 50
        })
      )
    ).toBe(true)
  })

  it('exports shared stage rule helper', () => {
    expect(areChoicesRequiredForStage(3)).toBe(false)
    expect(areChoicesRequiredForStage(1)).toBe(true)
  })
})
