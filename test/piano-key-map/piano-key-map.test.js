import assert from 'assert'
import { NOTE_KEYS, codeToLabel, getNoteKeyForCode, labelForOffset } from '@/lib/midi/piano-key-map.js'

describe('piano-key-map', () => {

    it('covers the two main octaves with a primary key each', () => {
        for (let offset = 0; offset <= 23; offset++) {
            const primary = NOTE_KEYS.filter(key => key.offset === offset && key.primary)
            assert.equal(primary.length, 1, `offset ${offset} should have exactly one primary key`)
        }
    })

    it('labels the left hand octave as the white and black piano keys', () => {
        const expected = ['Z', 'S', 'X', 'D', 'C', 'V', 'G', 'B', 'H', 'N', 'J', 'M']
        const actual = expected.map((_, offset) => labelForOffset(offset))
        assert.deepEqual(actual, expected)
    })

    it('labels the right hand octave with the upper and number rows', () => {
        const expected = ['Q', '2', 'W', '3', 'E', 'R', '5', 'T', '6', 'Y', '7', 'U']
        const actual = expected.map((_, index) => labelForOffset(index + 12))
        assert.deepEqual(actual, expected)
    })

    it('maps lower row alias keys to the right hand octave', () => {
        assert.equal(getNoteKeyForCode('Comma').offset, 12)
        assert.equal(getNoteKeyForCode('Comma').primary, false)
        assert.equal(getNoteKeyForCode('KeyL').offset, 13)
        assert.equal(getNoteKeyForCode('Backslash').offset, 17)
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
