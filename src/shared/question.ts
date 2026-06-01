import type { QuestionType } from './question-type'

/**
 * Question as authored in the producer app (local SQLite).
 *
 * Path fields (`questionMusicPath`, `answerMusicPath`, `imagePath`):
 * - INTERNAL ONLY — absolute or resolved paths on the producer PC while editing.
 * - Must NOT be written to db/questions.json or manifest media entries as-is.
 * - On export, copy files into the zip and map to zip-relative paths in LegacyQuestionRow
 *   (e.g. music/questions/stage1_q001.mp3) for the live dashboard importer.
 */
export interface Question {
  id: string
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
  /** Internal producer-machine path to question stem audio. */
  questionMusicPath: string
  /** Internal producer-machine path to answer-reveal audio. */
  answerMusicPath: string
  /** Internal producer-machine path to preview image. */
  imagePath: string
  createdAt: string
  updatedAt: string
}
