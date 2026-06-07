import { describe, it, expect } from 'vitest'
import { buildManifest } from './buildManifest'
import type { Episode } from '../../shared/episode'
import type { StageConfig } from '../../shared/stage-config'
import type { Question } from '../../shared/question'
import type { MediaCopyPlanEntry } from './buildLegacyRows'

const mockEpisode: Episode = {
  id: 'episode-1',
  title: 'Epic Quiz Show',
  slug: 'epic-quiz-show',
  description: 'Test Description',
  producerName: 'Jane Doe',
  appVersion: '0.1.0',
  exportVersion: '1.0.0',
  createdAt: '2026-06-01T12:00:00.000Z',
  updatedAt: '2026-06-01T12:00:00.000Z'
}

const mockStageConfigs: StageConfig[] = [
  { id: 'sc-1', episodeId: 'episode-1', stageNo: 1, label: 'Stage 1', questionCount: 15, sortOrder: 1 },
  { id: 'sc-2', episodeId: 'episode-1', stageNo: 2, label: 'Stage 2', questionCount: 10, sortOrder: 2 }
]

const mockQuestions: Question[] = [
  {
    id: 'q-1',
    episodeId: 'episode-1',
    stageNo: 1,
    questionNo: 1,
    choiceOne: 'A',
    choiceTwo: 'B',
    choiceThree: 'C',
    choiceFour: 'D',
    actualAnswer: 'A',
    point: 100,
    category: 'General',
    questionType: 'normal',
    questionMusicPath: 'C:\\Users\\User\\Music\\song1.mp3',
    answerMusicPath: '',
    imagePath: '',
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z'
  },
  {
    id: 'q-2',
    episodeId: 'episode-1',
    stageNo: 2,
    questionNo: 1,
    choiceOne: 'X',
    choiceTwo: 'Y',
    choiceThree: 'Z',
    choiceFour: 'W',
    actualAnswer: 'X',
    point: 500,
    category: 'Bonus',
    questionType: 'bonus',
    questionMusicPath: '',
    answerMusicPath: '',
    imagePath: '/Users/admin/Images/picture.jpg',
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z'
  }
]

const mockMediaCopyPlan: MediaCopyPlanEntry[] = [
  {
    sourceAbsolutePath: 'C:\\Users\\User\\Music\\song1.mp3',
    targetRelativePath: 'music/questions/stage1_q001.mp3',
    kind: 'questionMusic',
    stageNo: 1,
    questionNo: 1
  },
  {
    sourceAbsolutePath: '/Users/admin/Images/picture.jpg',
    targetRelativePath: 'images/stage2_q001.jpg',
    kind: 'image',
    stageNo: 2,
    questionNo: 1
  }
]

describe('Manifest builder', () => {
  it('should include episode metadata and export metadata', () => {
    const manifest = buildManifest(mockEpisode, mockStageConfigs, mockQuestions, mockMediaCopyPlan)

    expect(manifest.episode).toEqual({
      id: 'episode-1',
      title: 'Epic Quiz Show',
      slug: 'epic-quiz-show',
      description: 'Test Description',
      producerName: 'Jane Doe'
    })
    expect(manifest.appVersion).toBe('0.1.0')
    expect(manifest.formatVersion).toBe(1)
    expect(manifest.exportVersion).toBe('1.0.0')
    expect(new Date(manifest.createdAt).toString()).not.toBe('Invalid Date')
  })

  it('should generate a manifest containing no absolute producer PC paths', () => {
    const manifest = buildManifest(mockEpisode, mockStageConfigs, mockQuestions, mockMediaCopyPlan)

    const manifestJsonString = JSON.stringify(manifest)

    // Ensure absolute directories or absolute indicators (C:\ or /Users) are not in the JSON output
    expect(manifestJsonString).not.toContain('C:\\Users')
    expect(manifestJsonString).not.toContain('/Users/admin')
    expect(manifestJsonString).not.toContain(mockQuestions[0].questionMusicPath)
    expect(manifestJsonString).not.toContain(mockQuestions[1].imagePath)

    // Filenames must be short base names, not paths
    expect(manifest.mediaFiles[0].originalFilename).toBe('song1.mp3')
    expect(manifest.mediaFiles[1].originalFilename).toBe('picture.jpg')

    // Relative paths in manifest must be relative only
    expect(manifest.mediaFiles[0].relativePath).toBe('music/questions/stage1_q001.mp3')
    expect(manifest.mediaFiles[1].relativePath).toBe('images/stage2_q001.jpg')
  })

  it('should list questionType metadata for every question', () => {
    const manifest = buildManifest(mockEpisode, mockStageConfigs, mockQuestions, mockMediaCopyPlan)

    expect(manifest.questionTypes.length).toBe(2)
    expect(manifest.questionTypes[0]).toEqual({
      stageNo: 1,
      questionNo: 1,
      questionType: 'normal'
    })
    expect(manifest.questionTypes[1]).toEqual({
      stageNo: 2,
      questionNo: 1,
      questionType: 'bonus'
    })
  })

  it('should map stageConfigs correctly to stageCounts', () => {
    const manifest = buildManifest(mockEpisode, mockStageConfigs, mockQuestions, mockMediaCopyPlan)

    expect(manifest.stageCounts.length).toBe(2)
    expect(manifest.stageCounts[0]).toEqual({
      stageNo: 1,
      label: 'Stage 1',
      questionCount: 15,
      sortOrder: 1
    })
    expect(manifest.stageCounts[1]).toEqual({
      stageNo: 2,
      label: 'Stage 2',
      questionCount: 10,
      sortOrder: 2
    })
  })

  it('should compute totals correctly', () => {
    const manifest = buildManifest(mockEpisode, mockStageConfigs, mockQuestions, mockMediaCopyPlan)

    expect(manifest.totals).toEqual({
      totalQuestions: 2,
      totalStages: 2,
      totalMediaFiles: 2
    })
  })

  it('should include the legacy compatibility block with required flags', () => {
    const manifest = buildManifest(mockEpisode, mockStageConfigs, mockQuestions, mockMediaCopyPlan)

    expect(manifest.legacyCompatibility).toEqual({
      tableName: 'questions',
      databaseName: 'questions',
      askedFlagDefault: 0,
      pathsAreRelative: true,
      importerMustRewriteMediaPaths: true
    })
  })
})
