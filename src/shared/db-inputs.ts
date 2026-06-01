import type { QuestionType } from './question-type'
import type { Episode } from './episode'
import type { StageConfig } from './stage-config'

export interface CreateEpisodeInput {
  title: string
  slug: string
  description?: string
  producerName?: string
  appVersion?: string
  exportVersion?: string
}

export interface UpdateEpisodeInput {
  id: string
  title?: string
  slug?: string
  description?: string
  producerName?: string
  appVersion?: string
  exportVersion?: string
}

export interface UpsertStageConfigInput {
  stageNo: number
  label: string
  questionCount: number
  sortOrder: number
}

export interface UpsertQuestionInput {
  id?: string
  episodeId: string
  stageNo: number
  questionNo: number
  choiceOne?: string
  choiceTwo?: string
  choiceThree?: string
  choiceFour?: string
  actualAnswer?: string
  point?: number
  category?: string
  questionType?: QuestionType
  questionMusicPath?: string | null
  answerMusicPath?: string | null
  imagePath?: string | null
}

/** Episode metadata plus stage layout from local SQLite. */
export interface EpisodeDetail {
  episode: Episode
  stageConfigs: StageConfig[]
}
