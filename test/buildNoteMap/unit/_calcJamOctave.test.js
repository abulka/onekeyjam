import assert from 'assert';
import { _calcJamOctave } from '../../../src/lib/jam-mapping-to-allowed.js'

describe('_calcJamOctave', () => {

    const lhTriggerOctave = 3

    it('7 triggers from C3 means jam octave is 4', () => {
        const numLhTriggers = 7
        let result = _calcJamOctave(numLhTriggers, lhTriggerOctave)

        const expected = 4;
        assert.equal(expected, result);
    });

    it('8 triggers from C3 means jam octave is 5', () => {
        const numLhTriggers = 8
        let result = _calcJamOctave(numLhTriggers, lhTriggerOctave)

        const expected = 5;
        assert.equal(expected, result);
    });

})

