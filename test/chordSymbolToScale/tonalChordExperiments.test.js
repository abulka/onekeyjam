import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { transpose } from "@tonaljs/note";

describe('tonal experiments', () => {

    it('ok not a tonaljs bug, Cm/ma7 is different to Cm', () => {
        // tonal says quality is 'Minor', type is 'minor' or 'minor/major seventh'
        const chordObj1 = Tonal.Chord.get('Cm');
        const chordObj2 = Tonal.Chord.get('Cm/ma7');
        assert.equal(chordObj1.quality, chordObj2.quality)
        assert.notEqual(chordObj1.type, chordObj2.type)
        assert.notEqual(chordObj1, chordObj2)
    });

    /*
    Add 9 means just add that 9th note to the chord
    Cadd9 = 1 3 5 9 

    Whenever we say maj7, maj9, maj11 or maj13, we assume that all other chord
    tones before the number are included. So for instance, a maj9 we assume will
    have the 1 3 5 7 and 9. Or for a maj13 we assume we have 1 3 5 7 9 11 and
    13, though we often don’t include all those chord tones, that’s kind of the
    assumption. However, with addx chords, we only add the number. So an add9
    chord goes 1 3 5 9. We skip over the extensions lower than the 9, with the
    exception of the triad itself, though the 5 is often excluded too. Thus
    C9 = C E G Bb D
    1 3 5 b7 9

    Maj9 is more specific. It means it is a Maj7th chord with the 9th added (CEGBD)
    CMaj9 = 1 3 5 7 9 
    */
    it('tonal 9th chord distinctions', () => {
        const cadd9 = Tonal.Chord.get('Cadd9'); // Madd9
        const c9 = Tonal.Chord.get('C9');
        const cmaj9 = Tonal.Chord.get('Cmaj9');

        assert.equal(cadd9.empty, false);
        assert.equal(c9.empty, false);
        assert.equal(cmaj9.empty, false);

        // console.log('cadd9', cadd9);  // notes: [ 'C', 'E', 'G', 'D' ]
        // console.log('c9', c9);        // notes: [ 'C', 'E', 'G', 'Bb', 'D' ]
        // console.log('cmaj9', cmaj9);  // notes: [ 'C', 'E', 'G', 'B', 'D' ]

        assert.deepEqual(cadd9.notes, ['C', 'E', 'G', 'D']);
        assert.deepEqual(c9.notes, ['C', 'E', 'G', 'Bb', 'D']);
        assert.deepEqual(cmaj9.notes, ['C', 'E', 'G', 'B', 'D']);

        assert.equal(cadd9.quality, 'Major');
        assert.equal(c9.quality, 'Major');
        assert.equal(cmaj9.quality, 'Major');

        assert.equal(cadd9.type, '');
        assert.equal(c9.type, 'dominant ninth');
        assert.equal(cmaj9.type, 'major ninth');
    });

    it('add2 vs add9 - they are the same, yes', () => {
        /*
        The add2 chord is very similar to the add9 chord; the notes are in fact
        the same, but the difference is that the add2 and the add9 notes belong
        to different octaves.
        
        Tonal aliases [ 'Madd9', '2', 'add9', 'add2' ]

        Tip from youtube video - use whole-half during transitions to other chords
        */
        const cadd9 = Tonal.Chord.get('Cadd9'); // Madd9
        const cadd2 = Tonal.Chord.get('Cadd2'); // Madd2 yet its not officially in Tonal but it works

        assert.equal(cadd9.empty, false);
        assert.equal(cadd2.empty, false);

        assert.equal(cadd9.quality, cadd2.quality);
        assert.equal(cadd9.type, cadd2.type);

        assert.deepEqual(cadd9.notes, cadd2.notes);
        assert.deepEqual(cadd9.notes.sort(), cadd2.notes.sort());
    })

    it('chord symbol aliases for Cadd9 for example', () => {
        const cadd9 = Tonal.Chord.get('Cadd9');

        for (let alias of cadd9.aliases) {
            const chordObj = Tonal.Chord.get(`C ${alias}`);
            assert.equal(chordObj.empty, false);
            assert.equal(chordObj.quality, cadd9.quality);
            assert.equal(chordObj.type, cadd9.type);
            assert.deepEqual(chordObj.notes.sort(), cadd9.notes.sort());
        }

    })

    it.skip('utility - dump chord symbol aliases', () => {
        Tonal.ChordType.symbols().sort().forEach(chordSymbol => {
            const chordObj = Tonal.Chord.get(chordSymbol)
            console.log(
                chordObj.aliases,
                // '  ==> ',
                // `name: '${chordObj.name}'`,
                // `quality: '${chordObj.quality}'`,
                // `type: '${chordObj.type}'`
            )
        })
    })

    /*
    Aside 
        C7 is C E G Bb - notice the Bb. Add the 9th to get C9. etc. also C11 and C13.
        CM7 is C E G B - notice the B. Add the 9th to get CM9. etc. also CM11 and CM13.
    */

    it('note intervals 2 semitones up', () => {
        const twoSemitones = Tonal.Interval.fromSemitones(2);
        const result = transpose("B", twoSemitones);
        assert.equal(result, "C#");
    })

    it('note intervals 1 semitone down', () => {
        const oneSemitoneDown = Tonal.Interval.fromSemitones(-1);
        const result = transpose("B", oneSemitoneDown);
        assert.equal(result, "A#");
    })

    it('is "C locrian" the same as "Db major"? - yes', () => {
        const cLocrian = Tonal.Scale.get('C locrian');
        const dbMajor = Tonal.Scale.get('Db major');

        assert.deepEqual(cLocrian.notes.sort(), dbMajor.notes.sort());
    })



})
