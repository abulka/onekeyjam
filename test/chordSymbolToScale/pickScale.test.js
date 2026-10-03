import assert from 'assert';
import { chordSymbolToScaleName } from '../../src/lib/chord-to-scale.js';

/*
 * These expectations come from the general chord-scale engine in
 * src/lib/chordScaleEngine.js. See doco/MUSIC-THEORY.md for the reasoning
 * behind each choice.
 */

describe('chordSymbolToScaleName', () => {

    it('Major chords - plain', () => {
        const chord = 'CM';
        assert.equal('C major', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 3))
    });

    it('Major 7 chords', () => {
        const chord = 'Cmaj7';
        assert.equal('C major', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C harmonic major', chordSymbolToScaleName(chord, 3))
    });

    it('Major 9 chords', () => {
        // quality: 'Major', type: 'major ninth'
        const chord = 'Cmaj9';
        assert.equal('C major', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C harmonic major', chordSymbolToScaleName(chord, 3))
    });

    it('Major 9 #11th chords', () => {
        // The #11 rules out the plain major scale, so lydian is the parent scale.
        const chord = 'Cmaj9#11';
        assert.equal('C lydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C major', chordSymbolToScaleName(chord, 2))
        assert.equal('C lydian augmented', chordSymbolToScaleName(chord, 3))
    });

    it('Major 13th chords', () => {
        // quality: 'Major', type: 'major thirteenth'
        const chord = 'Cmaj13';
        assert.equal('C major', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop major', chordSymbolToScaleName(chord, 3))
    });

    // Major - Dominant

    it('Dominant - C7 chord', () => {
        // quality: 'Major' type: 'dominant seventh'
        const chord = 'C7'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian dominant', chordSymbolToScaleName(chord, 2))
        assert.equal('C mixolydian b6', chordSymbolToScaleName(chord, 3))
    });

    it('Dominant - C9 chord', () => {
        // quality: 'Major' type: 'dominant ninth'
        const chord = 'C9'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian dominant', chordSymbolToScaleName(chord, 2))
        assert.equal('C mixolydian b6', chordSymbolToScaleName(chord, 3))
    });

    it('Dominant - C11 chord', () => {
        // Tonal reads C11 as a sus chord without a third, hence the sus choices
        const chord = 'C11'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C aeolian', chordSymbolToScaleName(chord, 2))
        assert.equal('C dorian', chordSymbolToScaleName(chord, 3))
    });

    it('Dominant - C9#11 chord', () => {
        const chord = 'C9#11'
        assert.equal('C lydian dominant', chordSymbolToScaleName(chord, 1))
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C mixolydian b6', chordSymbolToScaleName(chord, 3))
    });

    it('Dominant - C13 chord', () => {
        const chord = 'C13'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian dominant', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop minor', chordSymbolToScaleName(chord, 3))
    });

    // Majors with #5

    it('maj7 #5 chords', () => {
        // quality: 'Augmented', type: 'augmented seventh'
        const chord = 'Cmaj7#5'
        assert.equal('C lydian augmented', chordSymbolToScaleName(chord, 1))
        assert.equal('C augmented', chordSymbolToScaleName(chord, 2))
        assert.equal('C major augmented', chordSymbolToScaleName(chord, 3))
    });

    it('maj9 #5 chords', () => {
        // quality: 'Augmented', type: ''
        const chord = 'Cmaj9#5'
        assert.equal('C lydian augmented', chordSymbolToScaleName(chord, 1))
        assert.equal('C major augmented', chordSymbolToScaleName(chord, 2))
        assert.equal('C harmonic major', chordSymbolToScaleName(chord, 3))
    });

    // 6th chords

    it('C6 chord', () => {
        // quality: 'Major' type: 'sixth'
        const chord = 'C6'
        assert.equal('C major', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C major pentatonic', chordSymbolToScaleName(chord, 3))
    });

    // Minor

    it('minor 7 chords', () => {
        // quality: 'Minor', type: 'minor seventh'
        const chord = 'C min7'
        assert.equal('C dorian', chordSymbolToScaleName(chord, 1))
        assert.equal('C aeolian', chordSymbolToScaleName(chord, 2))
        assert.equal('C minor pentatonic', chordSymbolToScaleName(chord, 3))
    });

    it('minor chord, but with a major 7th', () => {
        const chord = 'C m/ma7'
        assert.equal('C melodic minor', chordSymbolToScaleName(chord, 1))
        assert.equal('C harmonic minor', chordSymbolToScaleName(chord, 2))
        assert.equal('C augmented', chordSymbolToScaleName(chord, 3))
    });

    // Minor 6th chords

    it('minor 6 chord', () => {
        // type: 'minor sixth'
        const chord = 'Cm6'
        assert.equal('C melodic minor', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian', chordSymbolToScaleName(chord, 2))
        assert.equal('C major blues', chordSymbolToScaleName(chord, 3))
    });

    it('minor 6/9 chord', () => {
        // type: ''
        const chord = 'Cm69'
        assert.equal('C melodic minor', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian', chordSymbolToScaleName(chord, 2))
        assert.equal('C major blues', chordSymbolToScaleName(chord, 3))
    });

    // Minor 9th chords

    it('minor 9 chord', () => {
        // type: 'minor ninth', quality: 'Minor'
        const chord = 'Cm9'
        assert.equal('C dorian', chordSymbolToScaleName(chord, 1))
        assert.equal('C aeolian', chordSymbolToScaleName(chord, 2))
        assert.equal('C dorian #4', chordSymbolToScaleName(chord, 3))
    });

    // Minor with #5

    it('m#5 chords', () => {
        // quality: 'Augmented', type: 'minor augmented'
        const chord = 'Cm#5'
        assert.equal('C aeolian', chordSymbolToScaleName(chord, 1))
        assert.equal('C locrian #2', chordSymbolToScaleName(chord, 2))
        assert.equal('C harmonic minor', chordSymbolToScaleName(chord, 3))
    });

    it('m#5 chords - C#m#5', () => {
        const chord = 'C#m#5'
        assert.equal('C# aeolian', chordSymbolToScaleName(chord, 1))
        assert.equal('C# locrian #2', chordSymbolToScaleName(chord, 2))
        assert.equal('C# harmonic minor', chordSymbolToScaleName(chord, 3))
    });

    // Altered

    it('Altered/Augmented - C7(#9#5) chord', () => {
        // The altered scale is the melodic minor a semitone up, rooted here on C
        const chord = 'C7#5#9'
        assert.equal('C altered', chordSymbolToScaleName(chord, 1))
        assert.equal('C whole tone', chordSymbolToScaleName(chord, 2))
        assert.equal('C phrygian dominant', chordSymbolToScaleName(chord, 3))
    });

    it('Altered CMaj7b5 - chord', () => {
        // Lydian is the parent scale since its #4 is enharmonically the b5
        const chord = 'CM7b5'
        assert.equal('C lydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian augmented', chordSymbolToScaleName(chord, 2))
        assert.equal('C major', chordSymbolToScaleName(chord, 3))
    });

    // Diminished

    it('Diminished - C diminished seventh - chord', () => {
        // The whole-half diminished scale is the parent for a dim7 chord
        const chord = 'Cdim7'
        assert.equal('C diminished', chordSymbolToScaleName(chord, 1))
        assert.equal('C half-whole diminished', chordSymbolToScaleName(chord, 2))
        assert.equal('C ultralocrian', chordSymbolToScaleName(chord, 3))
    });

    it('Diminished - Tricky Cmin7b5 - C half-diminished', () => {
        // Locrian #2 is the modern jazz choice, locrian the diatonic one
        const chord = 'Cm7b5'
        assert.equal('C locrian #2', chordSymbolToScaleName(chord, 1))
        assert.equal('C locrian', chordSymbolToScaleName(chord, 2))
        assert.equal('C minor blues', chordSymbolToScaleName(chord, 3))
    });

    it('Diminished - Tricky C min9(b5) - a half diminished 9 chord - beautiful in jazz', () => {
        const chord = 'Cm9b5'
        assert.equal('C locrian #2', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian #4', chordSymbolToScaleName(chord, 2))
        assert.equal('C locrian', chordSymbolToScaleName(chord, 3))
    });

    // Sus Chords

    it('Sus Chords - C13sus - pretty chord', () => {
        const chord = 'C13sus4'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop', chordSymbolToScaleName(chord, 3))
    });

    // Add 2

    it('Add 2 - same as add 9', () => {
        const chord = 'Cadd2'
        assert.equal('C major', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 3))
    });

});
