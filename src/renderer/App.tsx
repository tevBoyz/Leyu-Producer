import { useCallback, useEffect, useState } from 'react'
import type { EpisodeDetail } from '../shared/db-inputs'
import type { Question } from '../shared/question'
import type { ProducerAppSettings } from '../shared/settings'
import type { StartupStatus } from '../shared/startup'
import type { ValidationResult } from '../shared/validation'
import { StartupGate } from './components/StartupGate'
import { AppShell } from './layout/AppShell'
import { getNavLabel, type ScreenId } from './navigation'
import { EpisodeEditorScreen } from './screens/EpisodeEditorScreen'
import { EpisodesScreen } from './screens/EpisodesScreen'
import { ExportScreen } from './screens/ExportScreen'
import { CompatibilityPreviewScreen } from './screens/CompatibilityPreviewScreen'
import { PlaceholderScreen } from './screens/PlaceholderScreen'
import { QuestionsScreen } from './screens/QuestionsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ValidationScreen } from './screens/ValidationScreen'
import { buildEpisodeWorkspaceSummary } from './utils/episodeWorkspaceSummary'

interface EditorRoute {
  mode: 'create' | 'edit'
  episodeId?: string
}

export default function App(): React.ReactElement {
  const [startupComplete, setStartupComplete] = useState(false)
  const [screen, setScreen] = useState<ScreenId>('episodes')
  const [ipcStatus, setIpcStatus] = useState<string>('Starting…')
  const [editorRoute, setEditorRoute] = useState<EditorRoute | null>(null)
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0)
  const [selectedEpisodeDetail, setSelectedEpisodeDetail] = useState<EpisodeDetail | null>(null)
  const [selectedEpisodeQuestions, setSelectedEpisodeQuestions] = useState<Question[]>([])
  const [selectedEpisodeValidation, setSelectedEpisodeValidation] = useState<ValidationResult | null>(null)
  const [appSettings, setAppSettings] = useState<ProducerAppSettings | null>(null)

  const handleStartupReady = useCallback(async (status: StartupStatus) => {
    setIpcStatus(`v${status.appVersion} — ready`)
    try {
      const settings = await window.producerApi.settings.getSettings()
      setAppSettings(settings)
    } catch {
      // Settings were already checked during startup; workspace can still open.
    }
    setStartupComplete(true)
    setListRefreshKey((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!selectedEpisodeId) {
      setSelectedEpisodeDetail(null)
      setSelectedEpisodeQuestions([])
      setSelectedEpisodeValidation(null)
      return
    }

    let cancelled = false
    const episodeId = selectedEpisodeId

    async function loadWorkspaceContext(): Promise<void> {
      try {
        const [detail, questions, validation] = await Promise.all([
          window.producerApi.episodes.get(episodeId),
          window.producerApi.questions.list(episodeId),
          window.producerApi.validateEpisode(episodeId)
        ])

        if (cancelled) {
          return
        }

        setSelectedEpisodeDetail(detail)
        setSelectedEpisodeQuestions(questions)
        setSelectedEpisodeValidation(validation)
      } catch {
        if (!cancelled) {
          setSelectedEpisodeDetail(null)
          setSelectedEpisodeQuestions([])
          setSelectedEpisodeValidation(null)
        }
      }
    }

    void loadWorkspaceContext()

    return () => {
      cancelled = true
    }
  }, [selectedEpisodeId, workspaceRefreshKey])

  function openCreate(): void {
    setSelectedEpisodeId(null)
    setEditorRoute({ mode: 'create' })
    setScreen('episode-editor')
  }

  function openEdit(episodeId: string): void {
    setSelectedEpisodeId(episodeId)
    setEditorRoute({ mode: 'edit', episodeId })
    setScreen('episode-editor')
  }

  function openWithEpisode(episodeId: string, target: ScreenId): void {
    setSelectedEpisodeId(episodeId)
    setScreen(target)
  }

  function handleEditorSaved(): void {
    setListRefreshKey((value) => value + 1)
    setWorkspaceRefreshKey((value) => value + 1)
    setEditorRoute(null)
    setScreen('episodes')
  }

  function handleEditorCancel(): void {
    setEditorRoute(null)
    setScreen('episodes')
  }

  function handleWorkspaceDataChanged(): void {
    setWorkspaceRefreshKey((value) => value + 1)
    setListRefreshKey((value) => value + 1)
  }

  function handleSettingsChanged(settings: ProducerAppSettings): void {
    setAppSettings(settings)
  }

  if (!startupComplete) {
    return <StartupGate onReady={(status) => void handleStartupReady(status)} />
  }

  const activeScreenLabel =
    screen === 'episode-editor'
      ? editorRoute?.mode === 'create'
        ? 'Create episode'
        : 'Edit episode'
      : getNavLabel(screen)
  const selectedEpisodeSummary = selectedEpisodeDetail
    ? buildEpisodeWorkspaceSummary(
        selectedEpisodeDetail,
        selectedEpisodeQuestions,
        selectedEpisodeValidation
      )
    : null

  return (
    <AppShell
      activeScreen={screen}
      selectedEpisodeId={selectedEpisodeId}
      onNavigate={setScreen}
      ipcStatus={ipcStatus}
      activeScreenLabel={activeScreenLabel}
      selectedEpisodeSummary={selectedEpisodeSummary}
    >
      {screen === 'episodes' && (
        <EpisodesScreen
          refreshKey={listRefreshKey}
          onDataChanged={handleWorkspaceDataChanged}
          onCreate={openCreate}
          onEdit={openEdit}
          onOpenQuestions={(id) => openWithEpisode(id, 'questions')}
          onValidate={(id) => openWithEpisode(id, 'validation')}
          onPreview={(id) => openWithEpisode(id, 'compatibility-preview')}
          onExport={(id) => openWithEpisode(id, 'export')}
        />
      )}

      {screen === 'episode-editor' &&
        (editorRoute ? (
          <EpisodeEditorScreen
            mode={editorRoute.mode}
            episodeId={editorRoute.episodeId}
            appSettings={appSettings}
            onSaved={handleEditorSaved}
            onCancel={handleEditorCancel}
          />
        ) : (
          <PlaceholderScreen
            title="No episode open for editing"
            description="Use Create Episode on the Episodes screen, or click Edit on an existing episode."
            actionLabel="Go to Episodes"
            onAction={() => setScreen('episodes')}
          />
        ))}

      {screen === 'questions' && (
        <QuestionsScreen
          episodeId={selectedEpisodeId}
          onDataChanged={handleWorkspaceDataChanged}
          onGoToEpisodes={() => setScreen('episodes')}
        />
      )}

      {screen === 'validation' && (
        <ValidationScreen
          episodeId={selectedEpisodeId}
          onGoToEpisodes={() => setScreen('episodes')}
        />
      )}

      {screen === 'compatibility-preview' && (
        <CompatibilityPreviewScreen
          episodeId={selectedEpisodeId}
          onSelectEpisode={setSelectedEpisodeId}
          onGoToEpisodes={() => setScreen('episodes')}
        />
      )}

      {screen === 'export' && (
        <ExportScreen episodeId={selectedEpisodeId} onSelectEpisode={setSelectedEpisodeId} />
      )}

      {screen === 'settings' && (
        <SettingsScreen initialSettings={appSettings} onSettingsChanged={handleSettingsChanged} />
      )}
    </AppShell>
  )
}
