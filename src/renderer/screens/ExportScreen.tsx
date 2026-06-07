import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ExportProgressEvent } from '../../shared/export-progress'
import type { Episode } from '../../shared/episode'
import type { ValidationResult } from '../../shared/validation'
import { Alert } from '../components/Alert'
import { ValidationIssueList } from '../components/validation/ValidationIssueList'

interface Props {
  episodeId: string | null
  onSelectEpisode?: (id: string) => void
}

export function ExportScreen({ episodeId, onSelectEpisode }: Props): React.ReactElement {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('')
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [destinationPath, setDestinationPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportProgress, setExportProgress] = useState<ExportProgressEvent | null>(null)
  const [exportSuccessPath, setExportSuccessPath] = useState('')
  const [openingFolder, setOpeningFolder] = useState(false)

  useEffect(() => {
    const unsubscribe = window.producerApi.subscribeExportProgress((progress) => {
      setExportProgress(progress)
      setExportStatus(progress.message)
    })
    return unsubscribe
  }, [])

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

  const runValidation = useCallback(async (nextEpisodeId: string) => {
    if (!nextEpisodeId) {
      setSelectedEpisode(null)
      setValidationResult(null)
      return
    }

    setValidating(true)
    setValidationError('')
    setValidationResult(null)
    setExportSuccessPath('')
    setExportError('')

    try {
      const detail = await window.producerApi.episodes.get(nextEpisodeId)
      if (detail) {
        setSelectedEpisode(detail.episode)
      } else {
        setSelectedEpisode(null)
      }

      const result = await window.producerApi.validateEpisode(nextEpisodeId)
      setValidationResult(result)
    } catch (loadError) {
      setValidationError(loadError instanceof Error ? loadError.message : 'Validation failed')
    } finally {
      setValidating(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEpisodeId) {
      void runValidation(selectedEpisodeId)
    }
  }, [selectedEpisodeId, runValidation])

  function handleEpisodeChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const nextEpisodeId = event.target.value
    setSelectedEpisodeId(nextEpisodeId)
    setDestinationPath('')
    onSelectEpisode?.(nextEpisodeId)
  }

  async function handleBrowse(): Promise<void> {
    if (!selectedEpisode) {
      return
    }

    try {
      const selectedPath = await window.producerApi.chooseExportDestination(
        `LeyuTune_Episode_${selectedEpisode.slug}.zip`
      )
      if (selectedPath) {
        setDestinationPath(selectedPath)
        setExportError('')
        setExportSuccessPath('')
      }
    } catch (browseError) {
      setExportError(browseError instanceof Error ? browseError.message : 'Failed to choose destination')
    }
  }

  async function handleExport(): Promise<void> {
    if (!selectedEpisodeId || !destinationPath) {
      return
    }

    setExporting(true)
    setExportError('')
    setExportSuccessPath('')
    setExportProgress(null)
    setExportStatus('Starting export…')

    try {
      const result = await window.producerApi.exportEpisode(selectedEpisodeId, destinationPath)

      if (result.success && result.zipPath) {
        setExportSuccessPath(result.zipPath)
        setExportStatus('Export finished successfully.')
      } else {
        if (result.validation) {
          setValidationResult(result.validation)
        }
        setExportError(result.error || 'Unknown export error occurred.')
      }
    } catch (saveError) {
      setExportError(saveError instanceof Error ? saveError.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  async function handleShowInFolder(): Promise<void> {
    if (!exportSuccessPath) return
    setOpeningFolder(true)
    try {
      await window.producerApi.showExportInFolder(exportSuccessPath)
    } catch (openError) {
      setExportError(openError instanceof Error ? openError.message : 'Could not open export location')
    } finally {
      setOpeningFolder(false)
    }
  }

  async function handleOpenFolder(): Promise<void> {
    if (!exportSuccessPath) return
    setOpeningFolder(true)
    try {
      await window.producerApi.openExportFolder(exportSuccessPath)
    } catch (openError) {
      setExportError(openError instanceof Error ? openError.message : 'Could not open export folder')
    } finally {
      setOpeningFolder(false)
    }
  }

  const validationHeading = validationResult?.isValid
    ? validationResult.summary.totalWarnings > 0
      ? 'Ready with warnings'
      : 'Ready to export'
    : 'Blocked'

  const checklistItems = useMemo(() => {
    const errors = validationResult?.summary.totalErrors ?? 0
    const warnings = validationResult?.summary.totalWarnings ?? 0

    return [
      {
        label: 'Episode selected',
        ready: Boolean(selectedEpisodeId),
        detail: selectedEpisode
          ? `${selectedEpisode.title} (${selectedEpisode.slug})`
          : 'Choose an episode to export.'
      },
      {
        label: 'Validation passed',
        ready: Boolean(validationResult?.isValid),
        detail: validationResult
          ? errors > 0
            ? `${errors} error(s) must be fixed before export.`
            : warnings > 0
              ? `${warnings} warning(s). Export is allowed.`
              : 'No validation blockers detected.'
          : 'Run validation for the selected episode.'
      },
      {
        label: 'Destination ready',
        ready: destinationPath.trim() !== '',
        detail: destinationPath.trim() || 'Choose an absolute folder or .zip path.'
      }
    ]
  }, [destinationPath, selectedEpisode, selectedEpisodeId, validationResult])

  const blockedReasons = validationResult?.errors ?? []
  const isExportDisabled =
    exporting ||
    validating ||
    !selectedEpisodeId ||
    !destinationPath ||
    !validationResult ||
    !validationResult.isValid

  return (
    <section className="screen export-screen">
      <div className="screen-header">
        <div>
          <h2>Export</h2>
          <p className="muted">
            Export a portable, self-contained ZIP package ready for the future importer workflow on
            the show PC.
          </p>
          <p className="muted">
            Choose a real destination folder or zip path before exporting. The app will not guess a
            hidden working-directory location anymore.
          </p>
        </div>
      </div>

      <div className="card export-controls-card">
        <div className="export-controls-grid">
          <div>
            <label htmlFor="episode-select" className="export-label">
              Select Episode
            </label>
            <select
              id="episode-select"
              className="form-control"
              value={selectedEpisodeId}
              onChange={handleEpisodeChange}
              disabled={exporting}
            >
              {episodes.length === 0 && <option value="">No episodes available</option>}
              {episodes.map((episode) => (
                <option key={episode.id} value={episode.id}>
                  {episode.title} ({episode.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="destination-input" className="export-label">
              Destination Folder or ZIP Path
            </label>
            <div className="export-destination-row">
              <input
                id="destination-input"
                type="text"
                className="form-control"
                value={destinationPath}
                onChange={(event) => setDestinationPath(event.target.value)}
                placeholder="Choose an absolute folder or .zip path..."
                disabled={exporting}
              />
              <button
                type="button"
                className="btn"
                onClick={() => void handleBrowse()}
                disabled={exporting || !selectedEpisode}
              >
                Browse...
              </button>
            </div>
            <p className="muted export-hint">
              Export always writes <code>LeyuTune_Episode_{selectedEpisode?.slug ?? 'episode-slug'}.zip</code>.
            </p>
            <p className="muted export-hint">
              Tip: use <strong>Browse...</strong> or set a default export folder in Settings.
            </p>
          </div>
        </div>
      </div>

      <Alert variant="error" message={validationError} />
      <Alert variant="error" message={exportError} />

      {exportSuccessPath && (
        <div className="alert alert--success export-success-card">
          <h4>Export complete</h4>
          <p>Your episode package is ready.</p>
          <p>
            ZIP file:
            <br />
            <code>{exportSuccessPath}</code>
          </p>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn--primary"
              disabled={openingFolder}
              onClick={() => void handleShowInFolder()}
            >
              Show in Folder
            </button>
            <button
              type="button"
              className="btn"
              disabled={openingFolder}
              onClick={() => void handleOpenFolder()}
            >
              Open Export Folder
            </button>
          </div>
        </div>
      )}

      {(exporting || exportProgress) && (
        <section className="card export-progress-card">
          <div className="export-progress-card__header">
            <strong>{exporting ? 'Export in progress' : 'Export status'}</strong>
            <span>{exportProgress?.percent ?? 0}%</span>
          </div>
          <div className="progress-bar" aria-hidden="true">
            <div
              className="progress-bar__fill"
              style={{ width: `${exportProgress?.percent ?? 0}%` }}
            />
          </div>
          <p className="muted">{exportStatus || exportProgress?.message || 'Working…'}</p>
        </section>
      )}

      {validating && <p className="muted">Validating episode status...</p>}

      {!validating && (
        <section className="card export-checklist-card">
          <h3>Pre-export checklist</h3>
          <ul className="export-checklist">
            {checklistItems.map((item) => (
              <li key={item.label} className={`export-checklist__item${item.ready ? ' export-checklist__item--ready' : ''}`}>
                <strong>{item.ready ? 'Ready' : 'Pending'}:</strong> {item.label}
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!validating && validationResult && (
        <>
          <div className={`validation-status validation-status--${validationResult.isValid ? 'ok' : 'fail'}`}>
            <strong>{validationHeading}</strong>
            <span>
              {validationResult.summary.totalErrors} error(s), {validationResult.summary.totalWarnings} warning(s) ·{' '}
              {validationResult.summary.totalQuestions} questions configured
            </span>
          </div>

          <section className="card export-destination-card">
            <h3>Destination</h3>
            <p className="muted">
              Current export destination:
              <br />
              <code>{destinationPath || 'No destination chosen yet.'}</code>
            </p>
          </section>

          <div className="export-actions">
            <button
              type="button"
              className="btn"
              onClick={() => void runValidation(selectedEpisodeId)}
              disabled={exporting || !selectedEpisodeId}
            >
              Re-run Checks
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleExport()}
              disabled={isExportDisabled}
            >
              {exporting ? 'Exporting...' : 'Export ZIP Archive'}
            </button>
          </div>

          {!validationResult.isValid && (
            <section className="alert alert--error export-blocked-card">
              <strong>Export blocked:</strong> fix the validation errors below before exporting.
              Warnings do not block exports.
            </section>
          )}

          {blockedReasons.length > 0 && (
            <ValidationIssueList title="Blocked export reasons" issues={blockedReasons} variant="error" />
          )}
          <ValidationIssueList title="Warnings" issues={validationResult.warnings} variant="warning" />
        </>
      )}

      {!selectedEpisodeId && (
        <div className="placeholder-card">
          <p>Please select or create an episode to begin export.</p>
        </div>
      )}
    </section>
  )
}
