import assert from 'assert'
import { filterAllowedRows } from '@/lib/sequencer-notes.js'

const notes = [
    { t: 0, n: 60, g: 16 },
    { t: 16, n: 62, g: 16 },
    { t: 32, n: 63, g: 16 },
    { t: 48, n: 72, g: 16 },
]

describe('filterAllowedRows', () => {
    it('returns the list unchanged when there is no whitelist', () => {
        assert.equal(filterAllowedRows(notes, null), notes)
        assert.equal(filterAllowedRows(notes, undefined), notes)
    })

    it('keeps only notes on the allowed rows', () => {
        const kept = filterAllowedRows(notes, [60, 62, 72])
        assert.deepEqual(kept.map(note => note.n), [60, 62, 72])
    })

    it('coerces rows given as strings', () => {
        const kept = filterAllowedRows(notes, ['60', '63'])
        assert.deepEqual(kept.map(note => note.n), [60, 63])
    })

    it('handles an empty whitelist by removing everything', () => {
        assert.deepEqual(filterAllowedRows(notes, []), [])
    })
})
