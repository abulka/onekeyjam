import assert from 'assert';
import { buildNoteMap } from '../../src/lib/jam-mapping-to-allowed.js'

/*
Tests for Arturia MINILAB" keyboard config

Typical result for e.g. scale ['C', 'D', 'E', 'F', 'G', 'A'] which is missing the B note:
    {
        C4: 'C4',
        D4: 'D4',
        E4: 'E4',
        F4: 'F4',
        G4: 'G4',
        A4: 'A4',
        B4: 'C5',
        C5: 'D5',
        D5: 'E5',
        E5: 'F5',
        F5: 'G5',
        G5: 'A5',
        A5: 'C6',
        B5: 'D6',
        C6: 'E6',
        D6: 'F6',
        E6: 'G6',
        F6: 'A6',
        G6: 'C7',
        A6: 'D7',
        B6: 'E7'
    }  

Assuming
    const lhTriggerOctave = 3
    const rhJamSoundOctave = 4

1. One octave of chord triggers (numLhTriggers = 7) C3-B3, Jam notes start at C4 which plays C4.
2. Two octaves of chord triggers (numLhTriggers = 14) C3-B4, Jam notes start at C5 which plays C4 (only 1 jam note!)
*/

describe('minilab buildNoteMap', () => {

    const lhTriggerOctave = 3
    const rhJamSoundOctave = 4
    const rhNotesScale = ['C', 'D', 'E', 'F', 'G', 'A']

    it('One octave Jam trigger notes start at C4', () => {
        let numLhTriggers = 7
        let result = buildNoteMap(rhNotesScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
        assert.equal(Object.keys(result)[0], 'C4');
    });

    it('One octave which plays C4', () => {
        let numLhTriggers = 7
        let result = buildNoteMap(rhNotesScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
        assert.equal(result['C4'], 'C4');
    });

    it('Two octaves Length ok', () => {
        const numLhTriggers = 14
        const expectedLength = 14;
        let result = buildNoteMap(rhNotesScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
        assert.equal(Object.keys(result).length, expectedLength);
    });

    it('Two octaves Jam trigger notes start at C5', () => {
        const numLhTriggers = 14
        let result = buildNoteMap(rhNotesScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
        assert.equal(Object.keys(result)[0], 'C5');
    });

    it('Two octaves which still plays C4', () => {
        const numLhTriggers = 14
        let result = buildNoteMap(rhNotesScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
        assert.equal(result['C5'], 'C4');
    });

});