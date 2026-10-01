import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { chordSymbolToNotesInversion } from "../../src/lib/chordSymbolToNotes"


describe('chordSymbolToNotesInversion CM', () => {
    const octave = 2
    const chordSymbol = 'CM';

    it('Inversion 0 (none)', () => {
        const expected = ['C2', 'E2', 'G2'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 0, octave))
    });

    it('Inversion 1', () => {
        const expected = ['E2', 'G2', 'C3'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 1, octave))
    });

    it('Inversion 2', () => {
        const expected = ['G2', 'C3', 'E3'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 2, octave))
    });

    it('Inversion 3 (same as 0)', () => {
        const expected = ['C2', 'E2', 'G2'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 3, octave))
    });

});

describe('chordSymbolToNotesInversion C9', () => {
    // See official inversions at https://www.scales-chords.com/chord/piano/C9 
    const octave = 3
    const chordSymbol = 'C9';  // [ 'C', 'E', 'G', 'Bb', 'D' ]

    it('Inversion 0 (none)', () => {
        const expected = ['C3', 'E3', 'G3', 'Bb3', 'D4'];  // D4 is the 9th
        // const expected = ['C3', 'D3', 'E3', 'G3', 'Bb3']; // interpreting the 9th as a 2nd
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 0, octave))
    });

    it('Inversion 1 C9/E', () => {
        const expected = ['E3', 'G3', 'Bb3', 'C4', 'D4'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 1, octave))
    });

    it('Inversion 2 C9/G', () => {
        const expected = ['G3', 'Bb3', 'C4', 'D4', 'E4'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 2, octave))
    });

    it('Inversion 3 C9/Bb', () => {
        const expected = ['Bb3', 'C4', 'D4', 'E4', 'G4'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 3, octave))
    });

    it('Inversion 4 C9/D', () => {
        const expected = ['D3', 'E3', 'G3', 'Bb3', 'C4'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 4, octave))
    });

    it('Inversion 5', () => {
        const expected = ['C3', 'E3', 'G3', 'Bb3', 'D4'];
        assert.deepEqual(expected, chordSymbolToNotesInversion(chordSymbol, 5, octave))
    });

});
