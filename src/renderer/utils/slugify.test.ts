import { describe, expect, it } from 'vitest'
import { normalizeSlug, slugifyTitle } from './slugify'

describe('slugifyTitle', () => {
  it('converts a title to a lowercase hyphen-separated slug', () => {
    expect(slugifyTitle('Epic Quiz Show')).toBe('epic-quiz-show')
  })

  it('removes unsafe filename characters', () => {
    expect(slugifyTitle('LeyuTune: Finals/Bonus? *Round*')).toBe('leyutune-finals-bonus-round')
  })

  it('trims repeated separators from the start and end', () => {
    expect(slugifyTitle('   !!! Big Night @ LeyuTune !!!   ')).toBe('big-night-leyutune')
  })
})

describe('normalizeSlug', () => {
  it('normalizes manual slug input to the same safe format', () => {
    expect(normalizeSlug('My--Custom__Slug')).toBe('my-custom-slug')
  })
})
