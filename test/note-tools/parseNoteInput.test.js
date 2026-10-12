import assert from 'assert'
import { parseNoteInput } from '@/lib/note-tools.js'

describe('parseNoteInput', () => {
    it('fills in a default octave for notes without one', () => {
        assert.deepEqual(parseNoteInput('C E G'), ['C3', 'E3', 'G3'])
    })

    it('keeps explicit octaves and inherits them to following notes', () => {
        assert.deepEqual(parseNoteInput('C4 E G'), ['C4', 'E4', 'G4'])
    })

    it('accepts commas and lowercase', () => {
        assert.deepEqual(parseNoteInput('c4, e4, g4'), ['C4', 'E4', 'G4'])
    })

    it('skips tokens that are not notes', () => {
        assert.deepEqual(parseNoteInput('C hello E4'), ['C3', 'E4'])
    })

    it('returns an empty array for empty input', () => {
        assert.deepEqual(parseNoteInput('   '), [])
        assert.deepEqual(parseNoteInput(null), [])
    })

    it('honours a custom default octave', () => {
        assert.deepEqual(parseNoteInput('C E G', 4), ['C4', 'E4', 'G4'])
    })
})
