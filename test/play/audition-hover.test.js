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

  it('recomputes a draft-dependent preview when asked', () => {
    let draft = ['C3', 'E3', 'G3']
    rememberHover(draft, 'C', () => ({ notes: draft, bass: 'C' }))
    // The draft moved (for example a transform was applied under the pointer).
    draft = ['C#3', 'F3', 'G#3']
    assert.deepEqual(getHoveredPreview(), { notes: ['C#3', 'F3', 'G#3'], bass: 'C' })
  })

  it('drops a resolved preview that has become empty', () => {
    rememberHover(['C3'], 'C', () => ({ notes: [], bass: '' }))
    assert.equal(getHoveredPreview(), null)
  })

  it('treats a throwing resolver as nothing to resume', () => {
    rememberHover(['C3'], 'C', () => { throw new Error('boom') })
    assert.equal(getHoveredPreview(), null)
  })

  it('clears a moved preview when the pointer leaves', () => {
    let draft = ['C3', 'E3', 'G3']
    rememberHover(draft, 'C', () => ({ notes: draft, bass: 'C' }))
    draft = ['C#3', 'F3', 'G#3']
    // The leaving notes are the freshly resolved ones, not the entry snapshot.
    forgetHover(['C#3', 'F3', 'G#3'])
    assert.equal(getHoveredPreview(), null)
  })

  it('keeps a newer hover when a stale preview leaves', () => {
    rememberHover(['D3', 'F3', 'A3'], 'D')
    forgetHover(['C3', 'E3', 'G3'])
    assert.deepEqual(getHoveredPreview(), { notes: ['D3', 'F3', 'A3'], bass: 'D' })
  })
})
