import assert from 'assert';
import { copyDownTargets } from '../../src/lib/keyGroupEditing.js';

/*
 * The copy-key-down rule for the Key Groups editor: a row's key is applied to
 * that row and the following rows, stopping before the first locked row.
 */

function rows(...locks) {
    return locks.map((locked, index) => ({ chordConfig: { id: index + 1 }, locked }));
}

describe('copyDownTargets', () => {

    it('copies from the clicked row to the end when nothing is locked', () => {
        const list = rows(false, false, false, false);
        assert.deepEqual(copyDownTargets(list, 0).map((chord) => chord.id), [1, 2, 3, 4]);
        assert.deepEqual(copyDownTargets(list, 2).map((chord) => chord.id), [3, 4]);
    });

    it('stops before the first locked row', () => {
        const list = rows(false, false, true, false);
        assert.deepEqual(copyDownTargets(list, 0).map((chord) => chord.id), [1, 2]);
        // Starting after the lock reaches the end.
        assert.deepEqual(copyDownTargets(list, 3).map((chord) => chord.id), [4]);
    });

    it('is a single row when the next row is locked', () => {
        const list = rows(false, true, false);
        assert.deepEqual(copyDownTargets(list, 0).map((chord) => chord.id), [1]);
    });

    it('handles an out-of-range start', () => {
        const list = rows(false);
        assert.deepEqual(copyDownTargets(list, -1), []);
        assert.deepEqual(copyDownTargets(list, 5), []);
        assert.deepEqual(copyDownTargets(undefined, 0), []);
    });

});
