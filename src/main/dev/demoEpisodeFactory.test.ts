import { afterEach, describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { buildDemoEpisodeSeed, ensureDemoMediaFiles } from './demoEpisodeFactory'

const testRootDir = path.resolve('.temp-test-demo-factory')

describe('ensureDemoMediaFiles', () => {
  afterEach(() => {
    if (fs.existsSync(testRootDir)) {
      fs.rmSync(testRootDir, { recursive: true, force: true })
    }
  })

  it('creates small placeholder media files in the dev assets folder', () => {
    const mediaPaths = ensureDemoMediaFiles(testRootDir)

    expect(mediaPaths.mediaDirectory).toBe(path.join(testRootDir, '.dev-assets', 'demo-media'))
    expect(fs.existsSync(mediaPaths.questionMusicPath)).toBe(true)
    expect(fs.existsSync(mediaPaths.answerMusicPath)).toBe(true)
    expect(fs.existsSync(mediaPaths.imagePath)).toBe(true)
  })
})

describe('buildDemoEpisodeSeed', () => {
  it('builds the full default question set with sequential numbering and media paths', () => {
    const mediaPaths = {
      questionMusicPath: 'C:\\demo\\demo-question.mp3',
      answerMusicPath: 'C:\\demo\\demo-answer.mp3',
      imagePath: 'C:\\demo\\demo-image.jpg',
      mediaDirectory: 'C:\\demo'
    }

    const seed = buildDemoEpisodeSeed({
      existingSlugs: [],
      mediaPaths,
      now: new Date('2026-06-01T10:00:00.000Z')
    })

    expect(seed.episode.title).toContain('[DEMO]')
    expect(seed.episode.slug).toContain('demo-leyutune-demo-episode')
    expect(seed.questions).toHaveLength(31)

    const stage1Questions = seed.questions.filter((question) => question.stageNo === 1)
    const stage2Questions = seed.questions.filter((question) => question.stageNo === 2)
    const stage3Questions = seed.questions.filter((question) => question.stageNo === 3)
    const stage4Questions = seed.questions.filter((question) => question.stageNo === 4)

    expect(stage1Questions).toHaveLength(15)
    expect(stage2Questions).toHaveLength(10)
    expect(stage3Questions).toHaveLength(5)
    expect(stage4Questions).toHaveLength(1)

    expect(stage1Questions[0].questionNo).toBe(1)
    expect(stage1Questions[14].questionNo).toBe(15)
    expect(stage4Questions[0].questionType).toBe('final')

    for (const question of seed.questions) {
      expect(question.choiceOne).toBeTruthy()
      expect(question.choiceTwo).toBeTruthy()
      expect(question.choiceThree).toBeTruthy()
      expect(question.choiceFour).toBeTruthy()
      expect(
        [
          question.choiceOne,
          question.choiceTwo,
          question.choiceThree,
          question.choiceFour
        ]
      ).toContain(question.actualAnswer)
      expect(question.questionMusicPath).toBe(mediaPaths.questionMusicPath)
      expect(question.answerMusicPath).toBe(mediaPaths.answerMusicPath)
      expect(question.imagePath).toBe(mediaPaths.imagePath)
    }
  })

  it('chooses a unique slug instead of overwriting an existing demo episode', () => {
    const seed = buildDemoEpisodeSeed({
      existingSlugs: [
        'demo-leyutune-demo-episode-2026-06-01t10-00-00-000z'
      ],
      mediaPaths: {
        questionMusicPath: 'question.mp3',
        answerMusicPath: 'answer.mp3',
        imagePath: 'image.jpg',
        mediaDirectory: '.'
      },
      now: new Date('2026-06-01T10:00:00.000Z')
    })

    expect(seed.episode.slug).toBe('demo-leyutune-demo-episode-2026-06-01t10-00-00-000z-2')
  })
})
