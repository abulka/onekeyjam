import assert from 'assert';
import { buildNoteMap } from '@/lib/midi/jam-mapping-to-allowed.js'

/*
Tests for "Novation 61SL MkII Port 1" keyboard config
1. One octave of chord triggers C2-B2, Jam notes start at C3 which plays C3.
2. Two octaves of chord triggers C2-B3, Jam notes start at C4 which plays C3.
3. Three octaves of chord triggers C2-B4, Jam notes start at C5 which plays C3.
*/

describe('novation buildNoteMap - One octave', () => {

    const rhNotesScale = ['C', 'D', 'E', 'F', 'G', 'A']
    const lhTriggerOctave = 2
    const rhJamSoundOctave = 4  
    const numLhTriggers = 7

    let result = buildNoteMap(['C', 'D', 'E', 'F', 'G', 'A'], numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
    // console.log('result', result)

    it('Jam trigger notes start at C3', () => {
        assert.equal(Object.keys(result)[0], 'C3');
    });

    it('which plays C4 sound', () => {
        assert.equal(result['C3'], 'C4');
    });

});


describe('novation buildNoteMap - Two octaves', () => {

    const rhNotesScale = ['C', 'D', 'E', 'F', 'G', 'A']
    const lhTriggerOctave = 2
    const rhJamSoundOctave = 3    
    const numLhTriggers = 14

    let result = buildNoteMap(['C', 'D', 'E', 'F', 'G', 'A'], numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
    // console.log('result', result)

    it('Jam trigger notes start at C4', () => {
        assert.equal(Object.keys(result)[0], 'C4');
    });

    it('which plays sound C3', () => {
        assert.equal(result['C4'], 'C3');
    });

});

describe('novation buildNoteMap - Three octaves', () => {

    const rhNotesScale = ['C', 'D', 'E', 'F', 'G', 'A']
    const lhTriggerOctave = 2
    const rhJamSoundOctave = 4 
    const numLhTriggers = 21

    let result = buildNoteMap(['C', 'D', 'E', 'F', 'G', 'A'], numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
    // console.log('result', result)

    it('Jam trigger notes start at C5', () => {
        assert.equal(Object.keys(result)[0], 'C5');
    });

    it('which plays C4 sound', () => {
        assert.equal(result['C5'], 'C4');
    });

});
