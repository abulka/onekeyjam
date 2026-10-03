import assert from 'assert'
import { indexToNote, indexToWhiteNote } from '../../src/lib/note-tools.js'

describe('indexToNote', () => {

    it('converts positive indices', () => {
        assert.equal(indexToNote(0, 3), 'C3')
        assert.equal(indexToNote(12, 3), 'C4')
        assert.equal(indexToNote(13, 3), 'C#4')
        assert.equal(indexToNote(23, 3), 'B4')
    })

    it('converts negative (off-screen) indices', () => {
        // A negative index used to produce "NaN" for every note except C of
        // each octave, which is why only C2 used to sound below the keyboard.
        assert.equal(indexToNote(-1, 3), 'B2')
        assert.equal(indexToNote(-2, 3), 'A#2')
        assert.equal(indexToNote(-12, 3), 'C2')
        assert.equal(indexToNote(-13, 3), 'B1')
        assert.equal(indexToNote(-24, 3), 'C1')
    })

})

describe('indexToWhiteNote', () => {

    it('handles negative indices', () => {
        assert.equal(indexToWhiteNote(-1), 'B')
        assert.equal(indexToWhiteNote(-2), 'A')
    })

})
