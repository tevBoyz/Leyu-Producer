/** Stage 3 questions may omit multiple-choice fields; export still includes empty strings. */
export const STAGE_WITH_OPTIONAL_CHOICES = 3

export function areChoicesRequiredForStage(stageNo: number): boolean {
  return stageNo !== STAGE_WITH_OPTIONAL_CHOICES
}
