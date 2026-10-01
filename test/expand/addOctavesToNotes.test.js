import assert from 'assert';
import { addOctavesToNotes } from '../../src/lib/note-tools.js';

describe('addOctavesToNotes', () => {

    it('Basic', () => {
        const octave = 2
        const expected = ['C2', 'E2', 'G2'];
        const notes = ['C', 'E', 'G']
        assert.deepEqual(expected, addOctavesToNotes(notes, octave))
    });

    it('no octave crossing', () => {
        const notes = ['C', 'E', 'G']
        const result = addOctavesToNotes(notes, 3)
        const expected = ['C3', 'E3', 'G3']
        assert.deepEqual(expected, result);
    });

    it('Octave crossing', () => {
        const octave = 2
        const expected = ['E2', 'G2', 'C3'];
        const notes = ['E', 'G', 'C']
        assert.deepEqual(expected, addOctavesToNotes(notes, octave))
    });

    it('octave crossing 2', () => {
        const notes = ['C', 'E', 'G', 'C']
        const result = addOctavesToNotes(notes, 3)
        const expected = ['C3', 'E3', 'G3', 'C4']
        assert.deepEqual(expected, result);
    });

    it('Two notes cross Octave', () => {
        const octave = 3
        const expected = ['E3', 'G3', 'Bb3', 'D4', 'C5']
        const notes = ['E', 'G', 'Bb', 'D', 'C']
        assert.deepEqual(expected, addOctavesToNotes(notes, octave))
    });

});
