import type { ValidationIssue } from '../../../shared/validation'

interface Props {
  title: string
  issues: ValidationIssue[]
  variant: 'error' | 'warning'
}

function formatLocation(issue: ValidationIssue): string {
  const parts: string[] = []
  if (issue.stageNo !== undefined) parts.push(`Stage ${issue.stageNo}`)
  if (issue.questionNo !== undefined) parts.push(`Q${issue.questionNo}`)
  if (issue.field) parts.push(issue.field)
  return parts.length > 0 ? parts.join(' · ') : ''
}

export function ValidationIssueList({
  title,
  issues,
  variant
}: Props): React.ReactElement {
  if (issues.length === 0) {
    return (
      <section className={`validation-block validation-block--${variant}`}>
        <h3>{title}</h3>
        <p className="muted">None</p>
      </section>
    )
  }

  return (
    <section className={`validation-block validation-block--${variant}`}>
      <h3>
        {title} ({issues.length})
      </h3>
      <ul className="validation-issue-list">
        {issues.map((issue, index) => {
          const location = formatLocation(issue)
          return (
            <li key={`${issue.code}-${index}`} className="validation-issue">
              <span className="validation-issue__code">{issue.code}</span>
              {location && <span className="validation-issue__location">{location}</span>}
              <p className="validation-issue__message">{issue.message}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
