import assert from 'assert'
import { unionPitchClassNotes } from '../../src/lib/note-tools.js'

describe('unionPitchClassNotes', () => {

    it('merges both lists and sorts ascending from C', () => {
        assert.deepEqual(
            unionPitchClassNotes(['D', 'F', 'A'], ['C', 'E', 'G', 'B']),
            ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        )
    })

    it('drops duplicate tones including enharmonic spellings', () => {
        // C# from the primary list wins over Db from the extra list.
        assert.deepEqual(
            unionPitchClassNotes(['C#', 'D'], ['Db']),
            ['C#', 'D']
        )
    })

    it('puts both lists in one C-based order even when neither starts on C', () => {
        assert.deepEqual(
            unionPitchClassNotes(['D', 'E', 'F#', 'A', 'B'], ['D']),
            ['D', 'E', 'F#', 'A', 'B']
        )
    })

    it('keeps the primary spelling for shared tones', () => {
        assert.deepEqual(
            unionPitchClassNotes(['Bb'], ['A#']),
            ['Bb']
        )
    })

    it('handles empty and missing inputs', () => {
        assert.deepEqual(unionPitchClassNotes([], []), [])
        assert.deepEqual(unionPitchClassNotes(undefined, undefined), [])
        assert.deepEqual(unionPitchClassNotes(['C'], undefined), ['C'])
        assert.deepEqual(unionPitchClassNotes(undefined, ['C']), ['C'])
    })

    it('ignores invalid notes', () => {
        assert.deepEqual(unionPitchClassNotes(['C', 'not-a-note', ''], []), ['C'])
    })

})
