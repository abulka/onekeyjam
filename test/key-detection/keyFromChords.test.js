import _ from 'lodash';
import assert from 'assert';
import * as Tonal from '@tonaljs/tonal';
import { keyFromChords, keyFromNotes } from '../../src/lib/keyFromChords';

describe('key detection from chords - idea2', () => {

    it('ideal API', () => {
        const chordSymbols = ['Bbm', 'Cm', 'EbM'];  // keydetect used to not handle M - now it does
        // const chordSymbols = ['Bbm', 'Cm', 'Eb'];
        const possibleKeys = keyFromChords(chordSymbols);
        // console.log('possibleKeys', possibleKeys);

        // this differs from idea1 algorithm which suggests that the key is 'Ab major' - sounds OK in reality
        // java tension says Eb Major, which is consistent with the idea2 algorithm but sounds bad in reality
        // 'C minor' sounds bad too
        // Its because of a bug in chord detection algorithm for majors 
        // assert.deepEqual(possibleKeys, ['C minor', 'Eb major', 'G minor', 'Bb major']);

        assert.deepEqual(possibleKeys, ['F minor', 'Ab major']);

    });

    // tests from the SO post https://stackoverflow.com/questions/45399081/determine-the-key-of-a-song-by-its-chords
    // note I've changed minor scale in original alg. to be natural minor not melodic minor

    it('CM classic', () => {
        const chordSymbols = ['C', 'Dm'];
        const possibleKeys = keyFromChords(chordSymbols);
        // console.log('possibleKeys', possibleKeys);
        assert.deepEqual(possibleKeys, ['C major', 'D minor', 'F major', 'A minor']);
    });

    it('C, F, G', () => {
        const chordSymbols = ['C', 'F', 'G'];
        const possibleKeys = keyFromChords(chordSymbols);
        // console.log('possibleKeys', possibleKeys);
        assert.deepEqual(possibleKeys, ['C major', 'A minor']);
    });

    it('Eb, Fm, Gm', () => {
        const chordSymbols = ['Eb', 'Fm', 'Gm'];
        const possibleKeys = keyFromChords(chordSymbols);
        // console.log('possibleKeys', possibleKeys);
        assert.deepEqual(possibleKeys, ['C minor', 'Eb major']);
    });

    it('C, D7, G7', () => {
        const chordSymbols = ['C', 'D7', 'G7'];
        const possibleKeys = keyFromChords(chordSymbols);
        // console.log('possibleKeys', possibleKeys);
        assert.deepEqual(possibleKeys, ['C major', 'E minor', 'G major', 'A minor']);
    });

    it('C, Dm, G, A', () => {
        const chordSymbols = ['C', 'Dm', 'G', 'A'];
        const possibleKeys = keyFromChords(chordSymbols);
        // console.log('possibleKeys', possibleKeys);
        assert.deepEqual(possibleKeys, ['C major', 'A minor']);
    });

    it('CM Bm#5 Am Am#5 which is really CM GM Am FM.json', () => {
        /*
         public/projects/CM GM Am FM progression.json

        Using the Tonal interpretation of the notes, which is a bit random
        and gave us CM Bm#5 Am Am#5 instead of CM GM Am FM we get:
            - keyFromChords: "E spanish heptatonic" 1: "C bebop" 2: "G bebop" 3: "D bebop minor" 4: "G bebop minor"
            - keyFromChords2: 'E minor', 'G major' 
            - java tension (bin/run3): A Minor
            - music21: C major or possibly [<music21.key.Key of a minor>]
        Summary, the java and music21 algorithms agree on the key - A minor
        but my two algorithms disagree with each other and also with the java algorithm.
        sigh...
        Correction: when using proper Tonal chord detection and intervals
            - keyFromChords2: 'C major', 'A minor'
        which is in line with the music21 algorithm and with the java algorithm. 😀

        However, if specify the chord explicitly, thus avoiding Tonal picking
        the wrong chord symbol (from a variety of chord symbols) and
        use the intended chords CM GM Am FM then we get a better result 🎉
            - keyFromChords: "E spanish heptatonic" 1: "C bebop" 2: ... ❌
            - keyFromChords2: 'C major', 'A minor' ✅
            - java tension: C Major  ✅
            - music21: C major or possibly [<music21.key.Key of a minor>]  ✅
        */
        const chordSymbols = ['CM', 'Bm#5', 'Am', 'Am#5'];  // TODO Warning Bm#5 is being treated as Bm by keydetect2
        const possibleKeys = keyFromChords(chordSymbols);   // TODO same with Am#5
        // console.log('possibleKeys', possibleKeys);
        // assert.deepEqual(possibleKeys, ['E minor', 'G major']); // buggy - see above
        assert.deepEqual(possibleKeys, ['C major', 'A minor']);  // when using proper Tonal chord recognition

        const possibleKeysSimpler = keyFromChords(['C', 'G', 'Am', 'F']);
        // console.log('possibleKeysSimpler', possibleKeysSimpler);
        assert.deepEqual(possibleKeysSimpler, ['C major', 'A minor']);

    });

    it('Empty', () => {
        const chordSymbols = [];
        const possibleKeys = keyFromChords(chordSymbols);
        // console.log('possibleKeys', possibleKeys);
        assert.deepEqual(possibleKeys, []);
    });

    // tonal conversion

    it('misc', () => {
        const allnotes = [
            "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"
        ]

        // const allNotesTonalObjs = allnotes.map(note => Tonal.Note.get(note))
        // console.log('allNotesTonalObjs', allNotesTonalObjs)

        // console.log(Tonal.Note.get('Eb'))
        // console.log(Tonal.Note.get('D#'))

        /*
        console.log([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(Tonal.Interval.fromSemitones))
        [
            '1P', '2m', '2M',
            '3m', '3M', '4P',
            '5d', '5P', '6m',
            '6M', '7m', '7M',
            '8P'
        ]
        */

        assert.equal(Tonal.Note.get('Eb').chroma, Tonal.Note.get('D#').chroma)

        const interval1 = Tonal.Interval.distance('C', Tonal.Note.get('Eb').name)
        const interval2 = Tonal.Interval.distance('C', Tonal.Note.get('D#').name)
        // console.log('interval1', interval1, Tonal.Interval.get(interval1))
        // console.log('interval2', interval2, Tonal.Interval.get(interval2))

        /*
        Interesting that the interval C to D# is considered 2A (presumably augmented 2)
        but the interval C to Eb is considered 2m (minor 2)

        interval2 2A {
            empty: false,
            name: '2A',
            num: 2,
            q: 'A',
            step: 1,
            alt: 1,
            dir: 1,
            type: 'majorable',
            simple: 2,
            semitones: 3,
            chroma: 3,
            coord: [ 9, -5 ],
            oct: 0
        }
        */
        // assert.equal(Tonal.Note.get('Eb'), Tonal.Note.get('D#'))

    });

    it('keyFromNotes', () => {
        let result = keyFromNotes([
            ['C', 'E', 'G'],
            ['D', 'F', 'A'],
            ['C', 'E', 'G#']]);
        assert.deepEqual(result, ['C major', 'D minor', 'F major', 'A minor']);
    });



});
