/** Episode validation result — shared by main process and renderer. */

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  severity: ValidationSeverity
  code: string
  message: string
  stageNo?: number
  questionNo?: number
  field?: string
}

export interface ValidationStageSummary {
  stageNo: number
  label: string
  expectedCount: number
  currentCount: number
  errorCount: number
  warningCount: number
  missingQuestionNumbers: number[]
}

export interface ValidationSummary {
  episodeId: string
  episodeTitle: string
  episodeSlug: string
  totalQuestions: number
  totalErrors: number
  totalWarnings: number
  stages: ValidationStageSummary[]
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  summary: ValidationSummary
}
