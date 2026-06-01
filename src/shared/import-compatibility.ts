import type { LegacyQuestionRow } from './legacy-question-row'

export interface ImportCompatibilityWarning {
  code: string
  message: string
  rowIndex?: number
  field?: string
  stageNo?: number
  questionNo?: number
}

export interface ImportCompatibilityPreview {
  episodeId: string
  episodeTitle: string
  episodeSlug: string
  rows: LegacyQuestionRow[]
  warnings: ImportCompatibilityWarning[]
  jsonPreview: string
}
