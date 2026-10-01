import assert from 'assert';
import { Note } from "@tonaljs/tonal";

// see https://github.com/tonaljs/tonal/issues/200
// see https://github.com/music-practice-tools/music-practice-tools/blob/master/src/js/widgets/random.js#L61-L83

describe('circle of fifths', () => {

    const fifths = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const fifthsMap = fifths.map(num => Note.transposeFifths('C', num)) // =>
    // [
    //     'Dbb', 'Abb', 'Ebb', 'Bbb', 'Fb',
    //     'Cb', 'Gb', 'Db', 'Ab', 'Eb',
    //     'Bb', 'F', 'C', 'G', 'D',
    //     'A', 'E', 'B', 'F#', 'C#',
    //     'G#', 'D#', 'A#', 'E#', 'B#'
    // ]

    it('play', () => {
        // console.log(Note.transposeFifths('C', 0))
        // console.log(Note.transposeFifths('C', 1))
        // console.log(Note.transposeFifths('C', 2))
        // console.log(Note.transposeFifths('C', -1))
    });
});
