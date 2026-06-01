/**
 * Episode metadata stored in the local producer database and echoed in manifest.json.
 * Timestamps are ISO 8601 strings for JSON-safe transfer across main/renderer.
 */
export interface Episode {
  id: string
  title: string
  /** URL-safe identifier; used in LeyuTune_Episode_<slug>.zip filename. */
  slug: string
  description: string
  producerName: string
  createdAt: string
  updatedAt: string
  /** App build that last touched this episode (informational). */
  appVersion: string
  /** Export package format version last written for this episode (informational). */
  exportVersion: string
}
