import { useEffect, useState } from 'react'
import type { StartupCheck, StartupStatus } from '../../shared/startup'

interface Props {
  onReady: (status: StartupStatus) => void
}

type CheckVisualState = StartupCheck & {
  visible: boolean
}

export function StartupGate({ onReady }: Props): React.ReactElement {
  const [status, setStatus] = useState<StartupStatus | null>(null)
  const [checks, setChecks] = useState<CheckVisualState[]>([])
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      try {
        if (typeof window.producerApi === 'undefined') {
          throw new Error('App bridge is not available. Restart the desktop app.')
        }

        const startupStatus = await window.producerApi.app.getStartupStatus()
        if (cancelled) return

        setStatus(startupStatus)

        for (let index = 0; index < startupStatus.checks.length; index += 1) {
          if (cancelled) return
          const check = startupStatus.checks[index]
          setChecks((current) => [
            ...current,
            { ...check, visible: true }
          ])
          await new Promise((resolve) => setTimeout(resolve, 180))
        }

        if (startupStatus.ready) {
          setPhase('ready')
          await new Promise((resolve) => setTimeout(resolve, 350))
          if (!cancelled) {
            onReady(startupStatus)
          }
        } else {
          setPhase('failed')
        }
      } catch (bootError) {
        if (!cancelled) {
          setPhase('failed')
          setError(
            bootError instanceof Error ? bootError.message : 'Startup checks failed.'
          )
        }
      }
    }

    void boot()

    return () => {
      cancelled = true
    }
  }, [onReady])

  return (
    <div className="startup-gate">
      <div className="startup-gate__panel card">
        <div className="startup-gate__header">
          <div className="startup-spinner" aria-hidden="true" />
          <div>
            <p className="startup-gate__eyebrow">LeyuTune Producer</p>
            <h1>{phase === 'ready' ? 'All systems go' : 'Starting up…'}</h1>
            <p className="muted">
              {status
                ? `Version ${status.appVersion}`
                : 'Connecting to local database and services…'}
            </p>
          </div>
        </div>

        <ul className="startup-checklist" aria-live="polite">
          {checks.map((check) => (
            <li
              key={check.id}
              className={`startup-checklist__item startup-checklist__item--${check.ok ? 'ok' : 'fail'}${check.visible ? ' startup-checklist__item--visible' : ''}`}
            >
              <span className="startup-checklist__icon">{check.ok ? '✓' : '!'}</span>
              <div>
                <strong>{check.label}</strong>
                <span>{check.message}</span>
              </div>
            </li>
          ))}
        </ul>

        {phase === 'failed' && (
          <div className="alert alert--error">
            {error || 'One or more startup checks failed. Check logs and restart the app.'}
          </div>
        )}

        {phase === 'ready' && (
          <p className="startup-gate__ready-note">Opening workspace…</p>
        )}
      </div>
    </div>
  )
}
