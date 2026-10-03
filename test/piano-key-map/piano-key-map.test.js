import assert from 'assert'
import { NOTE_KEYS, PIANO_NOTE_KEYS, codeToLabel, getNoteKeyForCode, labelForOffset, pianoKeyLabelForOffset } from '@/lib/midi/piano-key-map.js'

describe('piano-key-map', () => {

    it('gives every offset from C3 to A5 a primary key', () => {
        for (let offset = 0; offset <= 33; offset++) {
            const primary = NOTE_KEYS.filter(key => key.offset === offset && key.primary)
            assert.equal(primary.length, 1, `offset ${offset} primary key count`)
        }
    })

    it('extends into the octave above', () => {
        const expected = ['I', '9', 'O', '0', 'P', '[', '-', ']', '=', '\\']
        const actual = expected.map((_, index) => labelForOffset(index + 24))
        assert.deepEqual(actual, expected)
        assert.equal(labelForOffset(34), '')
    })

    it('labels the left hand octave as the white and black piano keys', () => {
        const expected = ['Z', 'S', 'X', 'D', 'C', 'V', 'G', 'B', 'H', 'N', 'J', 'M']
        const actual = expected.map((_, offset) => labelForOffset(offset))
        assert.deepEqual(actual, expected)
    })

    it('labels the right hand octave with the white and number rows', () => {
        const expected = ['Q', '2', 'W', '3', 'E', 'R', '5', 'T', '6', 'Y', '7', 'U']
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

    it('maps the traditional Ableton/Logic piano layout', () => {
        const expected = [
            ['KeyA', 0], ['KeyW', 1], ['KeyS', 2], ['KeyE', 3], ['KeyD', 4], ['KeyF', 5],
            ['KeyT', 6], ['KeyG', 7], ['KeyY', 8], ['KeyH', 9], ['KeyU', 10], ['KeyJ', 11],
            ['KeyK', 12], ['KeyO', 13], ['KeyL', 14], ['KeyP', 15], ['Semicolon', 16],
        ]
        assert.deepEqual(PIANO_NOTE_KEYS.map(key => [key.code, key.offset]), expected)
    })

    it('labels the piano mapping white and black keys', () => {
        assert.equal(pianoKeyLabelForOffset(0), 'A')
        assert.equal(pianoKeyLabelForOffset(1), 'W')
        assert.equal(pianoKeyLabelForOffset(11), 'J')
        assert.equal(pianoKeyLabelForOffset(16), ';')
        assert.equal(pianoKeyLabelForOffset(17), '')
    })

    it('selects the map by mode', () => {
        assert.equal(getNoteKeyForCode('KeyA', 'piano').offset, 0)
        assert.equal(getNoteKeyForCode('KeyA', 'magic'), null)
        assert.equal(getNoteKeyForCode('KeyZ', 'magic').offset, 0)
        assert.equal(getNoteKeyForCode('KeyZ', 'piano'), null)
        assert.equal(getNoteKeyForCode('KeyW', 'piano').offset, 1)
        assert.equal(getNoteKeyForCode('KeyW', 'magic').offset, 14)
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
