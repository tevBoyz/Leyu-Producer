/**
 * Per-episode stage layout (slot counts and display order).
 * stageNo values 1–3 are regular rounds; stageNo 4 is the final/bonus round by convention.
 */
export interface StageConfig {
  id: string
  episodeId: string
  stageNo: number
  label: string
  questionCount: number
  sortOrder: number
}
