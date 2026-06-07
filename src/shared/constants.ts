import type { QuestionType } from './question-type'

/** Producer app semver — bump when shipping a new installer. */
export const APP_VERSION = '0.1.0'

/** Episode package format version — bump when manifest or export layout changes. */
export const EXPORT_VERSION = '1.0.0'

/**
 * Live dashboard Episode Import expects this integer in manifest.json formatVersion.
 * Supported by the legacy importer: 1 only. Do not use semver strings here.
 */
export const PACKAGE_FORMAT_VERSION = 1

/** Default number of question slots per stage when creating a new episode. */
export const DEFAULT_STAGE_COUNTS = {
  stage1: 15,
  stage2: 10,
  stage3: 5,
  final: 1
} as const

/** Default stage metadata aligned with DEFAULT_STAGE_COUNTS (no id / episodeId). */
export const DEFAULT_STAGE_CONFIGS: ReadonlyArray<{
  stageNo: number
  label: string
  questionCount: number
  sortOrder: number
}> = [
  { stageNo: 1, label: 'Stage 1', questionCount: DEFAULT_STAGE_COUNTS.stage1, sortOrder: 1 },
  { stageNo: 2, label: 'Stage 2', questionCount: DEFAULT_STAGE_COUNTS.stage2, sortOrder: 2 },
  { stageNo: 3, label: 'Stage 3', questionCount: DEFAULT_STAGE_COUNTS.stage3, sortOrder: 3 },
  {
    stageNo: 4,
    label: 'Final / Bonus',
    questionCount: DEFAULT_STAGE_COUNTS.final,
    sortOrder: 4
  }
]

export const QUESTION_TYPES: readonly QuestionType[] = [
  'normal',
  'final',
  'bonus',
  'jackpot'
] as const

/** Allowed extensions for question stem audio on the producer machine. */
export const SUPPORTED_QUESTION_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg'] as const

/** Allowed extensions for answer-reveal audio on the producer machine. */
export const SUPPORTED_ANSWER_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg'] as const

/** Allowed extensions for question preview images on the producer machine. */
export const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const

export type SupportedQuestionAudioExtension =
  (typeof SUPPORTED_QUESTION_AUDIO_EXTENSIONS)[number]

export type SupportedAnswerAudioExtension =
  (typeof SUPPORTED_ANSWER_AUDIO_EXTENSIONS)[number]

export type SupportedImageExtension = (typeof SUPPORTED_IMAGE_EXTENSIONS)[number]
