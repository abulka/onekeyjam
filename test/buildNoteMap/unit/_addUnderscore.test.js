import assert from 'assert';
import { _addUnderscore } from '../../../src/lib/jam-mapping-to-allowed.js'

describe('_addUnderscore', () => {


    it('same octave', () => {
        const result = _addUnderscore(['C', 'D', 'E', 'F', 'G', 'A'])
        // console.log('result', result)
        const expected = { strategy: 1, allowedNotes: [ 'C', 'D', 'E', 'F', 'G', 'A' ] }
        assert.deepEqual(expected, result);
    });

    it('crossing octave boundary', () => {
        const result = _addUnderscore(['G', 'A', 'B', 'C'])
        // console.log('result', result)
        const expected = { strategy: 2, allowedNotes: ['G', 'A', 'B', '_C'] }
        assert.deepEqual(expected, result);
    });

    it('crossing octave boundary by two notes', () => {
        const result = _addUnderscore(['G', 'A', 'B', 'C', 'D'])
        const expected = { strategy: 2, allowedNotes: ['G', 'A', 'B', '_C', 'D'] }
        assert.deepEqual(expected, result);
    });



});

