import { dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import AdmZip from 'adm-zip'
import type { ExportEpisodeResult } from '../../shared/export'
import type { ExportProgressEvent } from '../../shared/export-progress'
import * as db from '../db/databaseService'
import { validateEpisode } from '../validation/validationService'
import { buildLegacyRows } from '../export/buildLegacyRows'
import { buildManifest } from '../export/buildManifest'
import { getSettings } from './settingsService'
import { logError, logInfo, logWarn } from './loggerService'

export type ExportProgressReporter = (progress: ExportProgressEvent) => void

function reportProgress(
  onProgress: ExportProgressReporter | undefined,
  step: string,
  message: string,
  percent: number
): void {
  onProgress?.({ step, message, percent })
}
export async function chooseExportDestination(defaultName?: string): Promise<string | null> {
  try {
    const settings = getSettings()
    const defaultPath =
      settings.defaultExportFolder.trim() && defaultName
        ? path.join(settings.defaultExportFolder, defaultName)
        : defaultName || 'LeyuTune_Episode.zip'

    const result = await dialog.showSaveDialog({
      title: 'Export Episode ZIP',
      defaultPath,
      filters: [
        { name: 'ZIP Archives', extensions: ['zip'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return null
    }
    return result.filePath
  } catch (error) {
    logError('filePicker.exportDestination.failure', 'Failed to open export destination picker.', {
      defaultName,
      error
    })
    throw new Error('Failed to choose the export destination.')
  }
}

function buildZipFileName(episodeSlug: string): string {
  return `LeyuTune_Episode_${episodeSlug}.zip`
}

function resolveDestinationZipPath(destinationPath: string, episodeSlug: string): string {
  const trimmedDestination = destinationPath.trim()
  if (!trimmedDestination) {
    throw new Error('Export destination is required.')
  }

  if (!path.isAbsolute(trimmedDestination)) {
    throw new Error(
      'Export destination must be an absolute folder path or absolute .zip path. Please choose a destination folder first.'
    )
  }

  const expectedZipName = buildZipFileName(episodeSlug)
  if (trimmedDestination.toLowerCase().endsWith('.zip')) {
    return path.join(path.dirname(trimmedDestination), expectedZipName)
  }

  return path.join(trimmedDestination, expectedZipName)
}

function assertUniqueMediaTargets(targetRelativePaths: string[]): void {
  const seenTargets = new Set<string>()

  for (const targetRelativePath of targetRelativePaths) {
    if (seenTargets.has(targetRelativePath)) {
      throw new Error(
        `Export failed: Duplicate target relative path detected in media copy plan: "${targetRelativePath}".`
      )
    }

    seenTargets.add(targetRelativePath)
  }
}

/**
 * Main episode export process:
 * 1. Validate episode. If errors exist, block export.
 * 2. Stage files in temporary directory.
 * 3. Write manifest.json and questions.json (legacy format).
 * 4. Copy media files.
 * 5. Zip and clean up.
 */
export async function exportEpisode(
  episodeId: string,
  destinationPath: string,
  onProgress?: ExportProgressReporter
): Promise<ExportEpisodeResult> {
  let tempDir: string | null = null
  let zipPath = ''

  try {
    reportProgress(onProgress, 'prepare', 'Loading episode…', 5)
    const settings = getSettings()

    // 1. Fetch episode and stage configs.
    const detail = await db.getEpisode(episodeId)
    if (!detail) {
      return { success: false, error: 'Episode not found.' }
    }

    zipPath = resolveDestinationZipPath(destinationPath, detail.episode.slug)
    logInfo('export.start', 'Episode export started.', {
      episodeId,
      episodeSlug: detail.episode.slug,
      destinationPath,
      zipPath
    })

    // 2. Validate episode.
    reportProgress(onProgress, 'validate', 'Running validation checks…', 15)
    const validation = await validateEpisode(episodeId)
    if (!validation.isValid) {
      logWarn('export.blocked.validationErrors', 'Episode export blocked by validation errors.', {
        episodeId,
        episodeSlug: detail.episode.slug,
        totalErrors: validation.summary.totalErrors,
        totalWarnings: validation.summary.totalWarnings
      })
      return {
        success: false,
        error: 'Export blocked: Episode has validation errors. Please correct them first.',
        validation
      }
    }

    if (
      validation.summary.totalWarnings > 0 &&
      !settings.allowExportWithWarnings
    ) {
      logWarn('export.blocked.validationWarnings', 'Episode export blocked by warnings per producer settings.', {
        episodeId,
        episodeSlug: detail.episode.slug,
        totalWarnings: validation.summary.totalWarnings
      })
      return {
        success: false,
        error:
          'Export blocked: warnings are present and the current producer settings do not allow export with warnings.',
        validation
      }
    }

    // 3. Fetch all questions.
    reportProgress(onProgress, 'build', 'Building legacy question rows…', 25)
    const questions = await db.listQuestions(episodeId)

    // 4. Build legacy rows and media copy plan.
    const { legacyRows, mediaCopyPlan } = buildLegacyRows(questions)
    assertUniqueMediaTargets(mediaCopyPlan.map((plan) => plan.targetRelativePath))

    // 5. Build manifest.
    const manifest = buildManifest(detail.episode, detail.stageConfigs, questions, mediaCopyPlan)

    // 6. Create a temporary staging folder inside the workspace.
    reportProgress(onProgress, 'stage', 'Creating temporary staging folder…', 30)
    const tempDirName = `.temp-export-${episodeId}-${Date.now()}`
    tempDir = path.join(process.cwd(), tempDirName)
    try {
      fs.mkdirSync(tempDir, { recursive: true })
    } catch (error) {
      throw new Error(
        `Failed to create temporary export folder: "${tempDir}". Details: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // 7. Write manifest.json.
    reportProgress(onProgress, 'write-json', 'Writing manifest.json…', 40)
    try {
      fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    } catch (error) {
      throw new Error(
        `Failed to write manifest.json. Details: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // 8. Write db/questions.json.
    reportProgress(onProgress, 'write-json', 'Writing db/questions.json…', 45)
    const dbDir = path.join(tempDir, 'db')
    try {
      fs.mkdirSync(dbDir, { recursive: true })
      fs.writeFileSync(path.join(dbDir, 'questions.json'), JSON.stringify(legacyRows, null, 2), 'utf8')
    } catch (error) {
      throw new Error(
        `Failed to write db/questions.json. Details: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // 9. Copy media files according to plan.
    const totalMedia = mediaCopyPlan.length
    for (let index = 0; index < mediaCopyPlan.length; index += 1) {
      const plan = mediaCopyPlan[index]
      const mediaPercent = totalMedia > 0 ? 50 + Math.round(((index + 1) / totalMedia) * 30) : 80
      reportProgress(
        onProgress,
        'copy-media',
        `Copying media ${index + 1} of ${totalMedia}…`,
        mediaPercent
      )
      const destFile = path.join(tempDir, plan.targetRelativePath)
      const destSubDir = path.dirname(destFile)
      try {
        fs.mkdirSync(destSubDir, { recursive: true })
      } catch (error) {
        throw new Error(
          `Failed to prepare media destination folder: "${destSubDir}". Details: ${error instanceof Error ? error.message : String(error)}`
        )
      }

      if (!fs.existsSync(plan.sourceAbsolutePath)) {
        logError('export.mediaCopy.missingSource', 'Media file missing during export staging.', {
          episodeId,
          episodeSlug: detail.episode.slug,
          sourceAbsolutePath: plan.sourceAbsolutePath,
          targetRelativePath: plan.targetRelativePath,
          stageNo: plan.stageNo,
          questionNo: plan.questionNo
        })
        throw new Error(
          `Media file not found on disk at source: "${plan.sourceAbsolutePath}" for question stage ${plan.stageNo}, Q${plan.questionNo}.`
        )
      }

      try {
        fs.copyFileSync(plan.sourceAbsolutePath, destFile)
      } catch (err) {
        logError('export.mediaCopy.failure', 'Failed to copy media file during export staging.', {
          episodeId,
          episodeSlug: detail.episode.slug,
          sourceAbsolutePath: plan.sourceAbsolutePath,
          destinationPath: destFile,
          targetRelativePath: plan.targetRelativePath,
          stageNo: plan.stageNo,
          questionNo: plan.questionNo,
          error: err
        })
        throw new Error(
          `Failed to copy media file to staging area: "${plan.sourceAbsolutePath}" -> "${destFile}". Details: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    // 10. Create the ZIP file.
    reportProgress(onProgress, 'zip', 'Creating ZIP archive…', 90)
    const zip = new AdmZip()
    zip.addLocalFolder(tempDir)

    const destParent = path.dirname(zipPath)
    try {
      fs.mkdirSync(destParent, { recursive: true })
    } catch (error) {
      throw new Error(
        `Failed to prepare export destination folder: "${destParent}". Details: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    try {
      zip.writeZip(zipPath)
    } catch (err) {
      logError('export.zip.failure', 'Failed to create export zip file.', {
        episodeId,
        episodeSlug: detail.episode.slug,
        zipPath,
        error: err
      })
      throw new Error(
        `Failed to write ZIP file to destination: "${zipPath}". Details: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    if (!fs.existsSync(zipPath)) {
      throw new Error(`Export reported success but no ZIP file was found at "${zipPath}".`)
    }

    // 11. Clean up staging area unless debug mode is enabled.
    if (process.env.DEBUG_EXPORT !== 'true' && !settings.keepTemporaryExportFolder) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }

    logInfo('export.success', 'Episode export completed successfully.', {
      episodeId,
      episodeSlug: detail.episode.slug,
      zipPath
    })

    reportProgress(onProgress, 'complete', 'Export finished.', 100)

    return {
      success: true,
      zipPath,
      validation
    }
  } catch (error) {
    logError('export.failure', 'Episode export failed.', {
      episodeId,
      zipPath: zipPath || null,
      tempDir,
      error
    })

    // Attempt cleanup if an error occurred before deletion.
    if (
      tempDir &&
      fs.existsSync(tempDir) &&
      process.env.DEBUG_EXPORT !== 'true' &&
      !getSettings().keepTemporaryExportFolder
    ) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true })
      } catch (e) {
        logError('export.cleanup.failure', 'Failed to clean up export staging directory after error.', {
          tempDir,
          error: e
        })
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
