import type { ReactNode } from 'react'

interface Props {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, hint, error, children }: Props): React.ReactElement {
  return (
    <div className={`form-field${error ? ' form-field--error' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <span className="form-field__hint">{hint}</span>}
      {error && <span className="form-field__error">{error}</span>}
    </div>
  )
}
