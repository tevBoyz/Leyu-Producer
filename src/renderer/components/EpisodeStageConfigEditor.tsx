import type { UpsertStageConfigInput } from '../../shared/db-inputs'

export interface StageConfigDraft extends UpsertStageConfigInput {}

interface Props {
  configs: StageConfigDraft[]
  errors: Record<number, string>
  onChange: (stageNo: number, questionCount: number) => void
}

export function EpisodeStageConfigEditor({
  configs,
  errors,
  onChange
}: Props): React.ReactElement {
  const sorted = [...configs].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="stage-config-grid">
      {sorted.map((cfg) => (
        <div key={cfg.stageNo} className="stage-config-card">
          <div className="stage-config-card__header">
            <strong>{cfg.label}</strong>
            <span className="muted">Stage {cfg.stageNo}</span>
          </div>
          <label htmlFor={`stage-count-${cfg.stageNo}`}>Question count</label>
          <input
            id={`stage-count-${cfg.stageNo}`}
            type="number"
            min={1}
            step={1}
            value={cfg.questionCount}
            onChange={(e) => onChange(cfg.stageNo, Number(e.target.value))}
          />
          {errors[cfg.stageNo] && (
            <span className="form-field__error">{errors[cfg.stageNo]}</span>
          )}
        </div>
      ))}
    </div>
  )
}
