interface Props {
  variant: 'success' | 'error' | 'info'
  message: string
}

export function Alert({ variant, message }: Props): React.ReactElement | null {
  if (!message) return null
  return <div className={`alert alert--${variant}`}>{message}</div>
}
