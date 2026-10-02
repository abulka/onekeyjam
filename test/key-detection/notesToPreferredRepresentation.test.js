import assert from 'assert';
import { notesToPreferredRepresentation } from '../../src/lib/note-tools';

describe('notesToPreferredRepresentation', () => {

    it('C E G', () => {
        const result = notesToPreferredRepresentation(['C', 'E', 'G'])
        assert.deepEqual(result, ['C', 'E', 'G']);
    });

    it('C# D# G#', () => {
        const result = notesToPreferredRepresentation(['C#', 'D#', 'G#'])
        assert.deepEqual(result, ['C#', 'Eb', 'Ab']);
    });


});
