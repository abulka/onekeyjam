import assert from 'assert';
import { _clumpNotesInNextOctaveTogether } from "../../src/lib/chordSymbolToNotes"

describe('clumpNotesInNextOctaveTogether', () => {
    // Always respect the low note, but other notes can be shifted lower if possible
    // only notes lower than the low note will be played in the next octave

    it('simple', () => {
        const expected = ['C', 'E', 'G'];
        assert.deepEqual(expected, _clumpNotesInNextOctaveTogether(['C', 'E', 'G']))
    });

    it('difficult', () => {
        const expected = ['D', 'G', 'C'];
        assert.deepEqual(expected, _clumpNotesInNextOctaveTogether(['D', 'C', 'G']))
    });

});
