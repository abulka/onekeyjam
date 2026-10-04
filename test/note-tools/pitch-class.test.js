import assert from 'assert'
import { samePitchClass, noteInAnyPitchClass } from '../../src/lib/note-tools.js'

describe('samePitchClass', () => {

    it('ignores octave', () => {
        assert.equal(samePitchClass('D3', 'D5'), true)
        assert.equal(samePitchClass('C4', 'C2'), true)
    })

    it('ignores enharmonic spelling', () => {
        assert.equal(samePitchClass('C#3', 'Db5'), true)
        assert.equal(samePitchClass('F#2', 'Gb2'), true)
        assert.equal(samePitchClass('B3', 'Cb4'), true)
    })

    it('is false for different pitch classes', () => {
        assert.equal(samePitchClass('C4', 'D4'), false)
        assert.equal(samePitchClass('C#4', 'D4'), false)
    })

    it('is false for missing or invalid notes', () => {
        assert.equal(samePitchClass('', 'C4'), false)
        assert.equal(samePitchClass('C4', undefined), false)
        assert.equal(samePitchClass('not-a-note', 'C4'), false)
    })

})

describe('noteInAnyPitchClass', () => {

    it('matches scale notes regardless of octave or spelling', () => {
        const scale = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        assert.equal(noteInAnyPitchClass('D3', scale), true)
        assert.equal(noteInAnyPitchClass('C#4', ['Db']), true)
    })

    it('is false when the note is not in the list', () => {
        const scale = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
        assert.equal(noteInAnyPitchClass('C#4', scale), false)
    })

    it('is false for missing lists or notes', () => {
        assert.equal(noteInAnyPitchClass('C4', undefined), false)
        assert.equal(noteInAnyPitchClass('', ['C']), false)
    })

})
