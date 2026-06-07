/** Progress events emitted from main process during ZIP export. */
export interface ExportProgressEvent {
  step: string
  message: string
  /** 0–100 */
  percent: number
}
