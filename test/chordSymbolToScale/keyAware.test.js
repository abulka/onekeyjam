import assert from 'assert';
import {
    chordScaleNamesFor,
    checkScaleAgainstChord,
    scaleAnnotation,
    DEFAULT_COLOUR,
} from '../../src/lib/chordScaleEngine.js';
import { findTop3MatchingScales, fillMissingScales } from '../../src/lib/scaleMatching.js';

/*
 * Key-aware ranking tests. A key is a bias, not a gate: it should fix
 * ambiguous functions (iiø vs viiø, minor V7, tritone subs) and keep the
 * alternatives close to the key, while the colour profile decides how much
 * chromatic colour the primary scales keep. See doco/MUSIC-THEORY.md.
 */

describe('chordScaleEngine - key-aware ranking', () => {

    const major = (tonic, colour) => ({ tonic, type: 'major', colour });
    const minor = (tonic, colour) => ({ tonic, type: 'minor', colour });

    it('keeps the key-free results identical when no key is supplied', () => {
        assert.deepEqual(chordScaleNamesFor('Cm7', 2), ['C dorian', 'C aeolian']);
        assert.deepEqual(chordScaleNamesFor('Cmaj7', 2), ['C major', 'C lydian']);
        assert.deepEqual(chordScaleNamesFor('Cm7b5', 2), ['C locrian #2', 'C locrian']);
    });

    it('defaults to the jazz colour when a colour is not given', () => {
        assert.equal(DEFAULT_COLOUR, 'jazz');
        assert.equal(chordScaleNamesFor('Cm7', 1, minor('C'))[0], 'C dorian');
        assert.equal(chordScaleNamesFor('Bm7b5', 1, major('C'))[0], 'B locrian #2');
    });

    it('accepts a key as a scale name string', () => {
        // A plain string key has no colour, so it uses the default jazz profile.
        assert.equal(chordScaleNamesFor('Bm7b5', 1, 'C major')[0], 'B locrian #2');
    });

    describe('diatonic profile (strictly in key)', () => {
        it('flattens to the diatonic mode and distinguishes iiø from viiø', () => {
            assert.equal(chordScaleNamesFor('Bm7b5', 1, major('C', 'diatonic'))[0], 'B locrian');
            assert.equal(chordScaleNamesFor('C#m7b5', 1, major('D', 'diatonic'))[0], 'C# locrian');
            assert.equal(chordScaleNamesFor('Dm7b5', 1, minor('C', 'diatonic'))[0], 'D locrian #2');
            assert.equal(chordScaleNamesFor('Am7', 1, major('C', 'diatonic'))[0], 'A aeolian');
            assert.equal(chordScaleNamesFor('Em7', 1, major('C', 'diatonic'))[0], 'E aeolian');
            assert.equal(chordScaleNamesFor('Cm7', 1, minor('C', 'diatonic'))[0], 'C aeolian');
        });

        it('still prefers lydian for IVmaj7 because the #11 is in the key', () => {
            assert.equal(chordScaleNamesFor('Fmaj7', 1, major('C', 'diatonic'))[0], 'F lydian');
        });

        it('does not let a sparse pentatonic outrank the minor iii7 choices', () => {
            const names = chordScaleNamesFor('Em7', 3, major('C', 'diatonic'));
            assert.ok(['E aeolian', 'E dorian'].includes(names[0]), names[0]);
        });

        it('licenses the accidentals of secondary dominants', () => {
            assert.equal(chordScaleNamesFor('A7', 1, major('C', 'diatonic'))[0], 'A mixolydian');
        });

        it('recognises tritone substitutes and backdoor dominants', () => {
            assert.equal(chordScaleNamesFor('Db7', 1, major('C', 'diatonic'))[0], 'Db lydian dominant');
            assert.equal(chordScaleNamesFor('Bb7', 1, major('C', 'diatonic'))[0], 'Bb lydian dominant');
        });
    });

    describe('jazz profile (idiomatic colour, the default)', () => {
        it('keeps dorian on m7 chords and locrian #2 on half-diminished', () => {
            assert.equal(chordScaleNamesFor('Am7', 1, major('C', 'jazz'))[0], 'A dorian');
            assert.equal(chordScaleNamesFor('Em7', 1, major('C', 'jazz'))[0], 'E dorian');
            assert.equal(chordScaleNamesFor('Cm7', 1, minor('C', 'jazz'))[0], 'C dorian');
            assert.equal(chordScaleNamesFor('Bm7b5', 1, major('C', 'jazz'))[0], 'B locrian #2');
            assert.equal(chordScaleNamesFor('Dm7b5', 1, minor('C', 'jazz'))[0], 'D locrian #2');
        });

        it('keeps the functional dominant rules (minor V7 and tritone subs)', () => {
            assert.equal(chordScaleNamesFor('G7', 1, minor('C', 'jazz'))[0], 'G phrygian dominant');
            assert.equal(chordScaleNamesFor('G7b9', 1, minor('C', 'jazz'))[0], 'G phrygian dominant');
            assert.equal(chordScaleNamesFor('G7alt', 1, minor('C', 'jazz'))[0], 'G altered');
            assert.equal(chordScaleNamesFor('E7', 1, minor('A', 'jazz'))[0], 'E phrygian dominant');
            assert.equal(chordScaleNamesFor('Db7', 1, major('C', 'jazz'))[0], 'Db lydian dominant');
            assert.equal(chordScaleNamesFor('Bb7', 1, major('C', 'jazz'))[0], 'Bb lydian dominant');
        });

        it('keeps the plain major-key defaults', () => {
            assert.equal(chordScaleNamesFor('Cmaj7', 1, major('C', 'jazz'))[0], 'C major');
            assert.equal(chordScaleNamesFor('G7', 1, major('C', 'jazz'))[0], 'G mixolydian');
            assert.equal(chordScaleNamesFor('A7', 1, major('C', 'jazz'))[0], 'A mixolydian');
        });
    });

    describe('adventurous profile', () => {
        it('prefers lydian on maj7 and lydian dominant on dominants', () => {
            assert.equal(chordScaleNamesFor('Cmaj7', 1, major('C', 'adventurous'))[0], 'C lydian');
            assert.equal(chordScaleNamesFor('G7', 1, major('C', 'adventurous'))[0], 'G lydian dominant');
            assert.equal(chordScaleNamesFor('A7', 1, major('C', 'adventurous'))[0], 'A lydian dominant');
        });

        it('still uses altered for an altered dominant', () => {
            assert.equal(chordScaleNamesFor('G7alt', 1, minor('C', 'adventurous'))[0], 'G altered');
        });
    });

    describe('modal keys', () => {
        it('keeps a dorian tune on dorian in every colour', () => {
            for (const colour of ['diatonic', 'jazz', 'adventurous'])
                assert.equal(chordScaleNamesFor('Dm7', 1, { tonic: 'D', type: 'dorian', colour })[0], 'D dorian');
        });

        it('still resolves the bII chord of a modal tune', () => {
            const names = chordScaleNamesFor('Ebm7', 3, { tonic: 'D', type: 'dorian' });
            assert.ok(names[0].startsWith('Eb '), names[0]);
        });
    });

    describe('scale matching wrapper passes the key through', () => {
        it('findTop3MatchingScales accepts a key context', () => {
            const names = findTop3MatchingScales([], true, { symbol: 'Bm7b5', notes: ['B3', 'D4', 'F4', 'A4'] }, major('C', 'diatonic'));
            assert.equal(names[0], 'B locrian');
        });

        it('fillMissingScales fills blanks in the key', () => {
            const config = { chord: 'G7', chordNotes: ['G3', 'B3', 'D4', 'F4'], scale1: '', scale2: '', scale3: '' };
            fillMissingScales(config, {}, minor('C'));
            assert.equal(config.scale1, 'G phrygian dominant');
        });
    });

    describe('scaleAnnotation for the chord/scale grid', () => {
        it('flags out-of-key notes and jazz colour scales', () => {
            const annotation = scaleAnnotation('Am7', 'A dorian', major('C', 'jazz'));
            assert.ok(annotation.outOfKey.includes('F#'), JSON.stringify(annotation));
            assert.equal(annotation.colour, 'jazz');
        });

        it('leaves in-key diatonic scales unlabelled', () => {
            const annotation = scaleAnnotation('Am7', 'A aeolian', major('C', 'diatonic'));
            assert.deepEqual(annotation.outOfKey, []);
            assert.equal(annotation.colour, null);
        });

        it('labels adventurous colour scales', () => {
            const annotation = scaleAnnotation('Cmaj7', 'C lydian', major('C', 'adventurous'));
            assert.equal(annotation.colour, 'adventurous');
        });
    });

    describe('checkScaleAgainstChord with a key', () => {
        it('reports out-of-key colour notes without failing the scale', () => {
            const result = checkScaleAgainstChord('Cmaj7', 'C lydian', major('C'));
            assert.equal(result.ok, true);
            assert.ok(result.outOfKey.includes('F#'), JSON.stringify(result.outOfKey));
        });

        it('reports no out-of-key notes for a diatonic scale', () => {
            const result = checkScaleAgainstChord('Dm7', 'D dorian', major('C'));
            assert.equal(result.ok, true);
            assert.deepEqual(result.outOfKey, []);
        });

        it('does not report chord tones that are outside the key', () => {
            // D7 is V/V in C major: its F# is outside the key but is a chord
            // tone, so it is licensed and not reported.
            const result = checkScaleAgainstChord('D7', 'D mixolydian', major('C'));
            assert.deepEqual(result.outOfKey, []);
        });
    });

});
