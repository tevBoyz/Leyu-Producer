import { describe, expect, it } from 'vitest'
import {
  buildImportCompatibilityPreview,
  detectImportCompatibilityWarnings
} from './buildImportCompatibilityPreview'
import type { LegacyQuestionRow } from '../../shared/legacy-question-row'

function createLegacyRow(overrides: Partial<LegacyQuestionRow> = {}): LegacyQuestionRow {
  return {
    Id: null,
    question_no: 1,
    Stage_No: 1,
    choice_one: 'A',
    choice_two: 'B',
    choice_three: 'C',
    choice_four: 'D',
    actual_answer: 'A',
    asked_flag: 0,
    point: 100,
    url_question: 'music/questions/stage1_q001.mp3',
    url_answer: 'music/answers/stage1_q001_answer.mp3',
    category: 'General',
    url_picture: 'images/stage1_q001.jpg',
    ...overrides
  }
}

describe('detectImportCompatibilityWarnings', () => {
  it('returns no warnings for clean, sorted legacy rows', () => {
    const warnings = detectImportCompatibilityWarnings([
      createLegacyRow({ Stage_No: 1, question_no: 1 }),
      createLegacyRow({
        Stage_No: 1,
        question_no: 2,
        url_question: 'music/questions/stage1_q002.mp3',
        url_answer: 'music/answers/stage1_q002_answer.mp3',
        url_picture: 'images/stage1_q002.jpg'
      }),
      createLegacyRow({
        Stage_No: 2,
        question_no: 1,
        url_question: 'music/questions/stage2_q001.mp3',
        url_answer: 'music/answers/stage2_q001_answer.mp3',
        url_picture: 'images/stage2_q001.jpg'
      })
    ])

    expect(warnings).toEqual([])
  })

  it('warns when a legacy field is missing from a row', () => {
    const brokenRow = createLegacyRow() as Partial<LegacyQuestionRow>
    delete (brokenRow as Record<string, unknown>).choice_four

    const warnings = detectImportCompatibilityWarnings([brokenRow as LegacyQuestionRow])

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_LEGACY_FIELD',
          field: 'choice_four'
        })
      ])
    )
  })

  it('warns when a media path looks absolute', () => {
    const warnings = detectImportCompatibilityWarnings([
      createLegacyRow({
        url_question: 'C:\\Producer\\Audio\\stage1_q001.mp3'
      })
    ])

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ABSOLUTE_MEDIA_PATH',
          field: 'url_question'
        })
      ])
    )
  })

  it('warns when asked_flag is not 0', () => {
    const warnings = detectImportCompatibilityWarnings([
      createLegacyRow({
        asked_flag: 1
      })
    ])

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ASKED_FLAG_NOT_ZERO',
          field: 'asked_flag'
        })
      ])
    )
  })

  it('warns when rows are not sorted by Stage_No and question_no', () => {
    const warnings = detectImportCompatibilityWarnings([
      createLegacyRow({ Stage_No: 2, question_no: 1 }),
      createLegacyRow({ Stage_No: 1, question_no: 3 })
    ])

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ROWS_NOT_SORTED'
        })
      ])
    )
  })

  it('warns when question type data appears inside legacy rows', () => {
    const rowWithQuestionType = {
      ...createLegacyRow(),
      questionType: 'bonus'
    } as LegacyQuestionRow & { questionType: string }

    const warnings = detectImportCompatibilityWarnings([rowWithQuestionType])

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'QUESTION_TYPE_IN_LEGACY_ROW'
        })
      ])
    )
  })
})

describe('buildImportCompatibilityPreview', () => {
  it('builds pretty-printed JSON preview metadata for the selected episode', () => {
    const preview = buildImportCompatibilityPreview({
      episodeId: 'ep-1',
      episodeTitle: 'Legacy Episode',
      episodeSlug: 'legacy-episode',
      rows: [createLegacyRow()]
    })

    expect(preview.episodeId).toBe('ep-1')
    expect(preview.episodeTitle).toBe('Legacy Episode')
    expect(preview.episodeSlug).toBe('legacy-episode')
    expect(preview.rows).toHaveLength(1)
    expect(preview.warnings).toEqual([])
    expect(preview.jsonPreview).toBe(JSON.stringify(preview.rows, null, 2))
  })
})
