import type {
  Episode as EpisodeRow,
  Question as QuestionRow,
  StageConfig as StageConfigRow
} from '../../../generated/prisma'
import type { Episode } from '../../shared/episode'
import type { Question } from '../../shared/question'
import type { QuestionType } from '../../shared/question-type'
import type { StageConfig } from '../../shared/stage-config'

export function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    producerName: row.producerName ?? '',
    appVersion: row.appVersion,
    exportVersion: row.exportVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

export function mapStageConfig(row: StageConfigRow): StageConfig {
  return {
    id: row.id,
    episodeId: row.episodeId,
    stageNo: row.stageNo,
    label: row.label,
    questionCount: row.questionCount,
    sortOrder: row.sortOrder
  }
}

export function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    episodeId: row.episodeId,
    stageNo: row.stageNo,
    questionNo: row.questionNo,
    choiceOne: row.choiceOne,
    choiceTwo: row.choiceTwo,
    choiceThree: row.choiceThree,
    choiceFour: row.choiceFour,
    actualAnswer: row.actualAnswer,
    point: row.point,
    category: row.category ?? '',
    questionType: row.questionType as QuestionType,
    questionMusicPath: row.questionMusicPath ?? '',
    answerMusicPath: row.answerMusicPath ?? '',
    imagePath: row.imagePath ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}
