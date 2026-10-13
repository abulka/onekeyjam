import assert from 'assert'
import {
  clearHoveredPreview,
  forgetHover,
  getHoveredPreview,
  rememberHover,
} from '@/lib/auditionHover.js'

describe('auditionHover shared preview', () => {
  beforeEach(() => {
    clearHoveredPreview()
  })

  afterEach(() => {
    clearHoveredPreview()
  })

  it('remembers the hovered preview for backquote resume', () => {
    rememberHover(['C3', 'E3', 'G3'], 'C')
    assert.deepEqual(getHoveredPreview(), { notes: ['C3', 'E3', 'G3'], bass: 'C' })
  })

  it('keeps the newest hover when moving fast across buttons', () => {
    rememberHover(['C3', 'E3', 'G3'], 'C')
    rememberHover(['D3', 'F3', 'A3'], 'D')
    assert.deepEqual(getHoveredPreview(), { notes: ['D3', 'F3', 'A3'], bass: 'D' })
  })

  it('only clears when the leaving preview matches', () => {
    rememberHover(['C3', 'E3', 'G3'], 'C')
    forgetHover(['D3', 'F3', 'A3'])
    assert.deepEqual(getHoveredPreview(), { notes: ['C3', 'E3', 'G3'], bass: 'C' })
    forgetHover(['C3', 'E3', 'G3'])
    assert.equal(getHoveredPreview(), null)
  })

  it('ignores empty previews', () => {
    rememberHover([], 'C')
    assert.equal(getHoveredPreview(), null)
    rememberHover(['C3'], '')
    assert.deepEqual(getHoveredPreview(), { notes: ['C3'], bass: '' })
  })
})
