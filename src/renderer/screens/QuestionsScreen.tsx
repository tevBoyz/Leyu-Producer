import { useCallback, useEffect, useRef, useState } from 'react'
import type { EpisodeDetail } from '../../shared/db-inputs'
import type { Question } from '../../shared/question'
import { Alert } from '../components/Alert'
import {
  QuestionForm,
  buildEmptyQuestionForm,
  questionToFormValues
} from '../components/questions/QuestionForm'
import { StageQuestionPanel } from '../components/questions/StageQuestionPanel'
import { PlaceholderScreen } from './PlaceholderScreen'
import type { QuestionFormValues } from '../utils/questionHelpers'
import { suggestNextQuestionNo } from '../utils/questionHelpers'

interface Props {
  episodeId: string | null
  onDataChanged?: () => void
}

type EditorState =
  | { mode: 'add'; stageNo: number; questionNo: number }
  | { mode: 'edit'; question: Question }

export function QuestionsScreen({ episodeId, onDataChanged }: Props): React.ReactElement {
  const [detail, setDetail] = useState<EpisodeDetail | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeStageNo, setActiveStageNo] = useState<number>(1)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [audioError, setAudioError] = useState('')
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioObjectUrlRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    if (!episodeId) return
    setLoading(true)
    setError('')
    try {
      const [epDetail, qs] = await Promise.all([
        window.producerApi.episodes.get(episodeId),
        window.producerApi.questions.list(episodeId)
      ])
      if (!epDetail) {
        setError('Episode not found.')
        setDetail(null)
        setQuestions([])
        return
      }
      setDetail(epDetail)
      setQuestions(qs)
      const stages = [...epDetail.stageConfigs].sort((a, b) => a.sortOrder - b.sortOrder)
      if (stages.length > 0 && !stages.some((s) => s.stageNo === activeStageNo)) {
        setActiveStageNo(stages[0].stageNo)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }, [episodeId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current)
        audioObjectUrlRef.current = null
      }
    }
  }, [])

  if (!episodeId) {
    return (
      <PlaceholderScreen
        title="Questions"
        description="Select an episode from the Episodes list and click Open Questions."
      />
    )
  }

  const stageConfigs = detail
    ? [...detail.stageConfigs].sort((a, b) => a.sortOrder - b.sortOrder)
    : []
  const activeStage = stageConfigs.find((s) => s.stageNo === activeStageNo)

  function openAdd(stageNo: number, questionNo?: number): void {
    const stage = stageConfigs.find((s) => s.stageNo === stageNo)
    const expected = stage?.questionCount ?? 1
    const suggested =
      questionNo ??
      suggestNextQuestionNo(questions, stageNo, expected)
    setEditor({ mode: 'add', stageNo, questionNo: suggested })
    setSuccess('')
    setError('')
  }

  function openEdit(question: Question): void {
    setEditor({ mode: 'edit', question })
    setSuccess('')
    setError('')
  }

  async function handlePreviewAudio(
    question: Question,
    kind: 'questionMusic' | 'answerMusic',
    rawPath: string
  ): Promise<void> {
    const trimmedPath = rawPath.trim()
    const audioKey = `${kind === 'questionMusic' ? 'question' : 'answer'}:${question.id}`

    setAudioError('')

    if (!trimmedPath) {
      setAudioError(
        kind === 'questionMusic'
          ? `Question ${question.questionNo} does not have question music selected yet.`
          : `Question ${question.questionNo} does not have answer music selected yet.`
      )
      return
    }

    if (activeAudioKey === audioKey && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setActiveAudioKey(null)
      return
    }

    try {
      const fileCheck = await window.producerApi.checkFileExists(trimmedPath)
      if (!fileCheck.exists) {
        throw new Error(
          fileCheck.error ||
            `Audio file was not found for question ${question.questionNo}.`
        )
      }

      if (!audioRef.current) {
        audioRef.current = new Audio()
        audioRef.current.addEventListener('ended', () => {
          setActiveAudioKey(null)
        })
        audioRef.current.addEventListener('error', () => {
          setActiveAudioKey(null)
          setAudioError(`Could not play the selected audio for question ${question.questionNo}.`)
        })
      }

      const preview = await window.producerApi.readAudioPreview(trimmedPath)
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current)
        audioObjectUrlRef.current = null
      }

      audioRef.current.pause()
      audioRef.current.currentTime = 0
      const audioBuffer = preview.bytes.buffer.slice(
        preview.bytes.byteOffset,
        preview.bytes.byteOffset + preview.bytes.byteLength
      ) as ArrayBuffer
      const blob = new Blob([audioBuffer], { type: preview.mimeType })
      const objectUrl = URL.createObjectURL(blob)
      audioObjectUrlRef.current = objectUrl
      audioRef.current.src = objectUrl
      await audioRef.current.play()
      setActiveAudioKey(audioKey)
    } catch (previewError) {
      setActiveAudioKey(null)
      setAudioError(
        previewError instanceof Error
          ? previewError.message
          : 'Could not preview the selected audio.'
      )
    }
  }

  async function handleSave(values: QuestionFormValues): Promise<void> {
    await window.producerApi.questions.upsert({
      id: values.id,
      episodeId: values.episodeId,
      stageNo: values.stageNo,
      questionNo: values.questionNo,
      choiceOne: values.choiceOne,
      choiceTwo: values.choiceTwo,
      choiceThree: values.choiceThree,
      choiceFour: values.choiceFour,
      actualAnswer: values.actualAnswer,
      point: values.point,
      category: values.category || undefined,
      questionType: values.questionType,
      questionMusicPath: values.questionMusicPath || null,
      answerMusicPath: values.answerMusicPath || null,
      imagePath: values.imagePath || null
    })
    setEditor(null)
    setSuccess('Question saved.')
    await load()
    onDataChanged?.()
  }

  async function handleDelete(question: Question): Promise<void> {
    if (
      !confirm(
        `Delete Stage ${question.stageNo} Question ${question.questionNo}?\n\nThis cannot be undone.`
      )
    ) {
      return
    }
    setError('')
    try {
      await window.producerApi.questions.delete(question.id)
      if (editor?.mode === 'edit' && editor.question.id === question.id) {
        setEditor(null)
      }
      setSuccess('Question deleted.')
      await load()
      onDataChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const editorInitial =
    editor?.mode === 'edit'
      ? questionToFormValues(editor.question)
      : editor?.mode === 'add'
        ? buildEmptyQuestionForm(episodeId, editor.stageNo, editor.questionNo)
        : null

  return (
    <section className="screen questions-screen">
      <div className="screen-header">
        <div>
          <h2>Questions</h2>
          <p className="muted">
            {detail ? (
              <>
                Episode: <strong>{detail.episode.title}</strong> (
                <code>{detail.episode.slug}</code>)
              </>
            ) : (
              'Loading episode…'
            )}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      <Alert variant="error" message={error} />
      <Alert variant="error" message={audioError} />
      <Alert variant="success" message={success} />

      {loading && !detail && <p className="muted">Loading…</p>}

      {detail && (
        <>
          <div className="stage-tabs" role="tablist" aria-label="Question stages">
            {stageConfigs.map((stage) => (
              <button
                key={stage.stageNo}
                type="button"
                role="tab"
                aria-selected={activeStageNo === stage.stageNo}
                className={`stage-tab${activeStageNo === stage.stageNo ? ' stage-tab--active' : ''}`}
                onClick={() => {
                  setActiveStageNo(stage.stageNo)
                  setEditor(null)
                }}
              >
                {stage.label}
                <span className="stage-tab__count">
                  {questions.filter((q) => q.stageNo === stage.stageNo).length}/
                  {stage.questionCount}
                </span>
              </button>
            ))}
          </div>

          {activeStage && (
            <>
              <div className="questions-workspace">
                <div className="questions-workspace__main">
                  <h3 className="stage-heading">
                    Editing: {activeStage.label} (Stage {activeStage.stageNo})
                  </h3>

                  <StageQuestionPanel
                    stage={activeStage}
                    questions={questions}
                    onAdd={(n) => openAdd(activeStage.stageNo, n)}
                    onEdit={openEdit}
                    onDelete={(q) => void handleDelete(q)}
                    onPreviewAudio={(question, kind, path) =>
                      void handlePreviewAudio(question, kind, path)
                    }
                    activeAudioKey={activeAudioKey}
                  />
                </div>

                <aside className="questions-workspace__sidebar">
                  {editor && editorInitial && editorInitial.stageNo === activeStage.stageNo ? (
                    <QuestionForm
                      stageLabel={activeStage.label}
                      initial={editorInitial}
                      existingQuestions={questions}
                      onSave={handleSave}
                      onCancel={() => setEditor(null)}
                    />
                  ) : (
                    <div className="card question-editor-placeholder">
                      <h3>Question Editor</h3>
                      <p className="muted">
                        Select a question card to edit it, or add a missing slot to keep the stage
                        aligned with the expected episode layout.
                      </p>
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
