import type { Question } from '../../../shared/question'
import type { StageConfig } from '../../../shared/stage-config'
import {
  getMissingQuestionNumbers,
  questionsForStage,
  suggestNextQuestionNo
} from '../../utils/questionHelpers'
import { QuestionCard } from './QuestionCard'

interface Props {
  stage: StageConfig
  questions: Question[]
  onAdd: (questionNo: number) => void
  onEdit: (question: Question) => void
  onDelete: (question: Question) => void
  onPreviewAudio: (
    question: Question,
    kind: 'questionMusic' | 'answerMusic',
    path: string
  ) => void
  activeAudioKey: string | null
}

export function StageQuestionPanel({
  stage,
  questions,
  onAdd,
  onEdit,
  onDelete,
  onPreviewAudio,
  activeAudioKey
}: Props): React.ReactElement {
  const stageQuestions = questionsForStage(questions, stage.stageNo)
  const missing = getMissingQuestionNumbers(questions, stage.stageNo, stage.questionCount)
  const extra = stageQuestions.filter((q) => q.questionNo > stage.questionCount)

  return (
    <div className="stage-panel">
      <div className="stage-panel__stats">
        <span>
          <strong>Expected:</strong> {stage.questionCount}
        </span>
        <span>
          <strong>Current:</strong> {stageQuestions.length}
        </span>
        <span>
          <strong>Missing slots:</strong>{' '}
          {missing.length > 0 ? missing.map((n) => `Q${n}`).join(', ') : 'None'}
        </span>
      </div>

      {missing.length > 0 && (
        <div className="missing-slots">
          <span className="muted">Add missing:</span>
          {missing.map((n) => (
            <button key={n} type="button" className="btn btn--chip" onClick={() => onAdd(n)}>
              Q{n}
            </button>
          ))}
        </div>
      )}

      <div className="stage-panel__toolbar">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() =>
            onAdd(suggestNextQuestionNo(questions, stage.stageNo, stage.questionCount))
          }
        >
          Add question
        </button>
      </div>

      {stageQuestions.length === 0 && (
        <p className="muted">No questions in this stage yet.</p>
      )}

      <div className="question-card-grid">
        {stageQuestions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            onEdit={() => onEdit(q)}
            onDelete={() => onDelete(q)}
            onPreviewAudio={onPreviewAudio}
            activeAudioKey={activeAudioKey}
          />
        ))}
      </div>

      {extra.length > 0 && (
        <p className="muted stage-panel__extra-note">
          {extra.length} question(s) use numbers above the configured stage count (
          {stage.questionCount}).
        </p>
      )}
    </div>
  )
}
