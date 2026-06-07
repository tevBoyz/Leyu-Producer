import { useMemo, useState } from 'react'
import { QUESTION_TYPES } from '../../../shared/constants'
import { areChoicesRequiredForStage } from '../../../shared/question-rules'
import type { QuestionType } from '../../../shared/question-type'
import { Alert } from '../Alert'
import { FormField } from '../forms/FormField'
import type { QuestionFormErrors, QuestionFormValues } from '../../utils/questionHelpers'
import {
  defaultQuestionTypeForStage,
  hasFormErrors,
  validateMediaPaths,
  validateQuestionForm
} from '../../utils/questionHelpers'
import { MediaPathField } from './MediaPathField'
import type { Question } from '../../../shared/question'

interface Props {
  stageLabel: string
  initial: QuestionFormValues
  existingQuestions: Question[]
  onSave: (values: QuestionFormValues) => Promise<void>
  onCancel: () => void
}

export function QuestionForm({
  stageLabel,
  initial,
  existingQuestions,
  onSave,
  onCancel
}: Props): React.ReactElement {
  const [form, setForm] = useState<QuestionFormValues>(initial)
  const [errors, setErrors] = useState<QuestionFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [answerMode, setAnswerMode] = useState<'choice' | 'manual'>(() => {
    if (!areChoicesRequiredForStage(initial.stageNo)) {
      return 'manual'
    }
    const choices = getChoiceList(initial)
    return choices.includes(initial.actualAnswer.trim()) || !initial.actualAnswer.trim()
      ? 'choice'
      : 'manual'
  })

  const choiceOptions = useMemo(() => getChoiceList(form), [form])
  const choicesRequired = areChoicesRequiredForStage(form.stageNo)
  const choiceLabelSuffix = choicesRequired ? '' : ' (optional)'

  function getChoiceList(values: QuestionFormValues): string[] {
    return [values.choiceOne, values.choiceTwo, values.choiceThree, values.choiceFour]
      .map((c) => c.trim())
      .filter(Boolean)
  }

  function update<K extends keyof QuestionFormValues>(key: K, value: QuestionFormValues[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key as keyof QuestionFormErrors]
      delete next.form
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSaveError('')
    const validation = validateQuestionForm(form, existingQuestions)
    const mediaErrors = await validateMediaPaths(form)
    const merged = { ...validation, ...mediaErrors }
    setErrors(merged)
    if (hasFormErrors(merged)) return

    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="question-form-panel">
      <h3>
        {form.id ? 'Edit question' : 'Add question'} — {stageLabel}
      </h3>
      <p className="muted question-form-panel__hint">
        Question type is stored for manifest export only (not in legacy MySQL rows).
      </p>

      <Alert variant="error" message={saveError} />

      <form onSubmit={(e) => void handleSubmit(e)}>
        <div className="form-grid">
          <FormField label="Stage" htmlFor="q-stage">
            <input id="q-stage" value={form.stageNo} readOnly disabled />
          </FormField>

          <FormField label="Question number" htmlFor="q-no" error={errors.questionNo}>
            <input
              id="q-no"
              type="number"
              min={1}
              step={1}
              value={form.questionNo}
              onChange={(e) => update('questionNo', Number(e.target.value))}
            />
          </FormField>

          <FormField label="Question type" htmlFor="q-type">
            <select
              id="q-type"
              value={form.questionType}
              onChange={(e) => update('questionType', e.target.value as QuestionType)}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Money amount (point)" htmlFor="q-point" error={errors.point}>
            <input
              id="q-point"
              type="number"
              min={1}
              step={1}
              value={form.point || ''}
              onChange={(e) => update('point', Number(e.target.value))}
            />
          </FormField>
        </div>

        <FormField label="Category / artist" htmlFor="q-cat">
          <input
            id="q-cat"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          />
        </FormField>

        <div className="form-grid">
          {!choicesRequired && (
            <p className="muted form-section__hint form-grid__full-width">
              Stage 3 questions do not require multiple-choice fields. Leave them blank if the
              round uses audio and a typed answer only.
            </p>
          )}
          <FormField label={`Choice 1${choiceLabelSuffix}`} htmlFor="q-c1" error={errors.choiceOne}>
            <input
              id="q-c1"
              value={form.choiceOne}
              onChange={(e) => update('choiceOne', e.target.value)}
            />
          </FormField>
          <FormField label={`Choice 2${choiceLabelSuffix}`} htmlFor="q-c2" error={errors.choiceTwo}>
            <input
              id="q-c2"
              value={form.choiceTwo}
              onChange={(e) => update('choiceTwo', e.target.value)}
            />
          </FormField>
          <FormField label={`Choice 3${choiceLabelSuffix}`} htmlFor="q-c3" error={errors.choiceThree}>
            <input
              id="q-c3"
              value={form.choiceThree}
              onChange={(e) => update('choiceThree', e.target.value)}
            />
          </FormField>
          <FormField label={`Choice 4${choiceLabelSuffix}`} htmlFor="q-c4" error={errors.choiceFour}>
            <input
              id="q-c4"
              value={form.choiceFour}
              onChange={(e) => update('choiceFour', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Correct answer" htmlFor="q-answer" error={errors.actualAnswer}>
          <div className="answer-picker">
            <select
              id="q-answer"
              value={answerMode === 'manual' ? '__manual__' : form.actualAnswer}
              onChange={(e) => {
                if (e.target.value === '__manual__') {
                  setAnswerMode('manual')
                } else {
                  setAnswerMode('choice')
                  update('actualAnswer', e.target.value)
                }
              }}
            >
              <option value="">Select from choices…</option>
              {choiceOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__manual__">Type manually…</option>
            </select>
            {answerMode === 'manual' && (
              <input
                className="answer-picker__manual"
                placeholder="Enter correct answer"
                value={form.actualAnswer}
                onChange={(e) => update('actualAnswer', e.target.value)}
              />
            )}
          </div>
        </FormField>

        <fieldset className="form-section form-section--compact">
          <legend>Local media (producer PC)</legend>
          <p className="muted form-section__hint">
            Files stay on this machine while editing. Export will copy into the episode zip
            using relative paths.
          </p>
          <MediaPathField
            id="q-music-q"
            label="Question music"
            path={form.questionMusicPath}
            error={errors.questionMusicPath}
            onChange={(p) => update('questionMusicPath', p)}
            onPick={() => window.producerApi.pickQuestionMusicFile()}
          />
          <MediaPathField
            id="q-music-a"
            label="Answer reveal music"
            path={form.answerMusicPath}
            error={errors.answerMusicPath}
            onChange={(p) => update('answerMusicPath', p)}
            onPick={() => window.producerApi.pickAnswerMusicFile()}
          />
          <MediaPathField
            id="q-image"
            label="Preview image"
            path={form.imagePath}
            error={errors.imagePath}
            onChange={(p) => update('imagePath', p)}
            onPick={() => window.producerApi.pickImageFile()}
          />
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save question'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function buildEmptyQuestionForm(
  episodeId: string,
  stageNo: number,
  questionNo: number
): QuestionFormValues {
  return {
    episodeId,
    stageNo,
    questionNo,
    choiceOne: '',
    choiceTwo: '',
    choiceThree: '',
    choiceFour: '',
    actualAnswer: '',
    point: 0,
    category: '',
    questionType: defaultQuestionTypeForStage(stageNo),
    questionMusicPath: '',
    answerMusicPath: '',
    imagePath: ''
  }
}

export function questionToFormValues(q: Question): QuestionFormValues {
  return {
    id: q.id,
    episodeId: q.episodeId,
    stageNo: q.stageNo,
    questionNo: q.questionNo,
    choiceOne: q.choiceOne,
    choiceTwo: q.choiceTwo,
    choiceThree: q.choiceThree,
    choiceFour: q.choiceFour,
    actualAnswer: q.actualAnswer,
    point: q.point,
    category: q.category,
    questionType: q.questionType,
    questionMusicPath: q.questionMusicPath,
    answerMusicPath: q.answerMusicPath,
    imagePath: q.imagePath
  }
}
