import { existsSync } from 'fs'
import { extname } from 'path'
import { areChoicesRequiredForStage } from '../../shared/question-rules'
import { DEFAULT_STAGE_CONFIGS } from '../../shared/constants'
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_QUESTION_AUDIO_EXTENSIONS
} from '../../shared/constants'
import type {
  ValidationIssue,
  ValidationResult,
  ValidationStageSummary,
  ValidationSummary
} from '../../shared/validation'
import type { Question } from '../../shared/question'
import type { StageConfig } from '../../shared/stage-config'
import * as db from '../db/databaseService'
import { logInfo } from '../services/loggerService'

const REQUIRED_STAGE_NUMBERS = [1, 2, 3, 4] as const
const AUDIO_EXTENSIONS = [...SUPPORTED_QUESTION_AUDIO_EXTENSIONS] as string[]
const IMAGE_EXTENSIONS = [...SUPPORTED_IMAGE_EXTENSIONS] as string[]

interface IssueContext {
  stageNo?: number
  questionNo?: number
  field?: string
}

function extensionOf(filePath: string): string {
  return extname(filePath).toLowerCase().replace(/^\./, '')
}

function pushError(
  errors: ValidationIssue[],
  code: string,
  message: string,
  ctx: IssueContext = {}
): void {
  errors.push({ severity: 'error', code, message, ...ctx })
}

function pushWarning(
  warnings: ValidationIssue[],
  code: string,
  message: string,
  ctx: IssueContext = {}
): void {
  warnings.push({ severity: 'warning', code, message, ...ctx })
}

function validateMediaPath(
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  question: Question,
  field: 'questionMusicPath' | 'answerMusicPath' | 'imagePath',
  label: string,
  allowedExtensions: readonly string[]
): void {
  const ctx = {
    stageNo: question.stageNo,
    questionNo: question.questionNo,
    field
  }
  const path = question[field]?.trim() ?? ''

  if (!path) {
    pushError(
      errors,
      'MISSING_MEDIA_PATH',
      `${label} is required.`,
      ctx
    )
    return
  }

  const ext = extensionOf(path)
  if (!ext || !allowedExtensions.includes(ext)) {
    pushError(
      errors,
      'UNSUPPORTED_MEDIA_EXTENSION',
      `${label}: unsupported type ".${ext || '?'}". Allowed: ${allowedExtensions.map((e) => `.${e}`).join(', ')}.`,
      ctx
    )
  }

  if (!existsSync(path)) {
    pushError(errors, 'MEDIA_FILE_NOT_FOUND', `${label}: file not found on disk.`, ctx)
  }
}

function validateQuestion(
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  question: Question
): void {
  const ctx = { stageNo: question.stageNo, questionNo: question.questionNo }

  const choices = [
    { field: 'choiceOne' as const, value: question.choiceOne },
    { field: 'choiceTwo' as const, value: question.choiceTwo },
    { field: 'choiceThree' as const, value: question.choiceThree },
    { field: 'choiceFour' as const, value: question.choiceFour }
  ]

  for (const { field, value } of choices) {
    if (!areChoicesRequiredForStage(question.stageNo)) {
      continue
    }

    if (!value.trim()) {
      pushError(errors, 'MISSING_CHOICE', `Choice (${field}) is required.`, {
        ...ctx,
        field
      })
    }
  }

  if (!question.actualAnswer.trim()) {
    pushError(errors, 'MISSING_ACTUAL_ANSWER', 'Correct answer is required.', {
      ...ctx,
      field: 'actualAnswer'
    })
  } else {
    const answer = question.actualAnswer.trim()
    const choiceValues = choices.map((c) => c.value.trim()).filter(Boolean)
    const matchesChoice = choiceValues.some(
      (c) => c.localeCompare(answer, undefined, { sensitivity: 'accent' }) === 0
    )
    if (choiceValues.length === 4 && !matchesChoice && areChoicesRequiredForStage(question.stageNo)) {
      pushWarning(
        warnings,
        'ANSWER_NOT_IN_CHOICES',
        'Correct answer does not match any of the four choices (legacy app may still accept it).',
        { ...ctx, field: 'actualAnswer' }
      )
    }
  }

  if (!Number.isInteger(question.point) || question.point < 0) {
    pushError(errors, 'INVALID_POINT', 'Money amount must be zero or a positive whole number.', {
      ...ctx,
      field: 'point'
    })
  } else if (question.point === 0) {
    pushWarning(warnings, 'ZERO_POINT', 'Money amount is 0.', { ...ctx, field: 'point' })
  }

  validateMediaPath(
    errors,
    warnings,
    question,
    'questionMusicPath',
    'Question music',
    AUDIO_EXTENSIONS
  )
  validateMediaPath(
    errors,
    warnings,
    question,
    'answerMusicPath',
    'Answer reveal music',
    AUDIO_EXTENSIONS
  )
  validateMediaPath(errors, warnings, question, 'imagePath', 'Preview image', IMAGE_EXTENSIONS)
}

