import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { findTop3MatchingScales } from '../../src/lib/findMatchingScales'

describe('findTop3MatchingScales', () => {

    const chordSymbols = 'CM,Em#5/C';
    const detectedChordSymbols = ['CM', 'Em#5/C']

    it('original clever', () => {
        const simple = false
        const [scale1, scale2, scale3] = findTop3MatchingScales(detectedChordSymbols, simple)
        assert.equal(scale1, 'C lydian')
        assert.equal(scale2, 'E harmonic minor')
        assert.equal(scale3, 'E phrygian')
    });

    it('new less clever but has correct tonic', () => {
        const simple = true
        const [scale1, scale2, scale3] = findTop3MatchingScales(detectedChordSymbols, simple)
        assert.equal(scale1, 'C lydian')
        assert.equal(scale2, 'C major')
        assert.equal(scale3, 'C major pentatonic')
    });

});
