/** Result of a native file picker or media validation in the main process. */
export type MediaPickResult =
  | { canceled: true }
  | { canceled: false; path: string }
  | { canceled: false; error: string }

export interface FileExistsResult {
  exists: boolean
  error?: string
}

export interface AudioPreviewPayload {
  mimeType: string
  bytes: Uint8Array
}
