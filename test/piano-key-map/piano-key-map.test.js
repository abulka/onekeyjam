import assert from 'assert'
import { NOTE_KEYS, codeToLabel, getNoteKeyForCode, labelForOffset } from '@/lib/midi/piano-key-map.js'

describe('piano-key-map', () => {

    it('gives every playable offset exactly one primary key', () => {
        // The right-hand black keys (13, 15, 18, 20, 22, 25, 27, 30, 32) are the
        // scale-filter modifiers and are triggered by the 1-5 number keys, so
        // they deliberately have no note key.
        const playable = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 29, 31, 33]
        for (let offset = 0; offset <= 33; offset++) {
            const primary = NOTE_KEYS.filter(key => key.offset === offset && key.primary)
            assert.equal(primary.length, playable.includes(offset) ? 1 : 0, `offset ${offset} primary key count`)
        }
    })

    it('extends into the octave above with white keys only', () => {
        const expected = ['I', '', 'O', '', 'P', '[', '', ']', '', '\\']
        const actual = expected.map((_, index) => labelForOffset(index + 24))
        assert.deepEqual(actual, expected)
        assert.equal(labelForOffset(34), '')
    })

    it('labels the left hand octave as the white and black piano keys', () => {
        const expected = ['Z', 'S', 'X', 'D', 'C', 'V', 'G', 'B', 'H', 'N', 'J', 'M']
        const actual = expected.map((_, offset) => labelForOffset(offset))
        assert.deepEqual(actual, expected)
    })

    it('labels the right hand octave with white keys only', () => {
        const expected = ['Q', '', 'W', '', 'E', 'R', '', 'T', '', 'Y', '', 'U']
        const actual = expected.map((_, index) => labelForOffset(index + 12))
        assert.deepEqual(actual, expected)
    })

    it('maps lower row alias keys to the right hand octave', () => {
        assert.equal(getNoteKeyForCode('Comma').offset, 12)
        assert.equal(getNoteKeyForCode('Comma').primary, false)
        assert.equal(getNoteKeyForCode('KeyL').offset, 13)
        assert.equal(getNoteKeyForCode('Slash').offset, 16)
        assert.equal(getNoteKeyForCode('Slash').primary, false)
    })

    it('returns null for keys that are not note keys', () => {
        assert.equal(getNoteKeyForCode('KeyA'), null)
        assert.equal(getNoteKeyForCode('Space'), null)
    })

    it('formats special key codes as readable labels', () => {
        assert.equal(codeToLabel('Comma'), ',')
        assert.equal(codeToLabel('Period'), '.')
        assert.equal(codeToLabel('Backslash'), '\\')
        assert.equal(codeToLabel('BracketLeft'), '[')
        assert.equal(codeToLabel('BracketRight'), ']')
        assert.equal(codeToLabel('Backquote'), '`')
        assert.equal(codeToLabel('KeyZ'), 'Z')
        assert.equal(codeToLabel('Digit2'), '2')
    })
})
