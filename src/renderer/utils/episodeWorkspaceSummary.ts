import type { EpisodeDetail } from '../../shared/db-inputs'
import type { Question } from '../../shared/question'
import type { ValidationResult } from '../../shared/validation'
import { getMissingQuestionNumbers, isQuestionComplete, questionsForStage } from './questionHelpers'

export interface StageWorkspaceSummary {
  stageNo: number
  label: string
  expectedCount: number
  currentCount: number
  completedCount: number
  missingQuestionNumbers: number[]
}

export interface EpisodeWorkspaceSummary {
  episodeTitle: string
  episodeSlug: string
  lastUpdatedAt: string
  totalQuestions: number
  completedQuestions: number
  mediaCompleteQuestions: number
  validationStatus: 'ready' | 'warning' | 'blocked' | 'unknown'
  validationText: string
  stages: StageWorkspaceSummary[]
}

export function buildEpisodeWorkspaceSummary(
  detail: EpisodeDetail,
  questions: Question[],
  validation: ValidationResult | null
): EpisodeWorkspaceSummary {
  const stages = [...detail.stageConfigs]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stage) => {
      const stageQuestions = questionsForStage(questions, stage.stageNo)
      return {
        stageNo: stage.stageNo,
        label: stage.label,
        expectedCount: stage.questionCount,
        currentCount: stageQuestions.length,
        completedCount: stageQuestions.filter(isQuestionComplete).length,
        missingQuestionNumbers: getMissingQuestionNumbers(
          questions,
          stage.stageNo,
          stage.questionCount
        )
      }
    })

  const mediaCompleteQuestions = questions.filter(
    (question) =>
      question.questionMusicPath.trim() &&
      question.answerMusicPath.trim() &&
      question.imagePath.trim()
  ).length

  let validationStatus: EpisodeWorkspaceSummary['validationStatus'] = 'unknown'
  let validationText = 'Run validation to check export readiness.'

  if (validation) {
    if (!validation.isValid) {
      validationStatus = 'blocked'
      validationText = `${validation.summary.totalErrors} error(s) block export.`
    } else if (validation.summary.totalWarnings > 0) {
      validationStatus = 'warning'
      validationText = `${validation.summary.totalWarnings} warning(s). Export is still allowed.`
    } else {
      validationStatus = 'ready'
      validationText = 'Validation passed with no blocking issues.'
    }
  }

  return {
    episodeTitle: detail.episode.title,
    episodeSlug: detail.episode.slug,
    lastUpdatedAt: detail.episode.updatedAt,
    totalQuestions: questions.length,
    completedQuestions: questions.filter(isQuestionComplete).length,
    mediaCompleteQuestions,
    validationStatus,
    validationText,
    stages
  }
}
