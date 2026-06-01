/**
 * Producer-only classification — not stored on live MySQL `questions` rows.
 * Exported inside manifest.json for the live dashboard importer.
 */
export type QuestionType = 'normal' | 'final' | 'bonus' | 'jackpot'
