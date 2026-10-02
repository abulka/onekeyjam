import assert from 'assert';
import { buildNoteMap } from '@/lib/midi/jam-mapping-to-allowed.js'

describe('advanced scales buildNoteMap tests', () => {

    const rhNotesScale = ["F", "G", "A", "Bb", "C", "D", "Eb"]  // F mixolydian
    const numLhTriggers = 20
    const lhTriggerOctave = 2
    const rhJamSoundOctave = 3

    let result = buildNoteMap(rhNotesScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave)

    it('mapping should work', () => {
        // should be starting at C5
        assert.equal(Object.keys(result)[0], 'C5');
        assert.equal(result['C5'], 'F3');
    });

});
