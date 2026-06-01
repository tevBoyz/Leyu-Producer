import type { ValidationResult } from './validation'

/**
 * Result returned by the main-process export flow.
 * When export is blocked by validation, `validation` contains the latest result.
 */
export interface ExportEpisodeResult {
  success: boolean
  zipPath?: string
  error?: string
  validation?: ValidationResult
}
