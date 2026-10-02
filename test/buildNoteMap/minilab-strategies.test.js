import assert from 'assert';
import { buildNoteMap } from '@/lib/midi/jam-mapping-to-allowed.js'

/*
    Tests for Arturia MINILAB" keyboard config

    B major scale ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#', 'B'] mapping C4 -> B4 is too far away. Huge jump.
    G major scale ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G'] mapping C4 -> G3 is still discombobulating jump.

    B major scale - 'CToScaleTonic' strategy (current, flawed cos of high pitches)
    {
        C4: 'B4',
        D4: 'C#5',
        E4: 'D#5',
        F4: 'E5',
        G4: 'F#5',
        A4: 'G#5',
        B4: 'A#5',
        C5: 'B5',
        D5: 'C#6',
        E5: 'D#6',
        F5: 'E6',
        G5: 'F#6',
        A5: 'G#6',
        B5: 'A#6',
        C6: 'B6',
        D6: 'C#7',
        E6: 'D#7',
        F6: 'E7',
        G6: 'F#7',
        A6: 'G#7',
        B6: 'A#7',
    }  

    unfortunately, as well as the huge pitch jumps, we lose notes < B4
        'C#4',
        'D#4',
        'E4',
        'F#4',
        'G#4',
        'A#4',

    Added a 'autoDropOctave' option which shifts the mapping downwards by an octave if it reduces the pitch jump.
    This would only apply to scales F#, G, G#, A, A#, B since they are > than half way (F#) up from C4.
    {
        C4: 'B3',  <- we normally start allocating at B4 but adjust to make jump less brutal - nice result
        D4: 'C#4',
        E4: 'D#4',
        F4: 'E4',
        G4: 'F#4',
        A4: 'G#4',
        B4: 'A#4',
        C5: 'B4',  <-
        D5: 'C#5',
        E5: 'D#5',
        F5: 'E5',
        G5: 'F#5',
        A5: 'G#5',
        B5: 'A#5',
        C6: 'B5',
        D6: 'C#6',
        E6: 'D#6',
        F6: 'E6',
        G6: 'F#6',
        A6: 'G#6',
        B6: 'A#6',
    } 



    // ╔═╗4╔╦╗┌─┐╔═╗4  ┌─┐┌┬┐┬─┐┌─┐┌┬┐┌─┐┌─┐┬ ┬
    // ║  4 ║ │ │║  4  └─┐ │ ├┬┘├─┤ │ ├┤ │ ┬└┬┘
    // ╚═╝4 ╩ └─┘╚═╝4  └─┘ ┴ ┴└─┴ ┴ ┴ └─┘└─┘ ┴ 


    Need to map C4 as close as possible to C4 always, to stop these huge pitch jumps. e.g.
    
    B major scale - 'CToC' strategy
    {
        C4: 'C#4',
        D4: 'D#4',
        E4: 'E4',
        F4: 'F#4',
        G4: 'G#4',
        A4: 'A#4',
        B4: 'B4',
        C5: 'C#5',
        D5: 'D#5',
        E5: 'E5',
        F5: 'F#5',
        G5: 'G#5',
        A5: 'A#5',
        B5: 'B6',
        C6: 'C#6',
        D6: 'D#6',
        E6: 'E6',
        F6: 'F#6',
        G6: 'G#6',
        A6: 'A#6',
        B6: 'B6'
    }  

    Nice result.
    
    preserveOctaves
    ---------------

    Interestingly, adding 'preserveOctaves' true doesn't change the B major
    scale and results in the same mapping, because there are 7 notes in the
    scale which map the 7 white notes, so we happen to end up preserving octaves
    anyway, with scale tonic B always occuring on a white real note C, in each
    octave.

    {
        C4: 'B4',
        D4: 'C#5',
        E4: 'D#5',
        F4: 'E5',
        G4: 'F#5',
        A4: 'G#5',
        B4: 'A#5',
        C5: 'B5',
        D5: 'C#6',
        E5: 'D#6',
        F5: 'E6',
        G5: 'F#6',
        A5: 'G#6',
        B5: 'A#6',
        C6: 'B6',
        D6: 'C#7',
        E6: 'D#7',
        F6: 'E7',
        G6: 'F#7',
        A6: 'G#7',
        B6: 'A#7',
    }  

    However with scales that have fewer notes, the mapping will repeat very
    quickly and result in high pitches appearing low down on the piano. We could
    have a strategy where we always map C to C and if the allowed notes are used
    up we map the remaining notes to silent notes or to the last note of the
    scale till we hit the next octave again.

    B major pentatonic scale ['B', 'C#', 'E', 'F#', 'G#']  - 'CToC' strategy
    {
        C4: 'C#4',
        D4: 'E4',
        E4: 'F#4',
        F4: 'G#4',
        G4: 'B4',
        A4: 'C#5',
        B4: 'E5',
        C5: 'F#5',
        D5: 'G#5',
        E5: 'B5',
        F5: 'C#6',
        G5: 'E6',
        A5: 'F#6',
        B5: 'G#6',
        C6: 'B6',
        D6: 'C#7',
        E6: 'E7',
        F6: 'F#7',
        G6: 'G#7',
        A6: 'B7',
        B6: 'C#8'
    } 

    B major pentatonic scale ['B', 'C#', 'E', 'F#', 'G#'] - 'CToC' strategy
    with 'preserveOctaves' option which preserves pitches by adding blank or
    repeating end of scale notes:
    {
        C4: 'C#4',
        D4: 'E4',
        E4: 'F#4',
        F4: 'G#4',
        G4: 'B4',
        A4: (blank or B4),
        B4: (blank or B4),
        C5: 'C#5',
        D5: 'E5',
        E5: 'F#5',
        F5: 'G#5',
        G5: 'B5',
        A5: (blank or B5),
        B5: (blank or B5),
        C6: 'C#6',
        D6: 'E6',
        E6: 'F#6',
        F6: 'G#6',
        G6: 'B6',
        A6: (blank or B6),
        B6: (blank or B6),
    } 

    Note: to switch between blank (silent note) and last good note we pass option 'padWithLastGoodNote'
    */

