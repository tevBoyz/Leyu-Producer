interface Props {
  title: string
  description: string
}

export function PlaceholderScreen({ title, description }: Props): React.ReactElement {
  return (
    <section className="screen">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="placeholder-card">
        <p>Placeholder — implementation coming in a later phase.</p>
      </div>
    </section>
  )
}
