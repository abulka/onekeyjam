import assert from 'assert';
import { sanitiseNoteToSharp } from '../../src/lib/note-tools.js';


describe('sanitiseNoteToSharp', () => {

    it('C', () => {
        const result = sanitiseNoteToSharp('C')
        const expected = 'C'
        assert.deepEqual(expected, result);
    });
    
    it('Bb', () => {
        const result = sanitiseNoteToSharp('Bb')
        const expected = 'A#'
        assert.deepEqual(expected, result);
    });

});
