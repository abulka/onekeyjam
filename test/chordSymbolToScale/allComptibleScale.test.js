import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { chordSymbolToScaleNames } from '../../src/lib/chord-to-scale.js';

describe('all compatible chords', () => {

    it('Major chords - all', () => {
        const chord = 'CM';
        assert.ok(chordSymbolToScaleNames(chord).length > 3)
    });

});