function validateStageLayout(
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  stage: StageConfig,
  questions: Question[]
): number[] {
  const expected = stage.questionCount
  const stageQuestions = questions.filter((q) => q.stageNo === stage.stageNo)
  const ctx = { stageNo: stage.stageNo }

  if (stageQuestions.length !== expected) {
    pushError(
      errors,
      'STAGE_QUESTION_COUNT_MISMATCH',
      `${stage.label}: expected ${expected} question(s), found ${stageQuestions.length}.`,
      ctx
    )
  }

  const numbers = stageQuestions.map((q) => q.questionNo)
  const unique = new Set(numbers)
  if (unique.size !== numbers.length) {
    pushError(
      errors,
      'DUPLICATE_QUESTION_NO',
      `${stage.label}: duplicate question numbers within this stage.`,
      ctx
    )
  }

  const missing: number[] = []
  for (let n = 1; n <= expected; n++) {
    if (!numbers.includes(n)) {
      missing.push(n)
      pushError(
        errors,
        'MISSING_QUESTION_SLOT',
        `${stage.label}: missing question number ${n}.`,
        { stageNo: stage.stageNo, questionNo: n }
      )
    }
  }

  for (const q of stageQuestions) {
    if (q.questionNo < 1 || q.questionNo > expected) {
      pushError(
        errors,
        'QUESTION_NO_OUT_OF_RANGE',
        `${stage.label}: question ${q.questionNo} is outside the allowed range 1–${expected}.`,
        { stageNo: stage.stageNo, questionNo: q.questionNo }
      )
    }
  }

  return missing
}

function buildStageSummaries(
  stageConfigs: StageConfig[],
  questions: Question[],
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): ValidationStageSummary[] {
  const sorted = [...stageConfigs].sort((a, b) => a.sortOrder - b.sortOrder)

  return sorted.map((stage) => {
    const stageErrors = errors.filter((e) => e.stageNo === stage.stageNo)
    const stageWarnings = warnings.filter((w) => w.stageNo === stage.stageNo)
    const stageQuestions = questions.filter((q) => q.stageNo === stage.stageNo)
    const missing: number[] = []
    for (let n = 1; n <= stage.questionCount; n++) {
      if (!stageQuestions.some((q) => q.questionNo === n)) missing.push(n)
    }

    return {
      stageNo: stage.stageNo,
      label: stage.label,
      expectedCount: stage.questionCount,
      currentCount: stageQuestions.length,
      errorCount: stageErrors.length,
      warningCount: stageWarnings.length,
      missingQuestionNumbers: missing
    }
  })
}

/** Full pre-export validation for an episode (DB + filesystem). */
export async function validateEpisode(episodeId: string): Promise<ValidationResult> {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  logInfo('validation.run.start', 'Running episode validation.', {
    episodeId
  })

  const detail = await db.getEpisode(episodeId)
  if (!detail) {
    pushError(errors, 'EPISODE_NOT_FOUND', 'Episode not found.')
    const result = {
      isValid: false,
      errors,
      warnings,
      summary: {
        episodeId,
        episodeTitle: '',
        episodeSlug: '',
        totalQuestions: 0,
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        stages: []
      }
    }
    logInfo('validation.run.complete', 'Episode validation completed.', {
      episodeId,
      isValid: result.isValid,
      totalErrors: result.summary.totalErrors,
      totalWarnings: result.summary.totalWarnings
    })
    return result
  }

  const { episode, stageConfigs } = detail
  const questions = await db.listQuestions(episodeId)

  for (const stageNo of REQUIRED_STAGE_NUMBERS) {
    const config = stageConfigs.find((s) => s.stageNo === stageNo)
    const defaultMeta = DEFAULT_STAGE_CONFIGS.find((d) => d.stageNo === stageNo)
    if (!config) {
      pushError(
        errors,
        'MISSING_STAGE_CONFIG',
        `Stage configuration missing for ${defaultMeta?.label ?? `stage ${stageNo}`} (stageNo ${stageNo}).`,
        { stageNo }
      )
    }
  }

  const configsByStage = new Map(stageConfigs.map((s) => [s.stageNo, s]))
  for (const stageNo of REQUIRED_STAGE_NUMBERS) {
    const stage = configsByStage.get(stageNo)
    if (stage) {
      validateStageLayout(errors, warnings, stage, questions)
    }
  }

  const seenSlot = new Set<string>()
  for (const q of questions) {
    const key = `${q.stageNo}:${q.questionNo}`
    if (seenSlot.has(key)) {
      pushError(
        errors,
        'DUPLICATE_QUESTION_NO',
        `Duplicate question: Stage ${q.stageNo}, Q${q.questionNo}.`,
        { stageNo: q.stageNo, questionNo: q.questionNo }
      )
    }
    seenSlot.add(key)
    validateQuestion(errors, warnings, q)
  }

  const summary: ValidationSummary = {
    episodeId: episode.id,
    episodeTitle: episode.title,
    episodeSlug: episode.slug,
    totalQuestions: questions.length,
    totalErrors: errors.length,
    totalWarnings: warnings.length,
    stages: buildStageSummaries(stageConfigs, questions, errors, warnings)
  }

  const result = {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary
  }

  logInfo('validation.run.complete', 'Episode validation completed.', {
    episodeId,
    episodeSlug: episode.slug,
    isValid: result.isValid,
    totalErrors: result.summary.totalErrors,
    totalWarnings: result.summary.totalWarnings
  })

  return result
}
