import { useEffect, useState } from 'react'
import type { EpisodeDetail } from '../shared/db-inputs'
import type { Question } from '../shared/question'
import type { ProducerAppSettings } from '../shared/settings'
import type { ValidationResult } from '../shared/validation'
import { AppShell } from './layout/AppShell'
import { NAV_ITEMS, type ScreenId } from './navigation'
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
  const [screen, setScreen] = useState<ScreenId>('episodes')
  const [ipcStatus, setIpcStatus] = useState<string>('Checking IPC...')
  const [editorRoute, setEditorRoute] = useState<EditorRoute | null>(null)
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0)
  const [selectedEpisodeDetail, setSelectedEpisodeDetail] = useState<EpisodeDetail | null>(null)
  const [selectedEpisodeQuestions, setSelectedEpisodeQuestions] = useState<Question[]>([])
  const [selectedEpisodeValidation, setSelectedEpisodeValidation] = useState<ValidationResult | null>(null)
  const [appSettings, setAppSettings] = useState<ProducerAppSettings | null>(null)

  useEffect(() => {
    async function loadStartupContext(): Promise<void> {
      try {
        const [version, ping, settings] = await Promise.all([
          window.producerApi.app.getVersion(),
          window.producerApi.app.ping(),
          window.producerApi.settings.getSettings()
        ])

        setIpcStatus(`v${version} - ${ping.message}`)
        setAppSettings(settings)
      } catch (error) {
        console.error('[producer] failed to load startup context', error)
        setIpcStatus('IPC unavailable (not running in Electron?)')
      }
    }

    void loadStartupContext()
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

  const activeScreenLabel = NAV_ITEMS.find((item) => item.id === screen)?.label ?? 'Workspace'
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
            title="Episode Editor"
            description="Open an episode from the Episodes list (Edit) or click Create Episode."
          />
        ))}

      {screen === 'questions' && (
        <QuestionsScreen episodeId={selectedEpisodeId} onDataChanged={handleWorkspaceDataChanged} />
      )}

      {screen === 'validation' && <ValidationScreen episodeId={selectedEpisodeId} />}

      {screen === 'compatibility-preview' && (
        <CompatibilityPreviewScreen
          episodeId={selectedEpisodeId}
          onSelectEpisode={setSelectedEpisodeId}
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
