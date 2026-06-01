import { clipboard, dialog } from 'electron'
import * as fs from 'fs'
import * as db from '../db/databaseService'
import { buildLegacyRows } from '../export/buildLegacyRows'
import { buildImportCompatibilityPreview } from '../preview/buildImportCompatibilityPreview'

export async function getImportCompatibilityPreview(episodeId: string) {
  const detail = await db.getEpisode(episodeId)
  if (!detail) {
    throw new Error('Episode not found.')
  }

  const questions = await db.listQuestions(episodeId)
  const { legacyRows } = buildLegacyRows(questions)

  return buildImportCompatibilityPreview({
    episodeId: detail.episode.id,
    episodeTitle: detail.episode.title,
    episodeSlug: detail.episode.slug,
    rows: legacyRows
  })
}

export async function copyImportCompatibilityPreviewJson(jsonText: string): Promise<void> {
  clipboard.writeText(jsonText)
}

export async function saveImportCompatibilityPreviewJson(
  jsonText: string,
  defaultName = 'questions.preview.json'
): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: 'Save Import Compatibility Preview',
    defaultPath: defaultName,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  try {
    fs.writeFileSync(result.filePath, jsonText, 'utf8')
  } catch (error) {
    throw new Error(
      `Failed to save preview JSON to "${result.filePath}". Details: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return result.filePath
}
