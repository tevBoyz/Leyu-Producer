import type { Question } from '../../shared/question'
import type { LegacyQuestionRow } from '../../shared/legacy-question-row'
import {
  getQuestionMusicRelativePath,
  getAnswerMusicRelativePath,
  getPictureRelativePath
} from './exportPaths'

export interface MediaCopyPlanEntry {
  sourceAbsolutePath: string
  targetRelativePath: string
  kind: 'questionMusic' | 'answerMusic' | 'image'
  stageNo: number
  questionNo: number
}

export interface BuildLegacyRowsResult {
  legacyRows: LegacyQuestionRow[]
  mediaCopyPlan: MediaCopyPlanEntry[]
}

/**
 * Converts internal SQLite Question records with absolute local paths into
 * legacy MySQL-compatible LegacyQuestionRows with relative zip paths, and
 * generates a media copy plan for the exporter.
 *
 * Sorting:
 * - Stage_No ascending
 * - question_no ascending
 */
export function buildLegacyRows(questions: Question[]): BuildLegacyRowsResult {
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.stageNo !== b.stageNo) {
      return a.stageNo - b.stageNo
    }
    return a.questionNo - b.questionNo
  })

  const legacyRows: LegacyQuestionRow[] = []
  const mediaCopyPlan: MediaCopyPlanEntry[] = []

  for (const q of sortedQuestions) {
    const stageNo = q.stageNo
    const questionNo = q.questionNo

    let url_question = ''
    let url_answer = ''
    let url_picture = ''

    if (q.questionMusicPath && q.questionMusicPath.trim() !== '') {
      url_question = getQuestionMusicRelativePath(stageNo, questionNo, q.questionMusicPath)
      mediaCopyPlan.push({
        sourceAbsolutePath: q.questionMusicPath,
        targetRelativePath: url_question,
        kind: 'questionMusic',
        stageNo,
        questionNo
      })
    }

    if (q.answerMusicPath && q.answerMusicPath.trim() !== '') {
      url_answer = getAnswerMusicRelativePath(stageNo, questionNo, q.answerMusicPath)
      mediaCopyPlan.push({
        sourceAbsolutePath: q.answerMusicPath,
        targetRelativePath: url_answer,
        kind: 'answerMusic',
        stageNo,
        questionNo
      })
    }

    if (q.imagePath && q.imagePath.trim() !== '') {
      url_picture = getPictureRelativePath(stageNo, questionNo, q.imagePath)
      mediaCopyPlan.push({
        sourceAbsolutePath: q.imagePath,
        targetRelativePath: url_picture,
        kind: 'image',
        stageNo,
        questionNo
      })
    }

    const row: LegacyQuestionRow = {
      Id: null,
      question_no: questionNo,
      Stage_No: stageNo,
      choice_one: q.choiceOne,
      choice_two: q.choiceTwo,
      choice_three: q.choiceThree,
      choice_four: q.choiceFour,
      actual_answer: q.actualAnswer,
      asked_flag: 0,
      point: q.point,
      url_question,
      url_answer,
      category: q.category,
      url_picture
    }

    legacyRows.push(row)
  }

  return {
    legacyRows,
    mediaCopyPlan
  }
}
