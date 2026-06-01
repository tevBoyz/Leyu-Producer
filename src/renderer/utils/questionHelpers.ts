import type { Question } from '../../shared/question'
import type { QuestionType } from '../../shared/question-type'
import type { StageConfig } from '../../shared/stage-config'

export function defaultQuestionTypeForStage(stageNo: number): QuestionType {
  return stageNo === 4 ? 'final' : 'normal'
}

/** First gap in 1..expectedCount, otherwise max+1. */
export function suggestNextQuestionNo(
  questions: Question[],
  stageNo: number,
  expectedCount: number
): number {
  const nums = new Set(
    questions.filter((q) => q.stageNo === stageNo).map((q) => q.questionNo)
  )
  for (let n = 1; n <= expectedCount; n++) {
    if (!nums.has(n)) return n
  }
  const arr = Array.from(nums)
  const max = arr.length > 0 ? Math.max(...arr) : 0
  return max + 1
}

export function getMissingQuestionNumbers(
  questions: Question[],
  stageNo: number,
  expectedCount: number
): number[] {
  const present = new Set(
    questions.filter((q) => q.stageNo === stageNo).map((q) => q.questionNo)
  )
  const missing: number[] = []
  for (let n = 1; n <= expectedCount; n++) {
    if (!present.has(n)) missing.push(n)
  }
  return missing
}

export function questionsForStage(questions: Question[], stageNo: number): Question[] {
  return questions
    .filter((q) => q.stageNo === stageNo)
    .sort((a, b) => a.questionNo - b.questionNo)
}

export function isQuestionComplete(q: Question): boolean {
  return (
    q.choiceOne.trim() !== '' &&
    q.choiceTwo.trim() !== '' &&
    q.choiceThree.trim() !== '' &&
    q.choiceFour.trim() !== '' &&
    q.actualAnswer.trim() !== '' &&
    q.point > 0
  )
}

export interface QuestionFormErrors {
  questionNo?: string
  choiceOne?: string
  choiceTwo?: string
  choiceThree?: string
  choiceFour?: string
  actualAnswer?: string
  point?: string
  questionMusicPath?: string
  answerMusicPath?: string
  imagePath?: string
  form?: string
}

export interface QuestionFormValues {
  id?: string
  episodeId: string
  stageNo: number
  questionNo: number
  choiceOne: string
  choiceTwo: string
  choiceThree: string
  choiceFour: string
  actualAnswer: string
  point: number
  category: string
  questionType: QuestionType
  questionMusicPath: string
  answerMusicPath: string
  imagePath: string
}

export function validateQuestionForm(
  values: QuestionFormValues,
  existingQuestions: Question[]
): QuestionFormErrors {
  const errors: QuestionFormErrors = {}

  if (!Number.isInteger(values.questionNo) || values.questionNo < 1) {
    errors.questionNo = 'Question number must be a positive whole number.'
  } else {
    const duplicate = existingQuestions.some(
      (q) =>
        q.stageNo === values.stageNo &&
        q.questionNo === values.questionNo &&
        q.id !== values.id
    )
    if (duplicate) {
      errors.questionNo = `Question ${values.questionNo} already exists in this stage.`
    }
  }

  if (!values.choiceOne.trim()) errors.choiceOne = 'Required'
  if (!values.choiceTwo.trim()) errors.choiceTwo = 'Required'
  if (!values.choiceThree.trim()) errors.choiceThree = 'Required'
  if (!values.choiceFour.trim()) errors.choiceFour = 'Required'

  if (!values.actualAnswer.trim()) {
    errors.actualAnswer = 'Select or enter the correct answer.'
  }

  if (!Number.isInteger(values.point) || values.point < 1) {
    errors.point = 'Money amount must be at least 1.'
  }

  return errors
}

export function hasFormErrors(errors: QuestionFormErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Verify non-empty media paths exist on disk (via main process IPC). */
export async function validateMediaPaths(
  values: QuestionFormValues
): Promise<QuestionFormErrors> {
  const errors: QuestionFormErrors = {}
  const fields: Array<{ key: keyof QuestionFormErrors; path: string }> = [
    { key: 'questionMusicPath', path: values.questionMusicPath },
    { key: 'answerMusicPath', path: values.answerMusicPath },
    { key: 'imagePath', path: values.imagePath }
  ]

  for (const { key, path } of fields) {
    if (!path.trim()) continue
    const result = await window.producerApi.checkFileExists(path)
    if (result.error) {
      errors[key] = result.error
    } else if (!result.exists) {
      errors[key] = 'File not found on disk. Use Browse to select a valid file.'
    }
  }

  return errors
}

export function getStageConfig(
  stageConfigs: StageConfig[],
  stageNo: number
): StageConfig | undefined {
  return stageConfigs.find((s) => s.stageNo === stageNo)
}
