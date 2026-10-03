import assert from 'assert';
import { findTop3MatchingScales } from '../../src/lib/findMatchingScales'

describe('findTop3MatchingScales', () => {

    const detectedChordSymbols = ['CM', 'Em#5/C']

    it('original clever - one scale per detected symbol, second symbol gets two', () => {
        const simple = false
        const [scale1, scale2, scale3] = findTop3MatchingScales(detectedChordSymbols, simple)
        assert.equal(scale1, 'C major')
        assert.equal(scale2, 'E aeolian')
        assert.equal(scale3, 'E locrian #2')
    });

    it('new less clever but has correct tonic', () => {
        const simple = true
        const [scale1, scale2, scale3] = findTop3MatchingScales(detectedChordSymbols, simple)
        assert.equal(scale1, 'C major')
        assert.equal(scale2, 'C lydian')
        assert.equal(scale3, 'C mixolydian')
    });

});
