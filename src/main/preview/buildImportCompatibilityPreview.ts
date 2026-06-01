import type {
  ImportCompatibilityPreview,
  ImportCompatibilityWarning
} from '../../shared/import-compatibility'
import type { LegacyQuestionRow } from '../../shared/legacy-question-row'

const LEGACY_FIELD_NAMES = [
  'Id',
  'question_no',
  'Stage_No',
  'choice_one',
  'choice_two',
  'choice_three',
  'choice_four',
  'actual_answer',
  'asked_flag',
  'point',
  'url_question',
  'url_answer',
  'category',
  'url_picture'
] as const

function looksAbsolutePath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value) || /^\//.test(value)
}

function isSortedByStageAndQuestion(rows: LegacyQuestionRow[]): boolean {
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]
    const current = rows[index]

    if (current.Stage_No < previous.Stage_No) {
      return false
    }

    if (
      current.Stage_No === previous.Stage_No &&
      current.question_no < previous.question_no
    ) {
      return false
    }
  }

  return true
}

export function detectImportCompatibilityWarnings(
  rows: LegacyQuestionRow[]
): ImportCompatibilityWarning[] {
  const warnings: ImportCompatibilityWarning[] = []

  rows.forEach((row, rowIndex) => {
    for (const fieldName of LEGACY_FIELD_NAMES) {
      if (!(fieldName in row) || row[fieldName] === undefined) {
        warnings.push({
          code: 'MISSING_LEGACY_FIELD',
          message: `Legacy field "${fieldName}" is missing from preview row ${rowIndex + 1}.`,
          rowIndex,
          field: fieldName,
          stageNo: row.Stage_No,
          questionNo: row.question_no
        })
      }
    }

    if (row.asked_flag !== 0) {
      warnings.push({
        code: 'ASKED_FLAG_NOT_ZERO',
        message: `asked_flag must be 0 in legacy preview rows, but row ${rowIndex + 1} has ${row.asked_flag}.`,
        rowIndex,
        field: 'asked_flag',
        stageNo: row.Stage_No,
        questionNo: row.question_no
      })
    }

    for (const fieldName of ['url_question', 'url_answer', 'url_picture'] as const) {
      const value = row[fieldName]
      if (value && looksAbsolutePath(value)) {
        warnings.push({
          code: 'ABSOLUTE_MEDIA_PATH',
          message: `Legacy field "${fieldName}" must stay relative inside the package, but row ${rowIndex + 1} looks absolute.`,
          rowIndex,
          field: fieldName,
          stageNo: row.Stage_No,
          questionNo: row.question_no
        })
      }
    }

    const previewRow = row as LegacyQuestionRow & {
      questionType?: unknown
      question_type?: unknown
    }

    if ('questionType' in previewRow || 'question_type' in previewRow) {
      warnings.push({
        code: 'QUESTION_TYPE_IN_LEGACY_ROW',
        message: `Legacy preview row ${rowIndex + 1} contains question type data, which is not compatible with the live MySQL questions table.`,
        rowIndex,
        stageNo: row.Stage_No,
        questionNo: row.question_no
      })
    }
  })

  if (!isSortedByStageAndQuestion(rows)) {
    warnings.push({
      code: 'ROWS_NOT_SORTED',
      message: 'Legacy preview rows are not sorted by Stage_No and question_no.'
    })
  }

  return warnings
}

export function buildImportCompatibilityPreview(input: {
  episodeId: string
  episodeTitle: string
  episodeSlug: string
  rows: LegacyQuestionRow[]
}): ImportCompatibilityPreview {
  return {
    episodeId: input.episodeId,
    episodeTitle: input.episodeTitle,
    episodeSlug: input.episodeSlug,
    rows: input.rows,
    warnings: detectImportCompatibilityWarnings(input.rows),
    jsonPreview: JSON.stringify(input.rows, null, 2)
  }
}
