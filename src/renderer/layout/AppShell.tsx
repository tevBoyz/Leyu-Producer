import type { ReactNode } from 'react'
import { NAV_ITEMS, type ScreenId } from '../navigation'
import type { EpisodeWorkspaceSummary } from '../utils/episodeWorkspaceSummary'
import { formatDateTime } from '../utils/formatDate'

interface Props {
  activeScreen: ScreenId
  onNavigate: (screen: ScreenId) => void
  ipcStatus: string
  activeScreenLabel: string
  selectedEpisodeSummary: EpisodeWorkspaceSummary | null
  children: ReactNode
}

export function AppShell({
  activeScreen,
  onNavigate,
  ipcStatus,
  activeScreenLabel,
  selectedEpisodeSummary,
  children
}: Props): React.ReactElement {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <h1>LeyuTune Producer</h1>
          <p>Episode authoring (not live dashboard)</p>
        </div>
        <nav aria-label="Main navigation">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={activeScreen === item.id ? 'active' : ''}
                  onClick={() => onNavigate(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="status-bar">{ipcStatus}</div>
      </aside>
      <main className="main">
        <header className="workspace-header card">
          <div className="workspace-header__title">
            <p className="workspace-header__eyebrow">Producer Workspace</p>
            <h2>{activeScreenLabel}</h2>
            {selectedEpisodeSummary ? (
              <p className="muted">
                Current episode: <strong>{selectedEpisodeSummary.episodeTitle}</strong> (
                <code>{selectedEpisodeSummary.episodeSlug}</code>)
              </p>
            ) : (
              <p className="muted">
                No episode selected yet. Create one from Episodes, or open an existing episode to
                edit questions, validate, preview compatibility, and export.
              </p>
            )}
          </div>

          {selectedEpisodeSummary ? (
            <div className="workspace-summary">
              <div className="workspace-summary__metrics">
                <div className="workspace-metric">
                  <span className="workspace-metric__label">Validation</span>
                  <strong className={`workspace-status workspace-status--${selectedEpisodeSummary.validationStatus}`}>
                    {selectedEpisodeSummary.validationStatus.toUpperCase()}
                  </strong>
                  <span>{selectedEpisodeSummary.validationText}</span>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__label">Questions</span>
                  <strong>
                    {selectedEpisodeSummary.completedQuestions}/{selectedEpisodeSummary.totalQuestions}
                  </strong>
                  <span>Complete question records</span>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__label">Media</span>
                  <strong>
                    {selectedEpisodeSummary.mediaCompleteQuestions}/{selectedEpisodeSummary.totalQuestions}
                  </strong>
                  <span>Questions with all media set</span>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__label">Updated</span>
                  <strong>{formatDateTime(selectedEpisodeSummary.lastUpdatedAt)}</strong>
                  <span>Last local episode update</span>
                </div>
              </div>

              <div className="workspace-summary__stages" aria-label="Selected episode stage summary">
                {selectedEpisodeSummary.stages.map((stage) => (
                  <div key={stage.stageNo} className="stage-pill">
                    <strong>{stage.label}</strong>
                    <span>
                      {stage.completedCount}/{stage.expectedCount} complete
                    </span>
                    <span>
                      Missing:{' '}
                      {stage.missingQuestionNumbers.length > 0
                        ? stage.missingQuestionNumbers.map((value) => `Q${value}`).join(', ')
                        : 'None'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="workspace-empty-state" aria-live="polite">
              <strong>Select an episode to unlock the working dashboard.</strong>
              <span>Questions, validation, export, and compatibility preview all work against the selected local episode.</span>
            </div>
          )}
        </header>

        {children}
      </main>
    </div>
  )
}
