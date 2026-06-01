/**
 * Row shape for `db/questions.json` inside an exported episode package.
 * Column names match the live MySQL `questions` table (Gameshow v1 / LeyuTune).
 *
 * Path fields (`url_question`, `url_answer`, `url_picture`):
 * - EXPORTED VALUES — zip-relative paths only (e.g. music/questions/stage1_q001.mp3).
 * - The live importer unzips the package and rewrites these to absolute paths on the show PC
 *   before INSERT into MySQL.
 *
 * `Id` is optional on export (auto-increment on import); include only if importer expects it.
 */
export interface LegacyQuestionRow {
  Id?: number | null
  question_no: number
  Stage_No: number
  choice_one: string
  choice_two: string
  choice_three: string
  choice_four: string
  actual_answer: string
  /** Always 0 in exports — live app uses this during the show. */
  asked_flag: number
  point: number
  /** Zip-relative path to question music. */
  url_question: string
  /** Zip-relative path to answer-reveal music. */
  url_answer: string
  category: string
  /** Zip-relative path to preview image. */
  url_picture: string
}
