import { describe, expect, it } from 'vitest'
import {
  createDefaultStageDrafts,
  updateStageQuestionCount,
  validateStageQuestionCounts
} from './episodeStageConfigs'

describe('episodeStageConfigs', () => {
  it('creates the default stage counts for a new episode', () => {
    expect(createDefaultStageDrafts()).toEqual([
      { stageNo: 1, label: 'Stage 1', questionCount: 15, sortOrder: 1 },
      { stageNo: 2, label: 'Stage 2', questionCount: 10, sortOrder: 2 },
      { stageNo: 3, label: 'Stage 3', questionCount: 5, sortOrder: 3 },
      { stageNo: 4, label: 'Final / Bonus', questionCount: 1, sortOrder: 4 }
    ])
  })

  it('updates a stage question count without mutating the other stages', () => {
    const updated = updateStageQuestionCount(createDefaultStageDrafts(), 2, 12)

    expect(updated.find((stage) => stage.stageNo === 2)?.questionCount).toBe(12)
    expect(updated.find((stage) => stage.stageNo === 1)?.questionCount).toBe(15)
    expect(updated.find((stage) => stage.stageNo === 4)?.questionCount).toBe(1)
  })

  it('requires stage counts to be positive integers', () => {
    const errors = validateStageQuestionCounts([
      { stageNo: 1, label: 'Stage 1', questionCount: 0, sortOrder: 1 },
      { stageNo: 2, label: 'Stage 2', questionCount: 2.5, sortOrder: 2 },
      { stageNo: 3, label: 'Stage 3', questionCount: -1, sortOrder: 3 },
      { stageNo: 4, label: 'Final / Bonus', questionCount: 1, sortOrder: 4 }
    ])

    expect(errors).toEqual({
      1: 'Enter a positive whole number.',
      2: 'Enter a positive whole number.',
      3: 'Enter a positive whole number.'
    })
  })
})
