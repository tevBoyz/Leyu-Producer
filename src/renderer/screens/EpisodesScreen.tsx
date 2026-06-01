import { useCallback, useEffect, useState } from 'react'
import type { Episode } from '../../shared/episode'
import { Alert } from '../components/Alert'
import { formatDateTime } from '../utils/formatDate'

interface Props {
  onDataChanged?: () => void
  onCreate: () => void
  onEdit: (episodeId: string) => void
  onOpenQuestions: (episodeId: string) => void
  onValidate: (episodeId: string) => void
  onPreview: (episodeId: string) => void
  onExport: (episodeId: string) => void
  refreshKey?: number
}

export function EpisodesScreen({
  onDataChanged,
  onCreate,
  onEdit,
  onOpenQuestions,
  onValidate,
  onPreview,
  onExport,
  refreshKey = 0
}: Props): React.ReactElement {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [developerMode, setDeveloperMode] = useState(false)
  const [creatingDemo, setCreatingDemo] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadEpisodes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await window.producerApi.episodes.list()
      setEpisodes(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load episodes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEpisodes()
  }, [loadEpisodes, refreshKey])

  useEffect(() => {
  async function loadAppInfo() {
    const appApi = window.producerApi?.app;

    if (!appApi) {
      console.warn("window.producerApi.app is not available");
      return;
    }

    const version = await appApi.getVersion();
    setAppVersion(version);
  }

  loadAppInfo();
}, []);

  async function handleDelete(episode: Episode): Promise<void> {
    if (
      !confirm(
        `Delete "${episode.title}"?\n\nThis removes the episode and all questions from the local database.`
      )
    ) {
      return
    }

    setSuccess('')
    setError('')

    try {
      await window.producerApi.episodes.delete(episode.id)
      setSuccess(`Deleted "${episode.title}".`)
      await loadEpisodes()
      onDataChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function handleCreateDemoEpisode(): Promise<void> {
    if (
      !confirm(
        'Create a developer demo episode with placeholder questions and placeholder media?\n\nThis adds a new local demo episode and will not overwrite existing episodes.'
      )
    ) {
      return
    }

    setCreatingDemo(true)
    setSuccess('')
    setError('')

    try {
      const result = await window.producerApi.createDemoEpisode()
      setSuccess(
        `Created demo episode "${result.title}" with ${result.questionCount} questions. Demo media lives in ${result.mediaDirectory}.`
      )
      await loadEpisodes()
      onDataChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create demo episode')
    } finally {
      setCreatingDemo(false)
    }
  }

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <h2>Episodes</h2>
          <p className="muted">Local SQLite episodes only, not the live show database.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={onCreate}>
          Create Episode
        </button>
      </div>

      <Alert variant="error" message={error} />
      <Alert variant="success" message={success} />

      {developerMode && (
        <section className="card dev-tools-card">
          <div className="dev-tools-card__header">
            <div>
              <h3>Developer Demo Data</h3>
              <p className="muted">
                Developer-only helper for quickly testing UI, validation, compatibility preview,
                and export behavior.
              </p>
              <p className="muted">
                Warning: this creates clearly marked demo content with placeholder media. It is
                local-only and not production data.
              </p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => void handleCreateDemoEpisode()}
              disabled={creatingDemo}
            >
              {creatingDemo ? 'Generating Demo Episode...' : 'Generate Demo Episode'}
            </button>
          </div>
        </section>
      )}

      {loading && <p className="muted">Loading episodes...</p>}

      {!loading && episodes.length === 0 && (
        <div className="placeholder-card">
          <p>No episodes yet. Create one to get started.</p>
        </div>
      )}

      {!loading && episodes.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((episode) => (
                <tr key={episode.id}>
                  <td>{episode.title}</td>
                  <td>
                    <code>{episode.slug}</code>
                  </td>
                  <td>{formatDateTime(episode.createdAt)}</td>
                  <td>{formatDateTime(episode.updatedAt)}</td>
                  <td>
                    <div className="btn-group">
                      <button type="button" className="btn" onClick={() => onEdit(episode.id)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger"
                        onClick={() => void handleDelete(episode)}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onOpenQuestions(episode.id)}
                      >
                        Open Questions
                      </button>
                      <button type="button" className="btn" onClick={() => onValidate(episode.id)}>
                        Validate
                      </button>
                      <button type="button" className="btn" onClick={() => onPreview(episode.id)}>
                        Compatibility Preview
                      </button>
                      <button type="button" className="btn" onClick={() => onExport(episode.id)}>
                        Export
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
