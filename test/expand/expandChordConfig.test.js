import assert from 'assert';
import { expandChordConfig } from "../../src/lib/expandChordConfig"
import { fillInChordConfig } from '../../src/lib/fillInChordConfig';

/** @typedef {import("../../src/lib/typedefs").Chord} Chord */
/** @typedef {import("../../src/lib/typedefs").ChordConfig} ChordConfig */

describe('expandChordConfig', () => {

    /** @type {ChordConfig} */
    const chordConfig = {
        "id": 1,
        "name": "My Config",
        "chord": "CM",
        "scale1": "c major",
    }

    it('known tonal chord', () => {
        expandChordConfig(chordConfig)  // adds the chordNotes etc.
        // console.log('chordConfig', chordConfig)
        assert.deepEqual(chordConfig.chordNotes, ['C3', 'E3', 'G3'])
        assert.equal(chordConfig.scale1Notes.length, 7)
        assert.equal(chordConfig.bass, 'C')
        assert.equal(chordConfig.bassNote, 'C2')
    });

    it('via fillInChordConfig', () => {
        const currentRoot = 'C'
        const currentChord = 'M'
        const currentChordInversion = 0
        const bass = ''
        fillInChordConfig(chordConfig, currentRoot, currentChord, currentChordInversion, bass)
        // console.log('chordConfig', chordConfig)
        assert.deepEqual(chordConfig.chordNotes, ['C3', 'E3', 'G3'])
        assert.deepEqual(chordConfig.chord, 'CM')
        
        // aha no expansion into notes yet, no bass allocation
        // assert.equal(chordConfig.scale1Notes.length, 7)
        // assert.equal(chordConfig.bass, 'C')
        
        // but `bassNote` is set for some reason
        assert.equal(chordConfig.bassNote, 'C2')
    });

    it.skip('custom chord', () => {
        /** @type {ChordConfig} */
        const chordConfig = {
            "id": 1,
            "name": "My Config",
            "chord": "G7inversion2",
            "scale1": "g mixolydian",
        }
        expandChordConfig(chordConfig)  // adds the chordNotes etc.
        assert.equal(chordConfig.name, 'My Config*')
        assert.equal(chordConfig.chord, 'G7inversion2*')
    });

});

describe('expandChordConfig - .chord missing', () => {

    /** @type {ChordConfig} */
    const chordConfig = {
        "name": "Some Chord Notes",
        "chordNotes": ['C3', 'E3', 'G3'],
    }

    it('basic', () => {
        expandChordConfig(chordConfig)
        // console.log('chordConfig', chordConfig)

        // we expect this
        assert.deepEqual(chordConfig.chordNotes, ['C3', 'E3', 'G3'])
        assert.equal(chordConfig.bass, 'C')
        assert.equal(chordConfig.bassNote, 'C2')
        
        // but now we expect more...
        assert.equal(chordConfig.chord, 'CM')
        assert.equal(chordConfig.symbols, 'CM,Em#5/C')
        assert.equal(chordConfig.scale1, 'C lydian')
        assert.equal(chordConfig.scale2, 'C major')
        assert.equal(chordConfig.scale3, 'C major pentatonic')
    });
});
