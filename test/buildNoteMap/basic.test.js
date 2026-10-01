import assert from 'assert';
import { buildNoteMap } from '../../src/lib/jam-mapping-to-allowed.js'

describe('basic buildNoteMap tests', () => {

    const rhNotesScale = ['Eb', 'B']
    const numLhTriggers = 7
    const lhTriggerOctave = 3
    const rhJamSoundOctave = 4

    let result = buildNoteMap(rhNotesScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave)

    it('C4 should map to Eb3', () => {
        assert.equal(result['C4'], 'Eb4');
    });

    it('lowest trigger should be C4', () => {
        assert.equal(Object.keys(result)[0], 'C4');
    });
});
