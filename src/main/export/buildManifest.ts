import { APP_VERSION, EXPORT_VERSION } from '../../shared/constants'
import type { Episode } from '../../shared/episode'
import type { StageConfig } from '../../shared/stage-config'
import type { Question } from '../../shared/question'
import type { MediaCopyPlanEntry } from './buildLegacyRows'

export interface ExportManifestStage {
  stageNo: number
  label: string
  questionCount: number
  sortOrder: number
}

export interface ExportManifestQuestionType {
  stageNo: number
  questionNo: number
  questionType: string
}

export interface ExportManifestMediaFile {
  kind: 'questionMusic' | 'answerMusic' | 'image'
  stageNo: number
  questionNo: number
  relativePath: string
  originalFilename: string
}

export interface ExportManifestLegacyCompatibility {
  tableName: 'questions'
  databaseName: 'questions'
  askedFlagDefault: 0
  pathsAreRelative: true
  importerMustRewriteMediaPaths: true
}

export interface ExportManifestTotals {
  totalQuestions: number
  totalStages: number
  totalMediaFiles: number
}

export interface ExportManifest {
  exportVersion: string
  appVersion: string
  createdAt: string
  episode: {
    id: string
    title: string
    slug: string
    description: string
    producerName: string
  }
  stageCounts: ExportManifestStage[]
  questionTypes: ExportManifestQuestionType[]
  mediaFiles: ExportManifestMediaFile[]
  legacyCompatibility: ExportManifestLegacyCompatibility
  totals: ExportManifestTotals
}

/**
 * Extract filename from any filesystem path (Windows or Unix).
 */
function getBasename(pathStr: string): string {
  const parts = pathStr.split(/[/\\]/)
  return parts[parts.length - 1] || ''
}

/**
 * Construct the export manifest object.
 * Guaranteed to containing no absolute local directories or user-identifying PC paths.
 */
export function buildManifest(
  episode: Episode,
  stageConfigs: StageConfig[],
  questions: Question[],
  mediaCopyPlan: MediaCopyPlanEntry[]
): ExportManifest {
  // Sort stages by sortOrder
  const sortedStages = [...stageConfigs].sort((a, b) => a.sortOrder - b.sortOrder)
  const mappedStages: ExportManifestStage[] = sortedStages.map((s) => ({
    stageNo: s.stageNo,
    label: s.label,
    questionCount: s.questionCount,
    sortOrder: s.sortOrder
  }))

  // Sort questions to align metadata chronologically/numerically
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.stageNo !== b.stageNo) return a.stageNo - b.stageNo
    return a.questionNo - b.questionNo
  })

  const mappedQuestionTypes: ExportManifestQuestionType[] = sortedQuestions.map((q) => ({
    stageNo: q.stageNo,
    questionNo: q.questionNo,
    questionType: q.questionType
  }))

  // Map mediaCopyPlan into relative manifest entries
  const mappedMediaFiles: ExportManifestMediaFile[] = mediaCopyPlan.map((item) => ({
    kind: item.kind,
    stageNo: item.stageNo,
    questionNo: item.questionNo,
    relativePath: item.targetRelativePath,
    originalFilename: getBasename(item.sourceAbsolutePath)
  }))

  return {
    exportVersion: EXPORT_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    episode: {
      id: episode.id,
      title: episode.title,
      slug: episode.slug,
      description: episode.description || '',
      producerName: episode.producerName || ''
    },
    stageCounts: mappedStages,
    questionTypes: mappedQuestionTypes,
    mediaFiles: mappedMediaFiles,
    legacyCompatibility: {
      tableName: 'questions',
      databaseName: 'questions',
      askedFlagDefault: 0,
      pathsAreRelative: true,
      importerMustRewriteMediaPaths: true
    },
    totals: {
      totalQuestions: sortedQuestions.length,
      totalStages: mappedStages.length,
      totalMediaFiles: mappedMediaFiles.length
    }
  }
}
