import assert from 'assert'
import { describeChordSoloSplit, previewKeys, whiteKeyOffset, whiteKeyLabel } from '@/lib/midi/keyboard-split.js'

/*
 * The chord/solo split is a single floating position: the first `chordCount`
 * white notes from the trigger octave trigger chords, and the next white note
 * is the first solo key. The help text uses this helper instead of assuming
 * seven chords.
 */

describe('describeChordSoloSplit', () => {

    it('splits after the last chord for seven triggers', () => {
        const split = describeChordSoloSplit(7, 3)
        assert.deepEqual(split.chordKeys, ['Z', 'X', 'C', 'V', 'B', 'N', 'M'])
        assert.deepEqual(split.chordNotes, ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'])
        assert.equal(split.firstSoloKey, 'Q')
        assert.equal(split.firstSoloNote, 'C4')
        assert.equal(split.soloKeys[0], 'Q')
    })

    it('moves the split up as triggers overflow the first octave', () => {
        const split = describeChordSoloSplit(9, 3)
        assert.deepEqual(split.chordNotes, ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4'])
        assert.deepEqual(split.chordKeys, ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Q', 'W'])
        assert.equal(split.firstSoloKey, 'E')
        assert.equal(split.firstSoloNote, 'E4')
    })

    it('with no chords the whole mapped run is solo from C3', () => {
        const split = describeChordSoloSplit(0, 3)
        assert.deepEqual(split.chordKeys, [])
        assert.deepEqual(split.chordNotes, [])
        assert.equal(split.firstSoloKey, 'Z')
        assert.equal(split.firstSoloNote, 'C3')
        assert.equal(split.soloKeys[0], 'Z')
    })

    it('respects a different trigger octave', () => {
        const split = describeChordSoloSplit(7, 2)
        assert.deepEqual(split.chordNotes, ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'])
        assert.equal(split.firstSoloNote, 'C3')
    })

    it('previews the key runs with an ellipsis instead of listing every key', () => {
        const split = describeChordSoloSplit(8, 3)
        assert.equal(split.chordKeysPreview, 'Z X C V ...')
        assert.equal(split.soloKeysPreview, 'W E R T ...')

        const seven = describeChordSoloSplit(7, 3)
        assert.equal(seven.chordKeysPreview, 'Z X C V ...')
        assert.equal(seven.soloKeysPreview, 'Q W E R ...')
    })

    it('does not add an ellipsis when the list fits', () => {
        assert.equal(previewKeys(['Z', 'X', 'C', 'V']), 'Z X C V')
        assert.equal(previewKeys(['Z', 'X']), 'Z X')
        assert.equal(previewKeys(['Z', 'X', 'C', 'V', 'B']), 'Z X C V ...')
    })

    it('maps white indices to offsets and labels', () => {
        assert.equal(whiteKeyOffset(0), 0)
        assert.equal(whiteKeyOffset(7), 12)
        assert.equal(whiteKeyOffset(8), 14)
        assert.equal(whiteKeyLabel(0), 'Z')
        assert.equal(whiteKeyLabel(7), 'Q')
        assert.equal(whiteKeyLabel(8), 'W')
    })
})
