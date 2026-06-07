export interface StartupCheck {
  id: string
  label: string
  ok: boolean
  message: string
}

export interface StartupStatus {
  ready: boolean
  appVersion: string
  checks: StartupCheck[]
}
