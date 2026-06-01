import type { Question } from '../../../shared/question'
import { isQuestionComplete } from '../../utils/questionHelpers'

interface Props {
  question: Question
  onEdit: () => void
  onDelete: () => void
  onPreviewAudio: (
    question: Question,
    kind: 'questionMusic' | 'answerMusic',
    path: string
  ) => void
  activeAudioKey: string | null
}

export function QuestionCard({
  question,
  onEdit,
  onDelete,
  onPreviewAudio,
  activeAudioKey
}: Props): React.ReactElement {
  const complete = isQuestionComplete(question)
  const mediaReady =
    question.questionMusicPath.trim() !== '' &&
    question.answerMusicPath.trim() !== '' &&
    question.imagePath.trim() !== ''
  const questionAudioKey = `question:${question.id}`
  const answerAudioKey = `answer:${question.id}`

  return (
    <article className={`question-card${complete ? '' : ' question-card--incomplete'}`}>
      <div className="question-card__header">
        <span className="question-card__number">Q{question.questionNo}</span>
        <span className="question-card__type">{question.questionType}</span>
        {!complete && <span className="question-card__badge">Needs details</span>}
      </div>

      <p className="question-card__answer">
        <span className="muted">Answer:</span> {question.actualAnswer || 'Not set'}
      </p>

      <p className="question-card__meta">
        <span>{question.point > 0 ? `$${question.point}` : 'No points yet'}</span>
        {question.category && <span> · {question.category}</span>}
      </p>

      <div className="question-card__status-list" aria-label="Question status">
        <span className={`question-status-chip${complete ? ' question-status-chip--ok' : ''}`}>
          {complete ? 'Question complete' : 'Question incomplete'}
        </span>
        <span className={`question-status-chip${mediaReady ? ' question-status-chip--ok' : ''}`}>
          {mediaReady ? 'Media ready' : 'Media missing'}
        </span>
      </div>

      <div className="question-card__choices">
        {[question.choiceOne, question.choiceTwo, question.choiceThree, question.choiceFour]
          .filter((choice) => choice.trim())
          .map((choice, index) => (
            <span key={index} className="question-card__choice">
              {choice}
            </span>
          ))}
      </div>

      <div className="question-card__preview-row" aria-label={`Audio preview for question ${question.questionNo}`}>
        <button
          type="button"
          className={`btn btn--compact${activeAudioKey === questionAudioKey ? ' btn--primary' : ''}`}
          onClick={() => onPreviewAudio(question, 'questionMusic', question.questionMusicPath)}
        >
          {activeAudioKey === questionAudioKey ? 'Stop Question' : 'Play Question'}
        </button>
        <button
          type="button"
          className={`btn btn--compact${activeAudioKey === answerAudioKey ? ' btn--primary' : ''}`}
          onClick={() => onPreviewAudio(question, 'answerMusic', question.answerMusicPath)}
        >
          {activeAudioKey === answerAudioKey ? 'Stop Answer' : 'Play Answer'}
        </button>
      </div>

      <div className="btn-group question-card__actions">
        <button type="button" className="btn" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={onDelete}
          aria-label={`Delete question ${question.questionNo}`}
        >
          Delete
        </button>
      </div>
    </article>
  )
}
