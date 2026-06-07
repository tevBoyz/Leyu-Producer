import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ValidationIssue, ValidationResult } from '../../shared/validation'
import { Alert } from '../components/Alert'
import { PlaceholderScreen } from './PlaceholderScreen'

interface Props {
  episodeId: string | null
  onGoToEpisodes?: () => void
}

type SeverityFilter = 'all' | 'error' | 'warning'

function groupIssuesByStage(issues: ValidationIssue[]): Array<{
  key: string
  label: string
  issues: ValidationIssue[]
}> {
  const map = new Map<string, { label: string; issues: ValidationIssue[] }>()

  for (const issue of issues) {
    const key = issue.stageNo !== undefined ? `stage-${issue.stageNo}` : 'general'
    const label = issue.stageNo !== undefined ? `Stage ${issue.stageNo}` : 'General checks'
    const current = map.get(key) ?? { label, issues: [] }
    current.issues.push(issue)
    map.set(key, current)
  }

  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, label: value.label, issues: value.issues }))
}

function toProducerMessage(issue: ValidationIssue): string {
  const codeMap: Record<string, string> = {
    MISSING_MEDIA_PATH: 'A required media field is empty.',
    MEDIA_FILE_NOT_FOUND: 'A referenced media file is missing on disk.',
    STAGE_QUESTION_COUNT_MISMATCH: 'This stage does not have the expected number of questions.',
    MISSING_QUESTION_SLOT: 'A question number is missing from the stage sequence.',
    DUPLICATE_QUESTION_NO: 'Two questions are using the same stage/question number slot.',
    MISSING_CHOICE: 'One of the answer choices is empty.',
    MISSING_ACTUAL_ANSWER: 'The correct answer has not been set.',
    INVALID_POINT: 'The money amount must be a positive whole number.',
    UNSUPPORTED_MEDIA_EXTENSION: 'A media file uses a type that is not supported for export.',
    ANSWER_NOT_IN_CHOICES: 'The correct answer does not match any of the listed choices.',
    ZERO_POINT: 'This question currently has a money amount of zero.'
  }

  return codeMap[issue.code] ? `${codeMap[issue.code]} ${issue.message}` : issue.message
}

