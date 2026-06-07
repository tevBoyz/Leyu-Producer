import type { ReactNode } from 'react'
import { FullscreenToggle } from '../components/FullscreenToggle'
import { NAV_SECTIONS, type ScreenId } from '../navigation'
import type { EpisodeWorkspaceSummary } from '../utils/episodeWorkspaceSummary'
import { formatDateTime } from '../utils/formatDate'

interface Props {
  activeScreen: ScreenId
  selectedEpisodeId: string | null
  onNavigate: (screen: ScreenId) => void
  ipcStatus: string
  activeScreenLabel: string
  selectedEpisodeSummary: EpisodeWorkspaceSummary | null
  children: ReactNode
}

export function AppShell({
  activeScreen,
  selectedEpisodeId,
  onNavigate,
  ipcStatus,
  activeScreenLabel,
  selectedEpisodeSummary,
  children
}: Props): React.ReactElement {
  return (
    <div className="app-frame">
      <header className="app-topbar">
        <span className="app-topbar__title">LeyuTune Producer</span>
        <FullscreenToggle />
      </header>

      <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <h1>LeyuTune Producer</h1>
          <p>Episode authoring · not live dashboard</p>
        </div>

        <div className="sidebar__sections">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="sidebar__section">
              <p className="sidebar__section-label">{section.label}</p>
              <nav aria-label={section.label}>
                <ul className="nav-list">
                  {section.items.map((item) => {
                    const disabled = Boolean(item.requiresEpisode && !selectedEpisodeId)
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={activeScreen === item.id ? 'active' : ''}
                          disabled={disabled}
                          title={
                            disabled
                              ? 'Select an episode from Episodes first'
                              : item.description
                          }
                          onClick={() => onNavigate(item.id)}
                        >
                          <span className="nav-list__label">{item.label}</span>
                          {item.description && (
                            <span className="nav-list__hint">{item.description}</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </div>
          ))}
        </div>

        <div className="status-bar">
          <span className="status-bar__label">Status</span>
          {ipcStatus}
        </div>
      </aside>

      <main className="main">
        <header className="workspace-header card">
          <div className="workspace-header__title">
            <p className="workspace-header__eyebrow">Producer workspace</p>
            <h2>{activeScreenLabel}</h2>
            {selectedEpisodeSummary ? (
              <p className="muted">
                Working on <strong>{selectedEpisodeSummary.episodeTitle}</strong> (
                <code>{selectedEpisodeSummary.episodeSlug}</code>)
              </p>
            ) : (
              <p className="muted">
                No episode selected. Start on <strong>Episodes</strong>, then use Questions →
                Validate → Export.
              </p>
            )}
          </div>

          {selectedEpisodeSummary ? (
            <div className="workspace-summary">
              <div className="workspace-summary__metrics">
                <div className="workspace-metric">
                  <span className="workspace-metric__label">Validation</span>
                  <strong
                    className={`workspace-status workspace-status--${selectedEpisodeSummary.validationStatus}`}
                  >
                    {selectedEpisodeSummary.validationStatus.toUpperCase()}
                  </strong>
                  <span>{selectedEpisodeSummary.validationText}</span>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__label">Questions</span>
                  <strong>
                    {selectedEpisodeSummary.completedQuestions}/
                    {selectedEpisodeSummary.totalQuestions}
                  </strong>
                  <span>Complete records</span>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__label">Media</span>
                  <strong>
                    {selectedEpisodeSummary.mediaCompleteQuestions}/
                    {selectedEpisodeSummary.totalQuestions}
                  </strong>
                  <span>All media attached</span>
                </div>
                <div className="workspace-metric">
                  <span className="workspace-metric__label">Updated</span>
                  <strong>{formatDateTime(selectedEpisodeSummary.lastUpdatedAt)}</strong>
                  <span>Last saved</span>
                </div>
              </div>

              <div
                className="workspace-summary__stages"
                aria-label="Selected episode stage summary"
              >
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
              <strong>Pick an episode to unlock the workflow.</strong>
              <span>
                Open Episodes, choose or create a show, then edit questions and export a ZIP for
                the live dashboard importer.
              </span>
            </div>
          )}
        </header>

        {children}
      </main>
      </div>
    </div>
  )
}
