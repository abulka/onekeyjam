import assert from 'assert';
import {
    chordScaleNamesFor,
    rankScales,
    resolveChord,
    checkScaleAgainstChord,
    compatibleScaleTypesFor,
    chordSymbolVoicingMismatch,
} from '../../src/lib/chordScaleEngine.js';
import { chordSymbolToScaleNames } from '../../src/lib/chord-to-scale.js';

/*
 * Theory tests for the general chord-scale engine. See doco/MUSIC-THEORY.md.
 */

describe('chordScaleEngine - canonical chord scales', () => {

    const expectations = {
        'CM': ['C major', 'C lydian', 'C mixolydian'],
        'Cmaj7': ['C major', 'C lydian'],
        'Cmaj7#11': ['C lydian'],
        'Cm7': ['C dorian', 'C aeolian', 'C minor pentatonic'],
        'Cm9': ['C dorian'],
        'CmMaj7': ['C melodic minor'],
        'Cm7b5': ['C locrian #2', 'C locrian'],
        'Cm9b5': ['C locrian #2'],
        'Cdim7': ['C diminished', 'C half-whole diminished'],
        'C7': ['C mixolydian', 'C lydian dominant'],
        'C9': ['C mixolydian', 'C lydian dominant'],
        'C7alt': ['C altered'],
        'C7b9': ['C phrygian dominant', 'C half-whole diminished'],
        'Cmaj7#5': ['C lydian augmented'],
        'Caug': ['C lydian augmented'],
        'C6': ['C major', 'C lydian'],
        'Cm6': ['C melodic minor', 'C dorian'],
        'C13sus4': ['C mixolydian'],
    };

    for (const [chord, expected] of Object.entries(expectations)) {
        it(`${chord} starts with ${expected.join(', ')}`, () => {
            const names = chordScaleNamesFor(chord, expected.length);
            assert.deepEqual(names, expected);
        });
    }

    it('returns no exotic scale names for the common chords', () => {
        const bannedNames = ['spanish heptatonic', "messiaen's mode #3", 'lydian #9', 'ichikosucho', 'malkos raga', 'egyptian'];
        for (const chord of Object.keys(expectations)) {
            for (const name of chordScaleNamesFor(chord, 3)) {
                assert.ok(!bannedNames.some((banned) => name.endsWith(banned)), `${chord} offered ${name}`);
            }
        }
    });

    it('every suggested scale contains the guide tones of its chord', () => {
        for (const chordSymbol of ['Cm7', 'Cmaj7', 'C7', 'Cm7b5', 'Cdim7', 'CmMaj7']) {
            const chord = resolveChord(chordSymbol);
            const guideTones = chord.intervals.filter((r) => [3, 4, 10, 11].includes(r));
            for (const suggestion of rankScales(chordSymbol, 3)) {
                for (const guideTone of guideTones)
                    assert.ok(suggestion.relSet.has(guideTone), `${chordSymbol}: ${suggestion.name} misses semitone ${guideTone}`);
            }
        }
    });

});