export function ValidationScreen({ episodeId, onGoToEpisodes }: Props): React.ReactElement {
  const [episodeTitle, setEpisodeTitle] = useState<string | null>(null)
  const [episodeSlug, setEpisodeSlug] = useState<string | null>(null)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')

  const runValidation = useCallback(async (): Promise<void> => {
    if (!episodeId) return
    setRunning(true)
    setError('')
    try {
      const validation = await window.producerApi.validateEpisode(episodeId)
      setResult(validation)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
      setResult(null)
    } finally {
      setRunning(false)
    }
  }, [episodeId])

  useEffect(() => {
    if (!episodeId) {
      setEpisodeTitle(null)
      setEpisodeSlug(null)
      setResult(null)
      return
    }

    void window.producerApi.episodes.get(episodeId).then((detail) => {
      setEpisodeTitle(detail?.episode.title ?? null)
      setEpisodeSlug(detail?.episode.slug ?? null)
    })

    void runValidation()
  }, [episodeId, runValidation])

  const filteredIssues = useMemo(() => {
    if (!result) return []

    return [...result.errors, ...result.warnings].filter((issue) => {
      const severityMatches = severityFilter === 'all' || issue.severity === severityFilter
      const stageMatches =
        stageFilter === 'all' ||
        (stageFilter === 'general' && issue.stageNo === undefined) ||
        issue.stageNo === Number(stageFilter)

      return severityMatches && stageMatches
    })
  }, [result, severityFilter, stageFilter])

  const groupedIssues = useMemo(() => groupIssuesByStage(filteredIssues), [filteredIssues])
  const availableStageFilters = result?.summary.stages ?? []

  if (!episodeId) {
    return (
      <PlaceholderScreen
        title="No episode selected"
        description="Validation checks your local episode and media files before export. Select an episode from Episodes first."
        actionLabel={onGoToEpisodes ? 'Go to Episodes' : undefined}
        onAction={onGoToEpisodes}
      />
    )
  }

  return (
    <section className="screen validation-screen">
      <div className="screen-header">
        <div>
          <h2>Validate</h2>
          <p className="muted">
            Episode: <strong>{episodeTitle ?? 'Loading...'}</strong>
            {episodeSlug && (
              <>
                {' '}
                (<code>{episodeSlug}</code>)
              </>
            )}
          </p>
          <p className="muted">
            Validation checks the local episode and its media files before export. This screen is
            producer-facing only and does not connect to the live MySQL database.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={running}
          onClick={() => void runValidation()}
        >
          {running ? 'Running...' : 'Run Validation'}
        </button>
      </div>

      <Alert variant="error" message={error} />

      {result && (
        <>
          <div
            className={`validation-status validation-status--${result.isValid ? 'ok' : 'fail'}`}
          >
            <strong>{result.isValid ? 'Ready to export' : 'Validation blocked'}</strong>
            <span>
              {result.summary.totalErrors} error(s), {result.summary.totalWarnings} warning(s) ·{' '}
              {result.summary.totalQuestions} question row(s) in the local database
            </span>
          </div>

          <section className="validation-filter-bar card">
            <div className="validation-filter-group">
              <span className="validation-filter-label">Show</span>
              <div className="btn-group" role="group" aria-label="Validation severity filter">
                <button
                  type="button"
                  className={`btn${severityFilter === 'all' ? ' btn--primary' : ''}`}
                  onClick={() => setSeverityFilter('all')}
                >
                  All issues
                </button>
                <button
                  type="button"
                  className={`btn${severityFilter === 'error' ? ' btn--primary' : ''}`}
                  onClick={() => setSeverityFilter('error')}
                >
                  Errors only
                </button>
                <button
                  type="button"
                  className={`btn${severityFilter === 'warning' ? ' btn--primary' : ''}`}
                  onClick={() => setSeverityFilter('warning')}
                >
                  Warnings only
                </button>
              </div>
            </div>

            <div className="validation-filter-group">
              <label className="validation-filter-label" htmlFor="validation-stage-filter">
                Stage filter
              </label>
              <select
                id="validation-stage-filter"
                className="form-control validation-filter-select"
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value)}
              >
                <option value="all">All stages</option>
                <option value="general">General checks</option>
                {availableStageFilters.map((stage) => (
                  <option key={stage.stageNo} value={String(stage.stageNo)}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="validation-summary-table-wrap">
            <h3>Summary by stage</h3>
            <table className="data-table validation-summary-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Expected</th>
                  <th>Current</th>
                  <th>Missing</th>
                  <th>Errors</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {result.summary.stages.map((stage) => (
                  <tr key={stage.stageNo}>
                    <td>
                      {stage.label} <span className="muted">({stage.stageNo})</span>
                    </td>
                    <td>{stage.expectedCount}</td>
                    <td>{stage.currentCount}</td>
                    <td>
                      {stage.missingQuestionNumbers.length > 0
                        ? stage.missingQuestionNumbers.map((value) => `Q${value}`).join(', ')
                        : 'None'}
                    </td>
                    <td>{stage.errorCount}</td>
                    <td>{stage.warningCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {groupedIssues.length === 0 ? (
            <div className="placeholder-card">
              <p>No issues match the current filter.</p>
            </div>
          ) : (
            groupedIssues.map((group) => (
              <section key={group.key} className="validation-block">
                <h3>
                  {group.label} ({group.issues.length})
                </h3>
                <ul className="validation-issue-list">
                  {group.issues.map((issue, index) => (
                    <li key={`${group.key}-${issue.code}-${index}`} className="validation-issue">
                      <span className="validation-issue__code">{issue.code}</span>
                      <span className="validation-issue__location">
                        {issue.severity === 'error' ? 'Error' : 'Warning'}
                        {issue.questionNo !== undefined ? ` · Q${issue.questionNo}` : ''}
                        {issue.field ? ` · ${issue.field}` : ''}
                      </span>
                      <p className="validation-issue__message">{toProducerMessage(issue)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      {!result && !running && !error && (
        <div className="placeholder-card">
          <p>Run validation to see grouped errors, warnings, and stage readiness.</p>
        </div>
      )}
    </section>
  )
}
