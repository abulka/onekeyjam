import assert from 'assert';
import { suggestKeyGroups } from '../../src/lib/keyGroupDetection.js';

/*
 * Experimental key group detection. It scores non-overlapping windows of the
 * arranged chords and merges runs with the same detected key. It only tests
 * major and natural minor keys, so relative keys are ambiguous; the tie-break
 * prefers the declared project key, then the window's first chord root.
 */

const C_MAJOR = { options: { key: { tonic: 'C', type: 'major' } } };

describe('suggestKeyGroups', () => {

    it('finds two keys in a two-key etude', () => {
        const chords = [
            { id: 1, chord: 'Cmaj7' }, { id: 2, chord: 'Am7' },
            { id: 3, chord: 'Dm7' }, { id: 4, chord: 'G7' },
            { id: 5, chord: 'Ebmaj7' }, { id: 6, chord: 'Cm7' },
            { id: 7, chord: 'Fm7' }, { id: 8, chord: 'Bb7' },
        ];
        const groups = suggestKeyGroups(C_MAJOR, chords);
        assert.deepEqual(groups.map((group) => group.keyName), ['C major', 'Eb major']);
        assert.deepEqual(groups[0].chords.map((chord) => chord.id), [1, 2, 3, 4]);
        assert.deepEqual(groups[1].chords.map((chord) => chord.id), [5, 6, 7, 8]);
    });

    it('returns nothing for a single-key tune', () => {
        const chords = [
            { id: 1, chord: 'Cmaj7' }, { id: 2, chord: 'Am7' },
            { id: 3, chord: 'Dm7' }, { id: 4, chord: 'G7' },
            { id: 5, chord: 'Cmaj7' }, { id: 6, chord: 'Am7' },
            { id: 7, chord: 'Dm7' }, { id: 8, chord: 'G7' },
        ];
        assert.deepEqual(suggestKeyGroups(C_MAJOR, chords), []);
    });

    it('returns nothing for a very short tune', () => {
        assert.deepEqual(suggestKeyGroups(C_MAJOR, [{ id: 1, chord: 'Cmaj7' }]), []);
    });

    it('finds the Ab, C, G and E areas of All the Things grid rows', () => {
        const chords = [
            { id: 1, chord: 'Fm7' }, { id: 2, chord: 'Bbm7' }, { id: 3, chord: 'Eb7' },
            { id: 4, chord: 'Abmaj7' }, { id: 5, chord: 'Dbmaj7' },
            { id: 6, chord: 'Dm7' }, { id: 7, chord: 'G7' }, { id: 8, chord: 'Cmaj7' },
            { id: 9, chord: 'Am7' }, { id: 10, chord: 'D7' }, { id: 11, chord: 'Gmaj7' },
            { id: 12, chord: 'F#m7b5' }, { id: 13, chord: 'B7' }, { id: 14, chord: 'Emaj7' },
        ];
        const project = { options: { key: { tonic: 'Ab', type: 'major' } } };
        const groups = suggestKeyGroups(project, chords);
        assert.deepEqual(groups.map((group) => group.keyName), ['Ab major', 'C major', 'G major', 'E major']);
    });

    it('parses a suggested key into a usable project key', () => {
        const chords = [
            { id: 1, chord: 'Fm7' }, { id: 2, chord: 'Bbm7' }, { id: 3, chord: 'Eb7' }, { id: 4, chord: 'Abmaj7' },
            { id: 5, chord: 'Dm7' }, { id: 6, chord: 'G7' }, { id: 7, chord: 'Cmaj7' }, { id: 8, chord: 'Cmaj7' },
        ];
        const groups = suggestKeyGroups({ options: { key: { tonic: 'Ab', type: 'major' } } }, chords);
        assert.deepEqual(groups[1].key, { tonic: 'C', type: 'major', source: 'user' });
    });

});
