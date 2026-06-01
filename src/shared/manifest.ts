import type { QuestionType } from './question-type'

/**
 * question_type is not a column on live MySQL `questions` — stored here for import/UI logic.
 */
export interface ManifestQuestionTypeMeta {
  stageNo: number
  questionNo: number
  questionType: QuestionType
}

/**
 * Maps a logical media slot to its zip-relative path inside the package.
 * Keys are stable identifiers (e.g. "stage1_q001_question"); values are never absolute PC paths.
 */
export type ManifestMediaMap = Record<string, ManifestMediaEntry>

export interface ManifestMediaEntry {
  /** Path inside the zip, e.g. music/questions/stage1_q001.mp3 */
  relativePath: string
  stageNo: number
  questionNo: number
  kind: 'question_audio' | 'answer_audio' | 'image'
}

/**
 * manifest.json at the root of LeyuTune_Episode_<slug>.zip
 */
export interface Manifest {
  episodeSlug: string
  episodeTitle: string
  description: string
  producerName: string
  stageCounts: ManifestStageCounts
  createdAt: string
  exportVersion: string
  appVersion: string
  questionTypes: ManifestQuestionTypeMeta[]
  /** Optional index of all packaged media files (zip-relative paths only). */
  media?: ManifestMediaMap
}

export interface ManifestStageCounts {
  stage1: number
  stage2: number
  stage3: number
  /** Final / bonus round (producer stageNo 4). */
  final: number
}
