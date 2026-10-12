import assert from 'assert'
import { normaliseNoteName } from '@/lib/note-tools.js'

describe('normaliseNoteName', () => {
    it('folds theoretical sharps into the twelve spellings', () => {
        assert.equal(normaliseNoteName('E#'), 'F')
        assert.equal(normaliseNoteName('B#'), 'C')
        assert.equal(normaliseNoteName('F##'), 'G')
        assert.equal(normaliseNoteName('C##'), 'D')
    })

    it('folds theoretical flats', () => {
        assert.equal(normaliseNoteName('Cb'), 'B')
        assert.equal(normaliseNoteName('Fb'), 'E')
        assert.equal(normaliseNoteName('Gbb'), 'F')
    })

    it('keeps normal spellings and converts flats to the sharp option', () => {
        assert.equal(normaliseNoteName('C'), 'C')
        assert.equal(normaliseNoteName('F#'), 'F#')
        assert.equal(normaliseNoteName('A#'), 'A#')
        assert.equal(normaliseNoteName('Eb'), 'D#')
        assert.equal(normaliseNoteName('Db'), 'C#')
        assert.equal(normaliseNoteName('Bb'), 'A#')
    })

    it('keeps octaves', () => {
        assert.equal(normaliseNoteName('E#3'), 'F3')
        assert.equal(normaliseNoteName('B#3'), 'C4')
        assert.equal(normaliseNoteName('Eb3'), 'D#3')
    })

    it('handles empty input', () => {
        assert.equal(normaliseNoteName(''), '')
        assert.equal(normaliseNoteName(undefined), '')
    })
})
