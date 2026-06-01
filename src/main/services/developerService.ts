import { app } from 'electron'
import * as db from '../db/databaseService'
import { buildDemoEpisodeSeed, ensureDemoMediaFiles } from '../dev/demoEpisodeFactory'
import { getSettings } from './settingsService'

export async function createDemoEpisode() {
  if (app.isPackaged) {
    throw new Error('Demo episode generator is available only in development builds.')
  }

  const episodes = await db.listEpisodes()
  const mediaPaths = ensureDemoMediaFiles()
  const settings = getSettings()
  const seed = buildDemoEpisodeSeed({
    existingSlugs: episodes.map((episode) => episode.slug),
    mediaPaths
  })

  const detail = await db.createEpisode({
    ...seed.episode,
    appVersion: settings.defaultAppVersion,
    exportVersion: settings.defaultExportVersion
  })

  await Promise.all(
    seed.questions.map((question) =>
      db.upsertQuestion({
        ...question,
        episodeId: detail.episode.id
      })
    )
  )

  return {
    episodeId: detail.episode.id,
    title: detail.episode.title,
    slug: detail.episode.slug,
    questionCount: seed.questions.length,
    mediaDirectory: mediaPaths.mediaDirectory
  }
}
