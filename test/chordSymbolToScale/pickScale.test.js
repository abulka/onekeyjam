import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { chordSymbolToScaleName } from '../../src/lib/chord-to-scale.js';

describe('chordSymbolToScaleName', () => {

    it('Major chords - plain', () => {
        const chord = 'CM';
        assert.equal('C lydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C major', chordSymbolToScaleName(chord, 2))
        assert.equal('C major pentatonic', chordSymbolToScaleName(chord, 3))
    });

    it('Major 7 chords', () => {
        const chord = 'Cmaj7';
        assert.equal('C lydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C major', chordSymbolToScaleName(chord, 2))
        assert.equal('C lydian pentatonic', chordSymbolToScaleName(chord, 3)) // no plain 'C major pentatonic'
    });

    it('Major 9 chords', () => {
        // quality: 'Major', type: 'major ninth'
        const chord = 'Cmaj9';
        assert.equal('C lydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C major', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop major', chordSymbolToScaleName(chord, 3))
    });

    it('Major 9 #11th chords', () => {
        // tonal says quality is 'Major', type is 'major sharp eleventh (lydian)'
        //  Eliminates C major scale cos F# not compatible with F of the C major scale. Thus need to use Lydian scale. 
        const chord = 'Cmaj9#11';
        assert.equal('C lydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C ichikosucho', chordSymbolToScaleName(chord, 2))
        assert.equal("C messiaen's mode #3", chordSymbolToScaleName(chord, 3))
    });

    it('Major 13th chords', () => {
        // tonal says quality is 'Major', type is 'major thirteenth'
        const chord = 'Cmaj13';
        assert.equal('C lydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C major', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop', chordSymbolToScaleName(chord, 3))
    });

    // it('Major 11th chords', () => {
    //     // Dominant 11th chords - THERE DOESN'T SEEM TO BE A Cmaj11 in Tonal nor in Korg
    //     // no this is for C11 not Cmaj11
    //     assert.equal('C mixolydian', chordSymbolToScaleName('C11', 1))
    //     assert.equal('C mixolydian b6', chordSymbolToScaleName('C11', 2))
    //     assert.equal('C bebop', chordSymbolToScaleName('C11', 3))
    // });

    // it('maj #5 chords', () => {  I don't think a plain maj #5 exists
    //     const chord = 'CM#5'
    //     assert.equal('C lydian augmented', chordSymbolToScaleName(chord, 1))
    //     assert.equal('C lydian #5P pentatonic', chordSymbolToScaleName(chord, 2))
    //     assert.equal('C augmented', chordSymbolToScaleName(chord, 3))
    // });

    // Major - Dominant

    it('Dominant - C7 chord', () => {
        // tonal says quality: 'Major' type: 'dominant seventh'
        const chord = 'C7'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian dominant', chordSymbolToScaleName(chord, 2))
        assert.equal('C lydian dominant pentatonic', chordSymbolToScaleName(chord, 3))
    });

    it('Dominant - C9 chord', () => {
        // tonal says quality: 'Major' type: 'dominant ninth'
        const chord = 'C9'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian dominant', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop minor', chordSymbolToScaleName(chord, 3))
    });

    it('Dominant - C11 chord', () => {
        // tonal says quality: 'Unknown' type: 'eleventh'
        // mixolydian the same as C9 see also https://www.fretjam.com/soloing-over-extended-chords.html
        // tonal suggests others as variations 2 and 3
        const chord = 'C11'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C mixolydian b6', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop', chordSymbolToScaleName(chord, 3))
    });

    it('Dominant - C9#11 chord', () => {
        // tonal says quality: 'Major' type: ''
        const chord = 'C9#11'
        assert.equal('C lydian dominant', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian minor', chordSymbolToScaleName(chord, 2))
        assert.equal('C composite blues', chordSymbolToScaleName(chord, 3))
    });

    it('Dominant - C13 chord', () => {
        // tonal says quality: 'Major' type: 'dominant thirteenth'
        const chord = 'C13'
        assert.equal('C lydian dominant', chordSymbolToScaleName(chord, 1))
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop', chordSymbolToScaleName(chord, 3))
    });

    
    // Majors with #5 

    it('maj7 #5 chords', () => {
        // tonal says quality is 'Augmented', type is 'augmented seventh'
        const chord = 'Cmaj7#5'
        assert.equal('C lydian augmented', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian #5P pentatonic', chordSymbolToScaleName(chord, 2))
        assert.equal('C augmented', chordSymbolToScaleName(chord, 3))
    });

    it('maj9 #5 chords', () => {
        // tonal says quality is 'Augmented', type is ''
        const chord = 'Cmaj9#5'
        assert.equal('C lydian augmented', chordSymbolToScaleName(chord, 1))
        assert.equal('C leading whole tone', chordSymbolToScaleName(chord, 2))
        assert.equal('C harmonic major', chordSymbolToScaleName(chord, 3))
    });

    // 6th chords

    it('C6 chord', () => {
        // tonal says quality: 'Major' type: 'sixth'
        const chord = 'C6' // viz. '6', 'add6', 'add13', 'M6'
        assert.equal('C major', chordSymbolToScaleName(chord, 1))
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 2))
        assert.equal('C major pentatonic', chordSymbolToScaleName(chord, 3))
    });

    // Minor

    it('minor 7 chords', () => {
        // tonal says quality is 'Minor', type is 'minor seventh'
        const chord = 'C min7'
        assert.equal('C dorian', chordSymbolToScaleName(chord, 1))
        assert.equal('C minor pentatonic', chordSymbolToScaleName(chord, 2))
        assert.equal('C minor blues', chordSymbolToScaleName(chord, 3))
    });

    it('minor chord, but with a major 7th', () => {
        // tonal says quality is 'Minor', type is '??'
        const chord = 'C m/ma7'
        assert.equal('C melodic minor', chordSymbolToScaleName(chord, 1))
        assert.equal('C minor #7M pentatonic', chordSymbolToScaleName(chord, 2))
        assert.equal('C minor bebop', chordSymbolToScaleName(chord, 3))
    });

    // Minor 6th chords

    it('minor 6 chord', () => {
        // tonal says type: 'minor sixth'
        const chord = 'Cm6'
        assert.equal('C melodic minor', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian', chordSymbolToScaleName(chord, 2))
        assert.equal('C minor six pentatonic', chordSymbolToScaleName(chord, 3))
    });

    it('minor 6/9 chord', () => {
        // tonal says type: ''
        const chord = 'Cm69'
        assert.equal('C melodic minor', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian', chordSymbolToScaleName(chord, 2))
        assert.equal('C minor six diminished', chordSymbolToScaleName(chord, 3))
    });

    // Monor 9th chords  (not sure what is official - what sounds good to me is the dorian)

    it('minor 9 chord', () => {
        // tonal says type: 'minor ninth', quality: 'Minor'
        const chord = 'Cm9'
        assert.equal('C dorian', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian #4', chordSymbolToScaleName(chord, 2))
        assert.equal('C bebop minor', chordSymbolToScaleName(chord, 3))
    });

    // Minor with #5 

    it('m#5 chords', () => {
        // tonal says quality is 'Augmented', type is 'minor augmented'
        const chord = 'Cm#5'
        assert.equal('C harmonic minor', chordSymbolToScaleName(chord, 1))
        assert.equal('C phrygian', chordSymbolToScaleName(chord, 2))
        assert.equal('C aeolian', chordSymbolToScaleName(chord, 3))
    });

    it('m#5 chords - C#m#5', () => {
        // tonal says quality is 'Augmented', type is 'minor augmented'
        const chord = 'C#m#5'
        assert.equal('C# harmonic minor', chordSymbolToScaleName(chord, 1))
        assert.equal('C# phrygian', chordSymbolToScaleName(chord, 2))
        assert.equal('C# aeolian', chordSymbolToScaleName(chord, 3))
    });

    // Altered

    it('Altered/Augmented - C7(#9#5) chord', () => {
        // tonal says quality: 'Augmented' type: ''

        // youtube video advice: Use Altered scale C C# Eb E F# G# Bb C which is
        // the melodic minor scale a half step up from the root of the chord -
        // see 9:29 in video. E.g Db melodic minor scale if you want C Altered. 
        const chord = 'C7#5#9'
        assert.equal('C altered', chordSymbolToScaleName(chord, 1))
        assert.equal('C spanish heptatonic', chordSymbolToScaleName(chord, 2))
        assert.equal("C messiaen's mode #3", chordSymbolToScaleName(chord, 3))
    });

    it('Altered CMaj7b5 - chord', () => {
        // tonal says quality: 'Major' type: '' 

        // youtube video advice: You can also use use Half-Whole Diminished
        // Scale for altered chords.  Tonal C half-whole diminished
        const chord = 'CM7b5'
        assert.equal('C half-whole diminished', chordSymbolToScaleName(chord, 1))
        assert.equal('C lydian pentatonic', chordSymbolToScaleName(chord, 2))
        assert.equal("C leading whole tone", chordSymbolToScaleName(chord, 3))
    });

    // Diminished

    it('Diminished - C diminished seventh - chord', () => {
        // tonal says quality: 'Diminished' type: 'diminished seventh' 
        const chord = 'Cdim7'
        assert.equal('C half-whole diminished', chordSymbolToScaleName(chord, 1))
        assert.equal('D half-whole diminished', chordSymbolToScaleName(chord, 2))
        assert.equal("C ultralocrian", chordSymbolToScaleName(chord, 3))
    });

    it('Diminished - Tricky Cmin7b5 - C half-diminished', () => {
        // tonal says quality: 'Diminished' type: 'half-diminished' 
        // 'C locrian' is the probably the same as "Db major"?
        const chord = 'Cm7b5'
        assert.equal('C locrian', chordSymbolToScaleName(chord, 1))
        assert.equal('C locrian pentatonic', chordSymbolToScaleName(chord, 2))
        assert.equal("C super locrian pentatonic", chordSymbolToScaleName(chord, 3))
    });

    it('Diminished - Tricky C min9(b5) - a half diminished 9 chord - beautiful in jazz', () => {
        // tonal says quality: 'Diminished' type: '' 
        const chord = 'Cm9b5'
        assert.equal('C locrian #2', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian #4', chordSymbolToScaleName(chord, 2))
        assert.equal("C composite blues", chordSymbolToScaleName(chord, 3))
    });

    // Sus Chords

    it('Sus Chords - C13sus - pretty chord', () => {
        // tonal says quality: 'Unknown' type: '' 
        const chord = 'C13sus4'
        assert.equal('C mixolydian', chordSymbolToScaleName(chord, 1))
        assert.equal('C dorian', chordSymbolToScaleName(chord, 2))
        assert.equal("C bebop", chordSymbolToScaleName(chord, 3))
    });

    // Add 2

    it('Add 2 - same as add 9', () => {
        // tonal says quality: 'Major' type: ''
        // normally would be lydian/major/major pentatonic

        // P.S. From the point of view of interpreting Cadd2 as Cadd9 then its
        // - not a C9 type: 'dominant ninth'
        // - not a Cmaj9 type: 'major ninth'
        // - is  a Cadd9 type: ''      <---- we are here

        const chord = 'Cadd2'
        assert.equal("C lydian", chordSymbolToScaleName(chord, 1))
        assert.equal('C major', chordSymbolToScaleName(chord, 2))
        assert.equal('C half-whole diminished', chordSymbolToScaleName(chord, 3))
    });


});
