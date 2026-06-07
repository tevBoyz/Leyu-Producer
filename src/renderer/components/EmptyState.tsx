interface Props {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'default' | 'compact'
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default'
}: Props): React.ReactElement {
  return (
    <div className={`empty-state${variant === 'compact' ? ' empty-state--compact' : ''}`}>
      <div className="empty-state__icon" aria-hidden="true">
        ◻
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
