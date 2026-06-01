import { APP_VERSION, DEFAULT_STAGE_CONFIGS, EXPORT_VERSION } from '../../shared/constants'
import type {
  CreateEpisodeInput,
  EpisodeDetail,
  UpdateEpisodeInput,
  UpsertQuestionInput,
  UpsertStageConfigInput
} from '../../shared/db-inputs'
import type { Episode } from '../../shared/episode'
import type { Question } from '../../shared/question'
import type { StageConfig } from '../../shared/stage-config'
import { getPrisma } from './client'
import { mapEpisode, mapQuestion, mapStageConfig } from './mappers'
import { logInfo } from '../services/loggerService'

export async function createEpisode(input: CreateEpisodeInput): Promise<EpisodeDetail> {
  const prisma = getPrisma()

  const result = await prisma.$transaction(async (tx) => {
    const episode = await tx.episode.create({
      data: {
        title: input.title.trim(),
        slug: input.slug.trim().toLowerCase(),
        description: input.description?.trim() || null,
        producerName: input.producerName?.trim() || null,
        appVersion: input.appVersion?.trim() || APP_VERSION,
        exportVersion: input.exportVersion?.trim() || EXPORT_VERSION
      }
    })

    const stageConfigs = await Promise.all(
      DEFAULT_STAGE_CONFIGS.map((cfg) =>
        tx.stageConfig.create({
          data: {
            episodeId: episode.id,
            stageNo: cfg.stageNo,
            label: cfg.label,
            questionCount: cfg.questionCount,
            sortOrder: cfg.sortOrder
          }
        })
      )
    )

    return { episode, stageConfigs }
  })

  const detail = {
    episode: mapEpisode(result.episode),
    stageConfigs: result.stageConfigs.map(mapStageConfig)
  }

  logInfo('episode.create', 'Episode created.', {
    episodeId: detail.episode.id,
    slug: detail.episode.slug
  })

  return detail
}

export async function listEpisodes(): Promise<Episode[]> {
  const rows = await getPrisma().episode.findMany({
    orderBy: { updatedAt: 'desc' }
  })
  return rows.map(mapEpisode)
}

export async function getEpisode(id: string): Promise<EpisodeDetail | null> {
  const row = await getPrisma().episode.findUnique({
    where: { id },
    include: {
      stageConfigs: { orderBy: { sortOrder: 'asc' } }
    }
  })

  if (!row) return null

  const { stageConfigs, ...episode } = row
  return {
    episode: mapEpisode(episode),
    stageConfigs: stageConfigs.map(mapStageConfig)
  }
}

export async function updateEpisode(input: UpdateEpisodeInput): Promise<Episode> {
  const row = await getPrisma().episode.update({
    where: { id: input.id },
    data: {
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.slug !== undefined && { slug: input.slug.trim().toLowerCase() }),
      ...(input.description !== undefined && {
        description: input.description.trim() || null
      }),
      ...(input.producerName !== undefined && {
        producerName: input.producerName.trim() || null
      }),
      ...(input.appVersion !== undefined && { appVersion: input.appVersion }),
      ...(input.exportVersion !== undefined && { exportVersion: input.exportVersion })
    }
  })
  const episode = mapEpisode(row)
  logInfo('episode.update', 'Episode updated.', {
    episodeId: episode.id,
    slug: episode.slug
  })
  return episode
}

export async function deleteEpisode(id: string): Promise<void> {
  const existing = await getPrisma().episode.findUnique({
    where: { id },
    select: { id: true, slug: true }
  })
  await getPrisma().episode.delete({ where: { id } })
  logInfo('episode.delete', 'Episode deleted.', {
    episodeId: id,
    slug: existing?.slug ?? null
  })
}

export async function upsertStageConfigs(
  episodeId: string,
  configs: UpsertStageConfigInput[]
): Promise<StageConfig[]> {
  const prisma = getPrisma()

  const rows = await prisma.$transaction(
    configs.map((cfg) =>
      prisma.stageConfig.upsert({
        where: {
          episodeId_stageNo: { episodeId, stageNo: cfg.stageNo }
        },
        create: {
          episodeId,
          stageNo: cfg.stageNo,
          label: cfg.label,
          questionCount: cfg.questionCount,
          sortOrder: cfg.sortOrder
        },
        update: {
          label: cfg.label,
          questionCount: cfg.questionCount,
          sortOrder: cfg.sortOrder
        }
      })
    )
  )

  return rows.map(mapStageConfig)
}

export async function listQuestions(episodeId: string): Promise<Question[]> {
  const rows = await getPrisma().question.findMany({
    where: { episodeId },
    orderBy: [{ stageNo: 'asc' }, { questionNo: 'asc' }]
  })
  return rows.map(mapQuestion)
}

export async function upsertQuestion(input: UpsertQuestionInput): Promise<Question> {
  const data = {
    episodeId: input.episodeId,
    stageNo: input.stageNo,
    questionNo: input.questionNo,
    choiceOne: input.choiceOne ?? '',
    choiceTwo: input.choiceTwo ?? '',
    choiceThree: input.choiceThree ?? '',
    choiceFour: input.choiceFour ?? '',
    actualAnswer: input.actualAnswer ?? '',
    point: input.point ?? 0,
    category: input.category?.trim() || null,
    questionType: input.questionType ?? 'normal',
    questionMusicPath: input.questionMusicPath ?? null,
    answerMusicPath: input.answerMusicPath ?? null,
    imagePath: input.imagePath ?? null
  }

  const prisma = getPrisma()
  const row = input.id
    ? await prisma.question.update({ where: { id: input.id }, data })
    : await prisma.question.upsert({
        where: {
          episodeId_stageNo_questionNo: {
            episodeId: input.episodeId,
            stageNo: input.stageNo,
            questionNo: input.questionNo
          }
        },
        create: data,
        update: data
      })

  return mapQuestion(row)
}

export async function deleteQuestion(id: string): Promise<void> {
  await getPrisma().question.delete({ where: { id } })
}
