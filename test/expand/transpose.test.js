import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { transposeScaleName, _transposeChordName, _transposeChordConfig, _transposeChordConfigs } from '../../src/lib/transpose.js';
import { expandChordConfig } from "../../src/lib/expandChordConfig"
import { resolveChord } from '../../src/lib/chordScaleEngine.js';

/** @typedef {import("../../src/lib/typedefs").Chord} Chord */
/** @typedef {import("../../src/lib/typedefs").ChordConfig} ChordConfig */

/*
On Intervals
    - 1 semitone = Tonal.Interval.distance("E4", "F4")  // 2m or 1A
    - 3 semitones = Tonal.Interval.distance("E4", "G4")  // 3m
*/
describe('display intervals', () => {

    it('one semitone', () => {
        const result = Tonal.Interval.distance("C4", "C#4")
        assert.equal(result, '1A')
    });

    it('two semitones', () => {
        const result = Tonal.Interval.distance("C4", "D4")
        assert.equal(result, '2M')
    });

    it('three semitones', () => {
        const result = Tonal.Interval.distance("C4", "D#4")
        assert.equal(result, '2A')
    });

    it('three semitones from E', () => {
        // same number of semitones as above, but from E, note C, results in a
        // different interval name
        const result = Tonal.Interval.distance("E4", "G4")
        assert.equal(result, '3m')
    });

    it('four semitones', () => {
        const result = Tonal.Interval.distance("C4", "E4")
        assert.equal(result, '3M')
    });

    it('five semitones', () => {
        const result = Tonal.Interval.distance("C4", "F4")
        assert.equal(result, '4P')
    });

});

describe('transposeScaleName', () => {

    it('up semitone', () => {
        let intervalName = '2m' // '2M' is different to '2m'
        const result = transposeScaleName('C major', intervalName)
        assert.equal(result, 'Db major')
    });

    it('down semitone', () => {
        let intervalName = '-2m'
        const result = transposeScaleName('C major', intervalName)
        assert.equal(result, 'B major')
    });

    it('blank scale name', () => {
        let intervalName = '-2m'
        const result = transposeScaleName('', intervalName)
        assert.equal(result, '')
    });

});


describe('transposeChordName', () => {
    it('up semitone', () => {
        const intervalName = '2m'  // 2M is incorrect 
        const result = _transposeChordName('CM', intervalName)
        assert.equal(result, 'DbM')
    });

    it('up three semitones', () => {
        // 3m is technically more correct than 2A, (though its the same number of semitones)
        // and results in the correct tonic name 'G' rather than 'F##'
        const intervalName = '3m' // Tonal.Interval.distance("E4", "G4")
        const result = _transposeChordName('EM', intervalName)
        assert.equal(result, 'GM')
    });

    it('up three semitones - using non ideal interval name', () => {
        // 2A is the same number of semitones as 3m, but results in the horrible 'F##'
        // our transposeChordName handles this and auto simplifies
        const intervalName = '2A'
        const result = _transposeChordName('EM', intervalName)
        // assert.equal(result, 'F##M')  // bad result if we don't disassemble the chord
        assert.equal(result, 'GM')
    });

    it('up a semitone with a slash bass', () => {
        const result = _transposeChordName('E7/D', '2m')
        assert.equal(result, 'F7/Eb')
    });

});

describe('transposeChordConfig', () => {

    it('known tonal chord', () => {
        /** @type {ChordConfig} */
        const chordConfig = {
            "id": 1,
            "name": "My Config",
            "chord": "CM",
            "scale1": "c major",
        }
        const intervalName = '2m'  // semitone up
        _transposeChordConfig(chordConfig, intervalName)
        assert.equal(chordConfig.name, 'My Config*')
        assert.equal(chordConfig.chord, 'DbM')
    });

    it('custom chord', () => {
        /** @type {ChordConfig} */
        const chordConfig = {
            "id": 1,
            "name": "My Config",
            "chord": "G7inversion2",
            "scale1": "g mixolydian",
        }
        expandChordConfig(chordConfig)  // adds the chordNotes etc.

        const intervalName = '2m'  // semitone up
        _transposeChordConfig(chordConfig, intervalName)
        assert.equal(chordConfig.name, 'My Config*')
        // The custom name moves its root too, so the label describes what plays.
        assert.equal(chordConfig.chord, 'Ab7inversion2*')
        assert.deepEqual(chordConfig.chordNotes, ['Eb3', 'Gb3', 'Ab3', 'C4'])
        const resolved = resolveChord({ symbol: chordConfig.chord, notes: chordConfig.chordNotes, bass: chordConfig.bass })
        assert.equal(resolved.root, 'Ab')
        assert.deepEqual(resolved.intervals, [0, 4, 7, 10])
    });

    it('known tonal chord, twice', () => {
        /** @type {ChordConfig} */
        const chordConfig = {
            "id": 1,
            "name": "My Config",
            "chord": "CM",
            "scale1": "c major",
        }
        expandChordConfig(chordConfig)  // adds the chordNotes etc.

        const intervalName = '2m'  // semitone up
        _transposeChordConfig(chordConfig, intervalName)
        _transposeChordConfig(chordConfig, intervalName)
        assert.equal(chordConfig.name, 'My Config*')
        assert.equal(chordConfig.chord, 'DM')
    });

});

describe('transposeChordConfigs', () => {

    /** @type {Array<ChordConfig>} */
    const chordConfigs = [
        {
            "id": 1,
            "name": "My Config",
            "chord": "CM",
            "scale1": "c major",
        },
        {
            "id": 2,
            "name": "Config with custom chord name",
            "chord": "G7inversion2",
            "scale1": "g mixolydian",
        }
    ]
    
    it('basic', () => {

        // expand the chord configs to fill in the missing stuff
        chordConfigs.forEach(expandChordConfig)
        
        const intervalName = '2m'  // semitone up
        _transposeChordConfigs(chordConfigs, intervalName)
        assert.equal(chordConfigs.length, 2)
    });
});

