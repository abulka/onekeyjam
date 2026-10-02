import assert from 'assert';
import { Note } from "@tonaljs/tonal";

// see https://github.com/tonaljs/tonal/issues/200
// see https://github.com/music-practice-tools/music-practice-tools/blob/master/src/js/widgets/random.js#L61-L83

describe('circle of fifths', () => {

    // transposing C up by n fifths gives, for n = -12..+12:
    // Dbb, Abb, Ebb, Bbb, Fb, Cb, Gb, Db, Ab, Eb, Bb, F, C, G, D, A, E, B, F#, C#, G#, D#, A#, E#, B#
    it('transposes C by fifths', () => {
        assert.equal(Note.transposeFifths('C', 0), 'C');
        assert.equal(Note.transposeFifths('C', 1), 'G');
        assert.equal(Note.transposeFifths('C', 2), 'D');
        assert.equal(Note.transposeFifths('C', -1), 'F');
    });
});
