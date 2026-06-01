import { DEFAULT_STAGE_CONFIGS } from '../../shared/constants'

export interface StageConfigDraft {
  stageNo: number
  label: string
  questionCount: number
  sortOrder: number
}

export function createDefaultStageDrafts(): StageConfigDraft[] {
  return DEFAULT_STAGE_CONFIGS.map((config) => ({ ...config }))
}

export function updateStageQuestionCount(
  configs: StageConfigDraft[],
  stageNo: number,
  questionCount: number
): StageConfigDraft[] {
  return configs.map((config) =>
    config.stageNo === stageNo ? { ...config, questionCount } : config
  )
}

export function validateStageQuestionCounts(
  configs: StageConfigDraft[]
): Record<number, string> {
  const errors: Record<number, string> = {}

  for (const config of configs) {
    if (!Number.isInteger(config.questionCount) || config.questionCount < 1) {
      errors[config.stageNo] = 'Enter a positive whole number.'
    }
  }

  return errors
}
