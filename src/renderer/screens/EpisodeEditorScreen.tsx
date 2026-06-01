import { useCallback, useEffect, useState } from 'react'
import { APP_VERSION, EXPORT_VERSION } from '../../shared/constants'
import type { UpsertStageConfigInput } from '../../shared/db-inputs'
import type { ProducerAppSettings } from '../../shared/settings'
import { Alert } from '../components/Alert'
import {
  EpisodeStageConfigEditor,
} from '../components/EpisodeStageConfigEditor'
import { FormField } from '../components/forms/FormField'
import {
  createDefaultStageDrafts,
  updateStageQuestionCount,
  validateStageQuestionCounts,
  type StageConfigDraft
} from '../utils/episodeStageConfigs'
import { normalizeSlug, slugifyTitle } from '../utils/slugify'

export type EditorMode = 'create' | 'edit'

interface Props {
  mode: EditorMode
  episodeId?: string
  appSettings: ProducerAppSettings | null
  onSaved: () => void
  onCancel: () => void
}

interface FormState {
  title: string
  slug: string
  description: string
  producerName: string
  appVersion: string
  exportVersion: string
}

export function EpisodeEditorScreen({
  mode,
  episodeId,
  appSettings,
  onSaved,
  onCancel
}: Props): React.ReactElement {
  const [form, setForm] = useState<FormState>({
    title: '',
    slug: '',
    description: '',
    producerName: '',
    appVersion: APP_VERSION,
    exportVersion: EXPORT_VERSION
  })
  const [stageConfigs, setStageConfigs] = useState<StageConfigDraft[]>(createDefaultStageDrafts())
  const [slugManual, setSlugManual] = useState(false)
  const [slugError, setSlugError] = useState('')
  const [stageErrors, setStageErrors] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadEpisode = useCallback(async () => {
    if (mode !== 'edit' || !episodeId) return
    setLoading(true)
    setError('')
    try {
      const detail = await window.producerApi.episodes.get(episodeId)
      if (!detail) {
        setError('Episode not found.')
        return
      }
      const { episode, stageConfigs: stages } = detail
      setForm({
        title: episode.title,
        slug: episode.slug,
        description: episode.description,
        producerName: episode.producerName,
        appVersion: episode.appVersion,
        exportVersion: episode.exportVersion
      })
      setStageConfigs(
        stages.map((s) => ({
          stageNo: s.stageNo,
          label: s.label,
          questionCount: s.questionCount,
          sortOrder: s.sortOrder
        }))
      )
      setSlugManual(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load episode')
    } finally {
      setLoading(false)
    }
  }, [mode, episodeId])

  useEffect(() => {
    if (mode === 'create') {
      setForm({
        title: '',
        slug: '',
        description: '',
        producerName: '',
        appVersion: appSettings?.defaultAppVersion ?? APP_VERSION,
        exportVersion: appSettings?.defaultExportVersion ?? EXPORT_VERSION
      })
      setStageConfigs(createDefaultStageDrafts())
      setSlugManual(false)
      setLoading(false)
    } else {
      void loadEpisode()
    }
  }, [mode, episodeId, loadEpisode, appSettings])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'title' && !slugManual && mode === 'create') {
        next.slug = slugifyTitle(String(value))
      }
      return next
    })
  }

  function onSlugChange(raw: string): void {
    setSlugManual(true)
    setForm((prev) => ({ ...prev, slug: normalizeSlug(raw) }))
    setSlugError('')
  }

  async function validateSlug(): Promise<boolean> {
    const slug = form.slug.trim()
    if (!slug) {
      setSlugError('Slug is required.')
      return false
    }
    try {
      const all = await window.producerApi.episodes.list()
      const duplicate = all.some((ep) => ep.slug === slug && ep.id !== episodeId)
      if (duplicate) {
        setSlugError('This slug is already used by another episode.')
        return false
      }
      setSlugError('')
      return true
    } catch (e) {
      setSlugError(e instanceof Error ? e.message : 'Could not validate slug')
      return false
    }
  }

  function onStageCountChange(stageNo: number, questionCount: number): void {
    setStageConfigs((prev) => updateStageQuestionCount(prev, stageNo, questionCount))
    setStageErrors((prev) => {
      const next = { ...prev }
      delete next[stageNo]
      return next
    })
  }

  async function handleSave(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }

    const stageValidation = validateStageQuestionCounts(stageConfigs)
    setStageErrors(stageValidation)
    if (Object.keys(stageValidation).length > 0) {
      setError('Fix stage question counts before saving.')
      return
    }

    const slugOk = await validateSlug()
    if (!slugOk) return

    setSaving(true)
    try {
      let savedEpisodeId = episodeId

      if (mode === 'create') {
        const created = await window.producerApi.episodes.create({
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          producerName: form.producerName.trim() || undefined,
          appVersion: form.appVersion.trim(),
          exportVersion: form.exportVersion.trim()
        })
        savedEpisodeId = created.episode.id
      } else if (episodeId) {
        await window.producerApi.episodes.update({
          id: episodeId,
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          producerName: form.producerName.trim(),
          appVersion: form.appVersion.trim(),
          exportVersion: form.exportVersion.trim()
        })
      }

      if (!savedEpisodeId) {
        throw new Error('Missing episode id after save.')
      }

      const stagePayload: UpsertStageConfigInput[] = stageConfigs.map((c) => ({
        stageNo: c.stageNo,
        label: c.label,
        questionCount: c.questionCount,
        sortOrder: c.sortOrder
      }))

      await window.producerApi.episodes.upsertStageConfigs(savedEpisodeId, stagePayload)

      setSuccess(mode === 'create' ? 'Episode created.' : 'Episode saved.')
      onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('slug')) {
        setSlugError('This slug is already used by another episode.')
      } else {
        setError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="screen">
        <h2>{mode === 'create' ? 'Create Episode' : 'Edit Episode'}</h2>
        <p className="muted">Loading…</p>
      </section>
    )
  }

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <h2>{mode === 'create' ? 'Create Episode' : 'Edit Episode'}</h2>
          <p className="muted">Metadata and per-stage question slot counts.</p>
        </div>
        <button type="button" className="btn" onClick={onCancel}>
          Back to list
        </button>
      </div>

      <Alert variant="error" message={error} />
      <Alert variant="success" message={success} />

      <form className="episode-form" onSubmit={(e) => void handleSave(e)}>
        <fieldset className="form-section">
          <legend>Episode details</legend>
          <div className="form-grid">
            <FormField label="Title" htmlFor="ep-title">
              <input
                id="ep-title"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                required
              />
            </FormField>

            <FormField
              label="Slug"
              htmlFor="ep-slug"
              hint="Used in LeyuTune_Episode_<slug>.zip"
              error={slugError}
            >
              <input
                id="ep-slug"
                value={form.slug}
                onChange={(e) => onSlugChange(e.target.value)}
                onBlur={() => void validateSlug()}
                required
              />
            </FormField>

            <FormField label="Producer name" htmlFor="ep-producer">
              <input
                id="ep-producer"
                value={form.producerName}
                onChange={(e) => updateForm('producerName', e.target.value)}
              />
            </FormField>

            <FormField label="App version" htmlFor="ep-app-ver">
              <input
                id="ep-app-ver"
                value={form.appVersion}
                onChange={(e) => updateForm('appVersion', e.target.value)}
                disabled={mode === 'create'}
              />
            </FormField>

            <FormField label="Export version" htmlFor="ep-export-ver">
              <input
                id="ep-export-ver"
                value={form.exportVersion}
                onChange={(e) => updateForm('exportVersion', e.target.value)}
                disabled={mode === 'create'}
              />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="ep-desc">
            <textarea
              id="ep-desc"
              rows={3}
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
            />
          </FormField>
        </fieldset>

        <fieldset className="form-section">
          <legend>Stage question counts</legend>
          <p className="muted form-section__hint">
            Labels and stage numbers are fixed. Adjust how many question slots each stage has.
          </p>
          <EpisodeStageConfigEditor
            configs={stageConfigs}
            errors={stageErrors}
            onChange={onStageCountChange}
          />
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create Episode' : 'Save Episode'}
          </button>
        </div>
      </form>
    </section>
  )
}
