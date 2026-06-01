import * as fs from 'fs'
import * as path from 'path'
import { DEFAULT_STAGE_CONFIGS, QUESTION_TYPES } from '../../shared/constants'
import type { CreateEpisodeInput } from '../../shared/db-inputs'
import type { QuestionType } from '../../shared/question-type'

export interface DemoMediaPaths {
  questionMusicPath: string
  answerMusicPath: string
  imagePath: string
  mediaDirectory: string
}

export interface DemoEpisodeSeed {
  episode: CreateEpisodeInput
  questions: DemoQuestionSeed[]
}

export type DemoQuestionSeed = {
  stageNo: number
  questionNo: number
  choiceOne: string
  choiceTwo: string
  choiceThree: string
  choiceFour: string
  actualAnswer: string
  point: number
  category: string
  questionType: QuestionType
  questionMusicPath: string
  answerMusicPath: string
  imagePath: string
}

export function ensureDemoMediaFiles(rootDirectory = process.cwd()): DemoMediaPaths {
  const mediaDirectory = path.join(rootDirectory, '.dev-assets', 'demo-media')
  fs.mkdirSync(mediaDirectory, { recursive: true })

  const questionMusicPath = path.join(mediaDirectory, 'demo-question.mp3')
  const answerMusicPath = path.join(mediaDirectory, 'demo-answer.mp3')
  const imagePath = path.join(mediaDirectory, 'demo-image.jpg')

  if (!fs.existsSync(questionMusicPath)) {
    fs.writeFileSync(questionMusicPath, 'demo question audio placeholder\n', 'utf8')
  }

  if (!fs.existsSync(answerMusicPath)) {
    fs.writeFileSync(answerMusicPath, 'demo answer audio placeholder\n', 'utf8')
  }

  if (!fs.existsSync(imagePath)) {
    fs.writeFileSync(imagePath, 'demo image placeholder\n', 'utf8')
  }

  return {
    questionMusicPath,
    answerMusicPath,
    imagePath,
    mediaDirectory
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  let suffix = 2
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1
  }

  return `${baseSlug}-${suffix}`
}

function resolveQuestionType(stageNo: number, questionNo: number): QuestionType {
  if (stageNo === 4) {
    return 'final'
  }

  if (stageNo === 3 && questionNo === 5) {
    return 'jackpot'
  }

  return QUESTION_TYPES[(questionNo - 1) % QUESTION_TYPES.length] ?? 'normal'
}

export function buildDemoEpisodeSeed(input: {
  existingSlugs: string[]
  mediaPaths: DemoMediaPaths
  now?: Date
}): DemoEpisodeSeed {
  const now = input.now ?? new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-')
  const baseTitle = `[DEMO] LeyuTune Demo Episode ${timestamp}`
  const baseSlug = slugify(baseTitle)
  const uniqueSlug = buildUniqueSlug(baseSlug, new Set(input.existingSlugs))

  const episode: CreateEpisodeInput = {
    title: baseTitle,
    slug: uniqueSlug,
    description:
      'Developer demo episode generated for UI, validation, compatibility preview, and export testing.',
    producerName: 'Developer Demo Generator'
  }

  const questions: DemoQuestionSeed[] = []

  for (const stageConfig of DEFAULT_STAGE_CONFIGS) {
    for (let questionNo = 1; questionNo <= stageConfig.questionCount; questionNo += 1) {
      const questionType = resolveQuestionType(stageConfig.stageNo, questionNo)
      const correctChoiceIndex = ((questionNo - 1) % 4) + 1
      const choices = [
        `Stage ${stageConfig.stageNo} Q${questionNo} Choice A`,
        `Stage ${stageConfig.stageNo} Q${questionNo} Choice B`,
        `Stage ${stageConfig.stageNo} Q${questionNo} Choice C`,
        `Stage ${stageConfig.stageNo} Q${questionNo} Choice D`
      ]

      questions.push({
        stageNo: stageConfig.stageNo,
        questionNo,
        choiceOne: choices[0],
        choiceTwo: choices[1],
        choiceThree: choices[2],
        choiceFour: choices[3],
        actualAnswer: choices[correctChoiceIndex - 1],
        point: stageConfig.stageNo * 100 + questionNo * 10,
        category: `Demo Category S${stageConfig.stageNo}`,
        questionType,
        questionMusicPath: input.mediaPaths.questionMusicPath,
        answerMusicPath: input.mediaPaths.answerMusicPath,
        imagePath: input.mediaPaths.imagePath
      })
    }
  }

  return { episode, questions }
}
