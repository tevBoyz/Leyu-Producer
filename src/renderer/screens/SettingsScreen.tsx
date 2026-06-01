import { useEffect, useMemo, useState } from 'react'
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_QUESTION_AUDIO_EXTENSIONS
} from '../../shared/constants'
import type {
  ProducerAppSettings,
  UpdateProducerAppSettingsInput
} from '../../shared/settings'
import { Alert } from '../components/Alert'
import { FormField } from '../components/forms/FormField'

interface Props {
  initialSettings: ProducerAppSettings | null
  onSettingsChanged?: (settings: ProducerAppSettings) => void
}

interface FormState {
  defaultExportFolder: string
  defaultAppVersion: string
  defaultExportVersion: string
  allowExportWithWarnings: boolean
  keepTemporaryExportFolder: boolean
  preferredAudioExtensions: string[]
  preferredImageExtensions: string[]
}

function toFormState(settings: ProducerAppSettings): FormState {
  return {
    defaultExportFolder: settings.defaultExportFolder,
    defaultAppVersion: settings.defaultAppVersion,
    defaultExportVersion: settings.defaultExportVersion,
    allowExportWithWarnings: settings.allowExportWithWarnings,
    keepTemporaryExportFolder: settings.keepTemporaryExportFolder,
    preferredAudioExtensions: [...settings.preferredAudioExtensions],
    preferredImageExtensions: [...settings.preferredImageExtensions]
  }
}

function validateForm(form: FormState): string[] {
  const errors: string[] = []

  if (form.defaultExportFolder.trim() && !/^[A-Za-z]:[\\/]/.test(form.defaultExportFolder.trim())) {
    errors.push('Default export folder must be an absolute Windows path or left blank.')
  }

  if (!form.defaultAppVersion.trim()) {
    errors.push('Default app version is required.')
  }

  if (!form.defaultExportVersion.trim()) {
    errors.push('Default export version is required.')
  }

  if (form.preferredAudioExtensions.length === 0) {
    errors.push('Select at least one preferred audio extension.')
  }

  if (form.preferredImageExtensions.length === 0) {
    errors.push('Select at least one preferred image extension.')
  }

  return errors
}

