import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { addOctavesToNotes, isInNextOctave } from "../../src/lib/note-tools.js";

describe('isInNextOctave', () => {

    it('Is note2 in the next octave?', () => {
        assert.equal(false, isInNextOctave('C', 'D'))  // 'D' is 'note2'
    });

    it('one jump', () => {
        assert.equal(true, isInNextOctave('G', 'D'))
    });


});
