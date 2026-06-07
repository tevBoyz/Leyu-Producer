import { EmptyState } from '../components/EmptyState'

interface Props {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function PlaceholderScreen({
  title,
  description,
  actionLabel,
  onAction
}: Props): React.ReactElement {
  return (
    <section className="screen">
      <EmptyState
        title={title}
        description={description}
        actionLabel={actionLabel}
        onAction={onAction}
      />
    </section>
  )
}