function toggleExtension(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

export function SettingsScreen({
  initialSettings,
  onSettingsChanged
}: Props): React.ReactElement {
  const [settings, setSettings] = useState<ProducerAppSettings | null>(initialSettings)
  const [form, setForm] = useState<FormState | null>(initialSettings ? toFormState(initialSettings) : null)
  const [loading, setLoading] = useState(!initialSettings)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [logFilePath, setLogFilePath] = useState('')

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings)
      setForm(toFormState(initialSettings))
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadSettings(): Promise<void> {
      try {
        const [loaded, logsPath] = await Promise.all([
          window.producerApi.settings.getSettings(),
          window.producerApi.app.getLogFilePath()
        ])
        if (!cancelled) {
          setSettings(loaded)
          setForm(toFormState(loaded))
          setLogFilePath(logsPath)
          onSettingsChanged?.(loaded)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load settings')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [initialSettings, onSettingsChanged])

  useEffect(() => {
    if (!initialSettings) {
      return
    }

    let cancelled = false

    async function loadLogPath(): Promise<void> {
      try {
        const nextLogFilePath = await window.producerApi.app.getLogFilePath()
        if (!cancelled) {
          setLogFilePath(nextLogFilePath)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load log file path')
        }
      }
    }

    void loadLogPath()

    return () => {
      cancelled = true
    }
  }, [initialSettings])

  const validationErrors = useMemo(() => (form ? validateForm(form) : []), [form])

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous))
    setError('')
    setSuccess('')
  }

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!form) {
      return
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '))
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const payload: UpdateProducerAppSettingsInput = {
      defaultExportFolder: form.defaultExportFolder,
      defaultAppVersion: form.defaultAppVersion,
      defaultExportVersion: form.defaultExportVersion,
      allowExportWithWarnings: form.allowExportWithWarnings,
      keepTemporaryExportFolder: form.keepTemporaryExportFolder,
      preferredAudioExtensions: form.preferredAudioExtensions,
      preferredImageExtensions: form.preferredImageExtensions
    }

    try {
      const saved = await window.producerApi.settings.updateSettings(payload)
      setSettings(saved)
      setForm(toFormState(saved))
      onSettingsChanged?.(saved)
      setSuccess('Producer app settings saved locally.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset(): Promise<void> {
    if (!confirm('Reset all producer app settings back to their defaults?')) {
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const reset = await window.producerApi.settings.resetSettings()
      setSettings(reset)
      setForm(toFormState(reset))
      onSettingsChanged?.(reset)
      setSuccess('Producer app settings were reset to defaults.')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleOpenLogsFolder(): Promise<void> {
    setError('')
    setSuccess('')

    try {
      await window.producerApi.app.openLogsFolder()
      setSuccess('Logs folder opened in File Explorer.')
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Failed to open logs folder')
    }
  }

  if (loading || !form || !settings) {
    return (
      <section className="screen">
        <h2>Settings</h2>
        <p className="muted">Loading local producer settings...</p>
      </section>
    )
  }

  return (
    <section className="screen settings-screen">
      <div className="screen-header">
        <div>
          <h2>Settings</h2>
          <p className="muted">
            Local producer app preferences only. These are stored on this machine and are not part
            of the live dashboard or the episode export package.
          </p>
        </div>
      </div>

      <Alert variant="error" message={error} />
      <Alert variant="success" message={success} />

      <form className="episode-form" onSubmit={(event) => void handleSave(event)}>
        <fieldset className="form-section">
          <legend>Export defaults</legend>

          <FormField
            label="Default export folder"
            htmlFor="settings-export-folder"
            hint="Optional absolute folder path used to seed the export destination dialog."
          >
            <input
              id="settings-export-folder"
              value={form.defaultExportFolder}
              onChange={(event) => update('defaultExportFolder', event.target.value)}
              placeholder="C:\\Exports\\LeyuTune"
            />
          </FormField>

          <div className="form-grid">
            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={form.allowExportWithWarnings}
                onChange={(event) => update('allowExportWithWarnings', event.target.checked)}
              />
              <span>Allow export with warnings</span>
            </label>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={form.keepTemporaryExportFolder}
                onChange={(event) => update('keepTemporaryExportFolder', event.target.checked)}
              />
              <span>Keep temporary export folder for debugging</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Episode defaults</legend>
          <div className="form-grid">
            <FormField
              label="Default app version"
              htmlFor="settings-app-version"
              hint="Used when creating a new episode."
            >
              <input
                id="settings-app-version"
                value={form.defaultAppVersion}
                onChange={(event) => update('defaultAppVersion', event.target.value)}
              />
            </FormField>

            <FormField
              label="Default export version"
              htmlFor="settings-export-version"
              hint="Used when creating a new episode."
            >
              <input
                id="settings-export-version"
                value={form.defaultExportVersion}
                onChange={(event) => update('defaultExportVersion', event.target.value)}
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Preferred media extensions</legend>
          <p className="muted form-section__hint">
            These are local producer preferences for future media-picking workflows and defaults.
          </p>

          <div className="settings-extension-grid">
            <div className="settings-extension-card">
              <h3>Preferred audio extensions</h3>
              {SUPPORTED_QUESTION_AUDIO_EXTENSIONS.map((extension) => (
                <label key={extension} className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={form.preferredAudioExtensions.includes(extension)}
                    onChange={() =>
                      update(
                        'preferredAudioExtensions',
                        toggleExtension(form.preferredAudioExtensions, extension)
                      )
                    }
                  />
                  <span>.{extension}</span>
                </label>
              ))}
            </div>

            <div className="settings-extension-card">
              <h3>Preferred image extensions</h3>
              {SUPPORTED_IMAGE_EXTENSIONS.map((extension) => (
                <label key={extension} className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={form.preferredImageExtensions.includes(extension)}
                    onChange={() =>
                      update(
                        'preferredImageExtensions',
                        toggleExtension(form.preferredImageExtensions, extension)
                      )
                    }
                  />
                  <span>.{extension}</span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Diagnostics</legend>
          <FormField
            label="Log file location"
            htmlFor="settings-log-file"
            hint="Main-process logs are written locally in the Electron userData directory."
          >
            <input id="settings-log-file" value={logFilePath} readOnly />
          </FormField>

          <div className="form-actions">
            <button type="button" className="btn" onClick={() => void handleOpenLogsFolder()}>
              Open Logs Folder
            </button>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn" onClick={() => void handleReset()} disabled={saving}>
            Reset to Defaults
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </section>
  )
}
