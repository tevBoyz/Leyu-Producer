import { useCallback, useEffect, useState } from 'react'
import type { Episode } from '../../shared/episode'
import { Alert } from '../components/Alert'
import { EmptyState } from '../components/EmptyState'
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

  return (
    <section className="screen episodes-screen">
      <div className="screen-header">
        <div>
          <h2>Episodes</h2>
          <p className="muted">
            Your local episode library. Pick one to edit questions, validate, and export a ZIP for
            the live show PC.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={onCreate}>
          Create episode
        </button>
      </div>

      <Alert variant="error" message={error} />
      <Alert variant="success" message={success} />

      {loading && (
        <div className="loading-panel">
          <div className="startup-spinner" aria-hidden="true" />
          <p className="muted">Loading episodes…</p>
        </div>
      )}

      {!loading && episodes.length === 0 && (
        <EmptyState
          title="No episodes yet"
          description="Create your first episode to set stage counts and start authoring questions. When you're ready, validate and export a ZIP package for import on the show PC."
          actionLabel="Create episode"
          onAction={onCreate}
        />
      )}

      {!loading && episodes.length > 0 && (
        <div className="table-wrap">
          <table className="data-table episodes-table">
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
                  <td className="episodes-table__title">{episode.title}</td>
                  <td>
                    <code>{episode.slug}</code>
                  </td>
                  <td className="episodes-table__date">{formatDateTime(episode.createdAt)}</td>
                  <td className="episodes-table__date">{formatDateTime(episode.updatedAt)}</td>
                  <td className="episode-actions-cell">
                    <div className="episode-actions">
                      <div className="episode-actions__group" aria-label="Primary actions">
                        <button
                          type="button"
                          className="btn btn--compact btn--primary"
                          onClick={() => onEdit(episode.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--compact"
                          onClick={() => onOpenQuestions(episode.id)}
                        >
                          Questions
                        </button>
                      </div>
                      <div className="episode-actions__group" aria-label="Workflow actions">
                        <button
                          type="button"
                          className="btn btn--compact"
                          onClick={() => onValidate(episode.id)}
                        >
                          Validate
                        </button>
                        <button
                          type="button"
                          className="btn btn--compact"
                          onClick={() => onExport(episode.id)}
                        >
                          Export
                        </button>
                        <button
                          type="button"
                          className="btn btn--compact"
                          onClick={() => onPreview(episode.id)}
                          title="Preview legacy MySQL row shape"
                        >
                          Preview
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn--compact btn--danger"
                        onClick={() => void handleDelete(episode)}
                      >
                        Delete
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
