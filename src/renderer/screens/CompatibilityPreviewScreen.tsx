import { useCallback, useEffect, useState } from 'react'
import type { Episode } from '../../shared/episode'
import type {
  ImportCompatibilityPreview,
  ImportCompatibilityWarning
} from '../../shared/import-compatibility'
import { Alert } from '../components/Alert'
import { PlaceholderScreen } from './PlaceholderScreen'

interface Props {
  episodeId: string | null
  onSelectEpisode?: (id: string) => void
  onGoToEpisodes?: () => void
}

function formatWarningLocation(warning: ImportCompatibilityWarning): string {
  const parts: string[] = []

  if (warning.stageNo !== undefined) {
    parts.push(`Stage ${warning.stageNo}`)
  }

  if (warning.questionNo !== undefined) {
    parts.push(`Q${warning.questionNo}`)
  }

  if (warning.field) {
    parts.push(warning.field)
  }

  return parts.join(' · ')
}

export function CompatibilityPreviewScreen({
  episodeId,
  onSelectEpisode,
  onGoToEpisodes
}: Props): React.ReactElement {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('')
  const [preview, setPreview] = useState<ImportCompatibilityPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    window.producerApi.episodes
      .list()
      .then(setEpisodes)
      .catch((loadError) => {
        console.error('Failed to load episodes list', loadError)
      })
  }, [episodeId])

  useEffect(() => {
    if (episodeId) {
      setSelectedEpisodeId(episodeId)
    } else if (!selectedEpisodeId && episodes.length > 0) {
      setSelectedEpisodeId(episodes[0].id)
    }
  }, [episodeId, episodes, selectedEpisodeId])

  const loadPreview = useCallback(async (nextEpisodeId: string) => {
    if (!nextEpisodeId) {
      setPreview(null)
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const nextPreview = await window.producerApi.getImportCompatibilityPreview(nextEpisodeId)
      setPreview(nextPreview)
    } catch (loadError) {
      setPreview(null)
      setError(loadError instanceof Error ? loadError.message : 'Failed to build preview')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEpisodeId) {
      void loadPreview(selectedEpisodeId)
    }
  }, [selectedEpisodeId, loadPreview])

  function handleEpisodeChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const nextEpisodeId = event.target.value
    setSelectedEpisodeId(nextEpisodeId)
    onSelectEpisode?.(nextEpisodeId)
  }

  async function handleCopyJson(): Promise<void> {
    if (!preview) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await window.producerApi.copyImportCompatibilityPreviewJson(preview.jsonPreview)
      setSuccess('Copied JSON preview to clipboard.')
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Failed to copy preview JSON')
    }
  }

  async function handleSavePreview(): Promise<void> {
    if (!preview) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const savedPath = await window.producerApi.saveImportCompatibilityPreviewJson(
        preview.jsonPreview,
        'questions.preview.json'
      )

      if (savedPath) {
        setSuccess(`Saved debug preview JSON to ${savedPath}`)
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save preview JSON')
    }
  }

  if (!episodeId && episodes.length === 0 && !loading) {
    return (
      <PlaceholderScreen
        title="No episodes yet"
        description="Create an episode first, then preview how its questions will look in the legacy MySQL import format."
        actionLabel={onGoToEpisodes ? 'Go to Episodes' : undefined}
        onAction={onGoToEpisodes}
      />
    )
  }

  return (
    <section className="screen compatibility-preview-screen">
      <div className="screen-header">
        <div>
          <h2>Import Compatibility Preview</h2>
          <p className="muted">
            Preview only. This does not connect to MySQL, insert rows, or modify the live
            dashboard app.
          </p>
        </div>
      </div>

      <div className="card compatibility-preview-toolbar">
        <div className="compatibility-preview-toolbar__row">
          <div>
            <label htmlFor="compatibility-episode-select" style={{ fontWeight: 'bold' }}>
              Select Episode:
            </label>
            <select
              id="compatibility-episode-select"
              className="form-control"
              value={selectedEpisodeId}
              onChange={handleEpisodeChange}
              disabled={loading}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {episodes.length === 0 && <option value="">No episodes available</option>}
              {episodes.map((episode) => (
                <option key={episode.id} value={episode.id}>
                  {episode.title} ({episode.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="compatibility-preview-toolbar__actions">
            <button type="button" className="btn" onClick={() => void loadPreview(selectedEpisodeId)}>
              Refresh Preview
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void handleCopyJson()}
              disabled={!preview}
            >
              Copy JSON Preview
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void handleSavePreview()}
              disabled={!preview}
            >
              Save questions.preview.json
            </button>
          </div>
        </div>
      </div>

      <Alert variant="error" message={error} />
      <Alert variant="success" message={success} />

      {loading && <p className="muted">Building legacy compatibility preview...</p>}

      {preview && (
        <>
          <div
            className={`validation-status validation-status--${preview.warnings.length === 0 ? 'ok' : 'fail'}`}
          >
            <strong>
              {preview.warnings.length === 0
                ? 'Legacy-compatible preview looks clean'
                : 'Compatibility warnings detected'}
            </strong>
            <span>
              Episode {preview.episodeTitle} (<code>{preview.episodeSlug}</code>) ·{' '}
              {preview.rows.length} row(s) · {preview.warnings.length} warning(s)
            </span>
          </div>

          {preview.warnings.length > 0 && (
            <section className="validation-block validation-block--warning">
              <h3>Compatibility warnings ({preview.warnings.length})</h3>
              <ul className="validation-issue-list">
                {preview.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`} className="validation-issue">
                    <span className="validation-issue__code">{warning.code}</span>
                    {formatWarningLocation(warning) && (
                      <span className="validation-issue__location">
                        {formatWarningLocation(warning)}
                      </span>
                    )}
                    <p className="validation-issue__message">{warning.message}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="table-wrap">
            <table className="data-table compatibility-preview-table">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>question_no</th>
                  <th>Stage_No</th>
                  <th>choice_one</th>
                  <th>choice_two</th>
                  <th>choice_three</th>
                  <th>choice_four</th>
                  <th>actual_answer</th>
                  <th>asked_flag</th>
                  <th>point</th>
                  <th>url_question</th>
                  <th>url_answer</th>
                  <th>category</th>
                  <th>url_picture</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={`${row.Stage_No}-${row.question_no}-${index}`}>
                    <td>{row.Id === null ? 'null' : row.Id ?? ''}</td>
                    <td>{row.question_no}</td>
                    <td>{row.Stage_No}</td>
                    <td>{row.choice_one}</td>
                    <td>{row.choice_two}</td>
                    <td>{row.choice_three}</td>
                    <td>{row.choice_four}</td>
                    <td>{row.actual_answer}</td>
                    <td>{row.asked_flag}</td>
                    <td>{row.point}</td>
                    <td>
                      <code>{row.url_question}</code>
                    </td>
                    <td>
                      <code>{row.url_answer}</code>
                    </td>
                    <td>{row.category}</td>
                    <td>
                      <code>{row.url_picture}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!preview && !loading && !error && (
        <div className="placeholder-card">
          <p>Select an episode to generate a legacy row preview.</p>
        </div>
      )}
    </section>
  )
}