describe('chordScaleEngine - voicings, inversions and root hints', () => {

    it('roots a rootless Dm7b5 voicing on D when the bass says D', () => {
        const names = chordScaleNamesFor({ notes: ['F3', 'Ab3', 'C4', 'D4'], bass: 'D3' }, 1);
        assert.equal(names[0], 'D locrian #2');
    });

    it('roots an Eb6-sounding Cm7 voicing on C when the bass says C', () => {
        const names = chordScaleNamesFor({ notes: ['Eb3', 'G3', 'Bb3', 'C4'], bass: 'C2' }, 1);
        assert.equal(names[0], 'C dorian');
    });

    it('re-roots a rootless dim7 voicing on the hinted dominant root', () => {
        const names = chordScaleNamesFor({ notes: ['F3', 'Ab3', 'B3', 'D4'], bass: 'G3' }, 3);
        assert.ok(names.every((name) => name.startsWith('G ')));
        assert.equal(names[0], 'G phrygian dominant');
    });

    it('keeps the chord symbol when it contains the voiced notes', () => {
        const names = chordScaleNamesFor({ symbol: 'G7#5b9', notes: ['F3', 'Ab3', 'B3', 'Eb4'] }, 1);
        assert.equal(names[0], 'G altered');
    });

    it('prefers the voiced notes when they conflict with the chord symbol', () => {
        // G7alt (Tonal) has no Ab or D, but this voicing sounds a G7b9 with a
        // natural 5th, so the voicing wins and the altered scale is not offered.
        const names = chordScaleNamesFor({ symbol: 'G7alt', notes: ['F3', 'Ab3', 'B3', 'D4'] }, 3);
        assert.ok(!names.includes('G altered'));
        assert.equal(names[0], 'G phrygian dominant');
    });

    it('flags a chord symbol that omits voiced notes', () => {
        const mismatch = chordSymbolVoicingMismatch({ symbol: 'G7alt', notes: ['F3', 'Ab3', 'B3', 'D4'] });
        assert.ok(mismatch);
        assert.equal(mismatch.symbol, 'G7alt');
    });

    it('resolves a rootless Cm(maj9) voicing from a named custom chord', () => {
        const names = chordScaleNamesFor({ symbol: 'CmMaj9ChordNicerVoicing', notes: ['Eb3', 'G3', 'B3', 'D4'] }, 1);
        assert.equal(names[0], 'C melodic minor');
    });

    it('does not mistake a display name for a root hint', () => {
        const names = chordScaleNamesFor({ notes: ['F3', 'Ab3', 'B3', 'Eb4'], name: 'Chord 1 from midi' }, 1);
        assert.ok(names[0].startsWith('F '), names[0]);
    });

    it('resolves custom voicing names through their notes', () => {
        const names = chordScaleNamesFor({ notes: ['F3', 'Ab3', 'C4', 'D4'], bass: 'D3', name: 'Dø7, Dm7b5ChordNicerVoicing' }, 1);
        assert.equal(names[0], 'D locrian #2');
    });

    it('does not trust a custom-name root left over from a transposition', () => {
        // G7inversion2 transposed up a semitone sounds Ab7, but the custom
        // name keeps its old root. The sounding notes must win, otherwise the
        // engine invents a shell-less G chord and offers G harmonic minor.
        const names = chordScaleNamesFor({ symbol: 'G7inversion2*', notes: ['Eb3', 'Gb3', 'Ab3', 'C4'], bass: 'Eb3' }, 3);
        assert.deepEqual(names, ['Ab mixolydian', 'Ab lydian dominant', 'Ab mixolydian b6']);
    });

    it('does not trust a stale slash-chord root when the voicing disagrees', () => {
        // E7/D transposed up a semitone sounds F7; the stale symbol must not
        // make the engine rank scales for an E chord.
        const names = chordScaleNamesFor({ symbol: 'E7/D*', notes: ['F3', 'A3', 'C4', 'Eb4'], bass: 'Eb3' }, 3);
        assert.deepEqual(names, ['F mixolydian', 'F lydian dominant', 'F mixolydian b6']);
    });

    it('does not throw on unrecognised or cluster chords', () => {
        for (const input of ['C69#11', 'G7sus4b9', { notes: ['C4', 'C#4', 'D4'] }])
            assert.doesNotThrow(() => chordScaleNamesFor(input, 3));
    });

});

describe('chordScaleEngine - scale checker', () => {

    it('rejects C major blues over Dm7b5', () => {
        const result = checkScaleAgainstChord('Dm7b5', 'C major blues');
        assert.equal(result.ok, false);
        assert.deepEqual(result.missing, [3, 6]);
    });

    it('accepts the standard melodic minor choices', () => {
        assert.equal(checkScaleAgainstChord('Dm7b5', 'F melodic minor').ok, true);
        assert.equal(checkScaleAgainstChord('G7alt', 'Ab melodic minor').ok, true);
        assert.equal(checkScaleAgainstChord('CmMaj7', 'C melodic minor').ok, true);
    });

    it('rejects C melodic minor over a Cm7 voicing because it misses the b7', () => {
        const result = checkScaleAgainstChord('Cm7', 'C melodic minor');
        assert.equal(result.ok, false);
        assert.deepEqual(result.missing, [10]);
    });

});

describe('chordScaleEngine - API shape', () => {

    it('chordSymbolToScaleNames returns scale types without a tonic', () => {
        const types = chordSymbolToScaleNames('Cm7');
        assert.ok(types.length > 3);
        assert.equal(types[0], 'dorian');
        assert.ok(types.includes('minor pentatonic'));
        assert.ok(types.every((type) => !type.includes('C ')));
    });

    it('compatibleScaleTypesFor ranks the best types first', () => {
        assert.deepEqual(compatibleScaleTypesFor('Cmaj7').slice(0, 2), ['major', 'lydian']);
    });

});