describe('minilab one octave - buildNoteMap strategies', () => {

    const lhTriggerOctave = 3
    const rhJamSoundOctave = 4
    const bMajorScale = ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#']
    const gMajorScale = ['G', 'A', 'B', 'C', 'D', 'E', 'F#']
    const gMajorPentatonicScale = ['G', 'A', 'B', 'D', 'E']
    const cSharpMajorPentatonicScale = ['C#', 'D#', 'F', 'G#', 'A#']

    it('CToScaleTonic - B major - high pitches unsatisfactory', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToScaleTonic',
            preserveOctaves: false,
            autoDropOctave: false
        }
        let result = buildNoteMap(bMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.equal(result['C4'], 'B4');

        const expected = {
            C4: 'B4',
            D4: 'C#5',
            E4: 'D#5',
            F4: 'E5',
            G4: 'F#5',
            A4: 'G#5',
            B4: 'A#5',
            C5: 'B5',
            D5: 'C#6',
            E5: 'D#6',
            F5: 'E6',
            G5: 'F#6',
            A5: 'G#6',
            B5: 'A#6',
            C6: 'B6',
            D6: 'C#7',
            E6: 'D#7',
            F6: 'E7',
            G6: 'F#7',
            A6: 'G#7',
            B6: 'A#7',
        }
        assert.deepEqual(result, expected)

    });

    it('CToC in B major', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToC',
            preserveOctaves: false,
        }
        let result = buildNoteMap(bMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)

        const expected = {
            C4: 'C#4',
            D4: 'D#4',
            E4: 'E4',
            F4: 'F#4',
            G4: 'G#4',
            A4: 'A#4',
            B4: 'B4',
            C5: 'C#5',
            D5: 'D#5',
            E5: 'E5',
            F5: 'F#5',
            G5: 'G#5',
            A5: 'A#5',
            B5: 'B5',
            C6: 'C#6',
            D6: 'D#6',
            E6: 'E6',
            F6: 'F#6',
            G6: 'G#6',
            A6: 'A#6',
            B6: 'B6'
        }
        assert.deepEqual(result, expected)

    });

    it('CToC in G major', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToC',
            preserveOctaves: false,
        }
        let result = buildNoteMap(gMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)

        const expected = {
            C4: 'C4',
            D4: 'D4',
            E4: 'E4',
            F4: 'F#4',
            G4: 'G4',
            A4: 'A4',
            B4: 'B4',
            C5: 'C5',
            D5: 'D5',
            E5: 'E5',
            F5: 'F#5',
            G5: 'G5',
            A5: 'A5',
            B5: 'B5',
            C6: 'C6',
            D6: 'D6',
            E6: 'E6',
            F6: 'F#6',
            G6: 'G6',
            A6: 'A6',
            B6: 'B6'
        }
        assert.deepEqual(result, expected)

        // P.S. turning on preserve octaves shouldn't make a difference since 7 scale
        // notes match 7 white notes, so fortuitously the octaves are preserved
        // anyway
        options.preserveOctaves = true
        result = buildNoteMap(gMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });

    it('CToC in G major pentatonic', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToC',
            preserveOctaves: false,
        }
        let result = buildNoteMap(gMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)

        // gMajorPentatonicScale ['G', 'A', 'B', 'D', 'E']
        const expected = {
            C4: 'D4',
            D4: 'E4',
            E4: 'G4',
            F4: 'A4',
            G4: 'B4',
            A4: 'D5',
            B4: 'E5',
            C5: 'G5',
            D5: 'A5',
            E5: 'B5',
            F5: 'D6',
            G5: 'E6',
            A5: 'G6',
            B5: 'A6',
            C6: 'B6',
            D6: 'D7',
            E6: 'E7',
            F6: 'G7',
            G6: 'A7',
            A6: 'B7',
            B6: 'D8'
        }
        assert.deepEqual(result, expected)
    });

    it('CToC in G major pentatonic, preserve octaves', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToC',
            preserveOctaves: true,
        }

        // gMajorPentatonicScale ['G', 'A', 'B', 'D', 'E']
        const expected = {
            C4: 'D4',
            D4: 'E4',
            E4: 'G4',
            F4: 'A4',
            G4: 'B4',
            A4: '',
            B4: '',
            C5: 'D5',
            D5: 'E5',
            E5: 'G5',
            F5: 'A5',
            G5: 'B5',
            A5: '',
            B5: '',
            C6: 'D6',
            D6: 'E6',
            E6: 'G6',
            F6: 'A6',
            G6: 'B6',
            A6: '',
            B6: ''
        }

        let result = buildNoteMap(gMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });

    it('CToC in G major pentatonic, preserve octaves, pad', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToC',
            preserveOctaves: true,
            padWithLastGoodNote: true,
        }

        // gMajorPentatonicScale ['G', 'A', 'B', 'D', 'E']
        const expected = {
            C4: 'D4',
            D4: 'E4',
            E4: 'G4',
            F4: 'A4',
            G4: 'B4',
            A4: 'B4', // last good note instead of ''
            B4: 'B4', // last good note instead of ''
            C5: 'D5',
            D5: 'E5',
            E5: 'G5',
            F5: 'A5',
            G5: 'B5',
            A5: 'B5', // last good note instead of ''
            B5: 'B5', // last good note instead of ''
            C6: 'D6',
            D6: 'E6',
            E6: 'G6',
            F6: 'A6',
            G6: 'B6',
            A6: 'B6', // last good note instead of ''
            B6: 'B6', // last good note instead of ''
        }

        let result = buildNoteMap(gMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });


    it('CToScaleTonic in G major pentatonic, preserve octaves', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToScaleTonic',
            preserveOctaves: true,
        }

        // hmmm preserve octaves doesn't quite work here as well
        // cos octave shift happens in allowed notes very quickly.
        // Its about preserving the C to ScaleTonic mapping
        // but not the octaves !!! 

        // gMajorPentatonicScale ['G', 'A', 'B', 'D', 'E']
        const expected = {
            C4: 'G4',
            D4: 'A4',
            E4: 'B4',
            F4: 'D5',
            G4: 'E5',
            A4: '',
            B4: '',
            C5: 'G5',
            D5: 'A5',
            E5: 'B5',
            F5: 'D6',
            G5: 'E6',
            A5: '',
            B5: '',
            C6: 'G6',
            D6: 'A6',
            E6: 'B6',
            F6: 'D7',
            G6: 'E7',
            A6: '',
            B6: ''
        }

        let result = buildNoteMap(gMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });

    it('CToScaleTonic in C# major pentatonic, preserve octaves', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToScaleTonic',
            preserveOctaves: true,
        }

        // cSharpMajorPentatonicScale ['C#', 'D#', 'F', 'G#', 'A#']
        const expected = {
            C4: 'C#4',
            D4: 'D#4',
            E4: 'F4',
            F4: 'G#4',
            G4: 'A#4',
            A4: '',
            B4: '',
            C5: 'C#5',
            D5: 'D#5',
            E5: 'F5',
            F5: 'G#5',
            G5: 'A#5',
            A5: '',
            B5: '',
            C6: 'C#6',
            D6: 'D#6',
            E6: 'F6',
            F6: 'G#6',
            G6: 'A#6',
            A6: '',
            B6: ''
        }

        let result = buildNoteMap(cSharpMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });

    it('CToScaleTonic in A# major pentatonic, preserve octaves', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToScaleTonic',
            preserveOctaves: true,
        }

        const aSharpMajorPentatonicScale = ['A#', 'C', 'D', 'F', 'G']
        const expected = {
            C4: 'A#4',
            D4: 'C5',
            E4: 'D5',
            F4: 'F5',
            G4: 'G5',
            A4: '',
            B4: '',
            C5: 'A#5',
            D5: 'C6',
            E5: 'D6',
            F5: 'F6',
            G5: 'G6',
            A5: '',
            B5: '',
            C6: 'A#6',
            D6: 'C7',
            E6: 'D7',
            F6: 'F7',
            G6: 'G7',
            A6: '',
            B6: ''
        }

        let result = buildNoteMap(aSharpMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });

    it('CToScaleTonic in B major, autoDropOctave', () => {
        const numLhTriggers = 7
        const options = {
            strategy: 'CToScaleTonic',
            autoDropOctave: true,
        }

        // The 'autoDropOctave' option which shifts the mapping downwards by an
        // octave if it reduces the pitch jump. This would only apply to scales
        // G, G#, A, A#, B since they are > than half way (F#) up from C4.
        const expected = {
            C4: 'B3',  // <- we normally start allocating at B4 but adjust to make jump less brutal - nice result
            D4: 'C#4',
            E4: 'D#4',
            F4: 'E4',
            G4: 'F#4',
            A4: 'G#4',
            B4: 'A#4',
            C5: 'B4',  // <- this would have been at trigger C4
            D5: 'C#5',
            E5: 'D#5',
            F5: 'E5',
            G5: 'F#5',
            A5: 'G#5',
            B5: 'A#5',
            C6: 'B5',
            D6: 'C#6',
            E6: 'D#6',
            F6: 'E6',
            G6: 'F#6',
            A6: 'G#6',
            B6: 'A#6',
        }

        let result = buildNoteMap(bMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });

    it('CToScaleTonic in B major, backfill, one lh trigger', () => {
        const numLhTriggers = 1
        const options = {
            strategy: 'CToScaleTonic',
            backfill: true,  // works off numLhTriggers
        }

        const expected = {
            // C3      // lh trigger - just this one
            D3: 'C#4', // * backfilled area - beginning
            E3: 'D#4', // * backfilled area
            F3: 'E4',  // * backfilled area
            G3: 'F#4', // * backfilled area
            A3: 'G#4', // * backfilled area
            B3: 'A#4', // * backfilled area - end
            C4: 'B4',  // <--- normally start here if no backfill
            D4: 'C#5',
            E4: 'D#5',
            F4: 'E5',
            G4: 'F#5',
            A4: 'G#5',
            B4: 'A#5',
            C5: 'B5',
            D5: 'C#6',
            E5: 'D#6',
            F5: 'E6',
            G5: 'F#6',
            A5: 'G#6',
            B5: 'A#6',
            C6: 'B6',
            D6: 'C#7',
            E6: 'D#7',
            F6: 'E7',
            G6: 'F#7',
            A6: 'G#7',
            B6: 'A#7',
        }

        let result = buildNoteMap(bMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        // console.log('result', result)
        assert.deepEqual(result, expected)

    });

    it('CToScaleTonic in B major, backfill, autodrop, 4 lh triggers', () => {
        const numLhTriggers = 4
        const options = {
            strategy: 'CToScaleTonic',
            backfill: true,  // works off numLhTriggers
            autoDropOctave: true,

        }

        const expected = {
            // C3      // lh chord trigger
            // D3      // lh chord trigger
            // E3      // lh chord trigger
            // F3      // lh chord trigger
            G3: 'F#3', // * backfilled area - start
            A3: 'G#3', // * backfilled area
            B3: 'A#3', // * backfilled area - end
            C4: 'B3',  // <--- normally start here if no backfill, without autodrop would be B4
            D4: 'C#4',
            E4: 'D#4',
            F4: 'E4',
            G4: 'F#4',
            A4: 'G#4',
            B4: 'A#4',
            C5: 'B4',
            D5: 'C#5',
            E5: 'D#5',
            F5: 'E5',
            G5: 'F#5',
            A5: 'G#5',
            B5: 'A#5',
            C6: 'B5',
            D6: 'C#6',
            E6: 'D#6',
            F6: 'E6',
            G6: 'F#6',
            A6: 'G#6',
            B6: 'A#6',
        }

        let result = buildNoteMap(bMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });

    it('CToScaleTonic in G major pentatonic, backfill', () => {
        const numLhTriggers = 1
        const options = {
            strategy: 'CToScaleTonic',
            backfill: true,
            autoDropOctave: false,
        }

        // gMajorPentatonicScale ['G', 'A', 'B', 'D', 'E']
        const expected = {
            // C3      // lh chord trigger
            D3: 'E3', // * backfilled area - start
            E3: 'G3',
            F3: 'A3',
            G3: 'B3',
            A3: 'D4',
            B3: 'E4', // * backfilled area - end
            C4: 'G4',
            D4: 'A4',
            E4: 'B4',
            F4: 'D5',
            G4: 'E5',
            A4: 'G5',
            B4: 'A5',
            C5: 'B5',
            D5: 'D6',
            E5: 'E6',
            F5: 'G6',
            G5: 'A6',
            A5: 'B6',
            B5: 'D7',
            C6: 'E7',
            D6: 'G7',
            E6: 'A7',
            F6: 'B7',
            G6: 'D8',
            A6: 'E8',
            B6: 'G8'
          }

        let result = buildNoteMap(gMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        // console.log('result', result)
        assert.deepEqual(result, expected)

    });

    it('CToScaleTonic in G major pentatonic, backfill, autodrop', () => {
        const numLhTriggers = 1
        const options = {
            strategy: 'CToScaleTonic',
            backfill: true,
            autoDropOctave: true,
        }

        // gMajorPentatonicScale ['G', 'A', 'B', 'D', 'E']
        const expected = {
            // C3      // lh chord trigger
            D3: 'E2', // * backfilled area - start
            E3: 'G2',
            F3: 'A2',
            G3: 'B2',
            A3: 'D3',
            B3: 'E3', // * backfilled area - end
            C4: 'G3',
            D4: 'A3',
            E4: 'B3',
            F4: 'D4',
            G4: 'E4',
            A4: 'G4',
            B4: 'A4',
            C5: 'B4',
            D5: 'D5',
            E5: 'E5',
            F5: 'G5',
            G5: 'A5',
            A5: 'B5',
            B5: 'D6',
            C6: 'E6',
            D6: 'G6',
            E6: 'A6',
            F6: 'B6',
            G6: 'D7',
            A6: 'E7',
            B6: 'G7'
          }

        let result = buildNoteMap(gMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        // console.log('result', result)
        assert.deepEqual(result, expected)

    });

    it('CToScaleTonic in G major pentatonic, backfill, preserve', () => {
        const numLhTriggers = 1
        const options = {
            strategy: 'CToScaleTonic',
            backfill: true,
            preserveOctaves: true,
        }

        // gMajorPentatonicScale ['G', 'A', 'B', 'D', 'E']
        const expected = {
            // C3     // lh chord trigger (jam would have been C3: 'G3')
            D3: 'A3', // * backfilled area - start
            E3: 'B3',
            F3: 'D4',
            G3: 'E4',
            A3: '',
            B3: '',  // * backfilled area - end
            C4: 'G4',
            D4: 'A4',
            E4: 'B4',
            F4: 'D5',
            G4: 'E5',
            A4: '',
            B4: '',
            C5: 'G5',
            D5: 'A5',
            E5: 'B5',
            F5: 'D6',
            G5: 'E6',
            A5: '',
            B5: '',
            C6: 'G6',
            D6: 'A6',
            E6: 'B6',
            F6: 'D7',
            G6: 'E7',
            A6: '',
            B6: ''
          }

        let result = buildNoteMap(gMajorPentatonicScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        assert.deepEqual(result, expected)

    });

    it('CToC in B major, backfill', () => {
        const numLhTriggers = 4
        const options = {
            strategy: 'CToC',
            backfill: true,
        }
        let result = buildNoteMap(bMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        // console.log('result', result)

        const expected = {
            // C3      // lh trigger
            // D3      // lh trigger
            // E3      // lh trigger
            // F3      // lh trigger
            G3: 'G#3', // * backfilled area - begin
            A3: 'A#3', // * backfilled area
            B3: 'B3',  // * backfilled area - end
            C4: 'C#4', // <--- normally start here if no backfill
            D4: 'D#4',
            E4: 'E4',
            F4: 'F#4',
            G4: 'G#4',
            A4: 'A#4',
            B4: 'B4',
            C5: 'C#5',
            D5: 'D#5',
            E5: 'E5',
            F5: 'F#5',
            G5: 'G#5',
            A5: 'A#5',
            B5: 'B5',
            C6: 'C#6',
            D6: 'D#6',
            E6: 'E6',
            F6: 'F#6',
            G6: 'G#6',
            A6: 'A#6',
            B6: 'B6'
        }
        assert.deepEqual(result, expected)

    });

    it('CToC in B major, backfill 8 triggers', () => {
        const numLhTriggers = 8
        const options = {
            strategy: 'CToC',
            backfill: true,
        }
        let result = buildNoteMap(bMajorScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options)
        // console.log('result', result)

        const expected = {
            // C3      // lh trigger 1
            // D3      // lh trigger 2
            // E3      // lh trigger 3
            // F3      // lh trigger 4
            // G3:     // lh trigger 5
            // A3:     // lh trigger 6
            // B3:     // lh trigger 7
            // C4:     // lh trigger 8
            D4: 'D#3',
            E4: 'E3',
            F4: 'F#3',
            G4: 'G#3',
            A4: 'A#3',
            B4: 'B3',
            C5: 'C#4', // <--- normally start here if no backfill
            D5: 'D#4',
            E5: 'E4',
            F5: 'F#4',
            G5: 'G#4',
            A5: 'A#4',
            B5: 'B4',
            C6: 'C#5',
            D6: 'D#5',
            E6: 'E5',
            F6: 'F#5',
            G6: 'G#5',
            A6: 'A#5',
            B6: 'B5'
        }
        // console.log('result', result)
        assert.deepEqual(result, expected)

    });

});


/*

More tests for - backfilling jam notes downwards: 
-------------------------------------------------

If chord trigger notes don't fill up an entire octave, ideally we would
backfill jam notes downwards to avoid wasted jam notes - below the first jam
octave, down till the last/highest chord trigger note e.g.

const lhTriggerOctave = 2
const rhJamSoundOctave = 4    

1. const numLhTriggers = 4 (not the full 7)
   0.5 octave of chord triggers C2-E2, extra jam notes created backfilled from
   C3 which plays C3. viz. F2=F2 G2=G2 A2=A2 B2=B2 then of course C3=C3
   
2. const numLhTriggers = 10 (not the full 14)
   1.5 octaves of chord triggers C2-E3, extra jam notes created backfilled from
   C4 which plays C3. viz. F3=F2 G3=G2 A3=A2 B3=B2 then of course C4=C3

3. const numLhTriggers = 18 (not the full 21)
   2.5 octaves of chord triggers C2-E4, extra jam notes created backfilled from
   C5 which plays C3. viz. F4=F2 G4=G2 A4=A2 B4=B2 then of course C5=C3

*/

