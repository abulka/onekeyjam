import { Chord } from "@tonaljs/tonal";
import { transpose } from "@tonaljs/note";
import * as Tonal from "@tonaljs/tonal";
import { removeBassSlash } from "./removeBassSlash.js";

export function chordSymbolToScaleNames(chordSymbol) {
    let chordObj = convertToChordObj(chordSymbol);
    if (chordObj.empty)
        return [];
    let chordScales = Chord.chordScales(chordObj.symbol)  // Get all scale types where the given chord fits
    return chordScales
}

export function chordSymbolToScaleName(chordSymbol, variation = 1) {
    let chordObj = convertToChordObj(chordSymbol);
    if (chordObj.empty)
        return '';
    const result = recommendedScaleName(chordObj, variation)
    return result
}

function convertToChordObj(chordSymbol) {
    // Get rid of confusing '/' in the symbol as it break the recognition
    let [symbol] = removeBassSlash(chordSymbol);

    let chordObj = Chord.get(symbol); // analyse the chord symbol properly
    if (chordObj.empty)
        console.warn(`convertToChordObj: '${symbol}' is not a valid Tonal chord symbol`);
    return chordObj;
}

function recommendedScaleName(chordObj, variation) {
    let result = ''
    let chordScales = Chord.chordScales(chordObj.symbol)  // get array of scale names that the chord fits in
    // console.log('chordObj', chordObj, chordScales)  // <-- great debugging tool

    if (chordObj.quality === 'Diminished') {
        let preferredScales

        if (chordObj.type == 'diminished seventh') {  // 'Cdim7'
            preferredScales = [  // tonal will suggest these, I sorted them
                'half-whole diminished',  // should be D not C
                '*skipped and manually overridden in code below',
                'ultralocrian',
                'locrian 6',
                'dorian #4',
                'lydian diminished',
                'hungarian major',
                'lydian #9',
                'diminished',
                'composite blues',
                "messiaen's mode #7",
                'chromatic'
            ]

            // youtube video advice: Use Whole-Half Diminished Scale  C D Eb F Gb G#
            // A B  doesn’t exist in Tonal? so use the equivalent Half-whole a tone
            // higher viz. D 12:14 video confirms its the same as  D diminished
            // (halftone - wholetone) D Eb F Gb Ab A B C online

            // C dim7 - diminished chord, No C whole-half diminished scale (in
            // Tonal) so use equivalent D half-whole diminished.

            // YET tonal does suggest the C whole-half diminished scale,
            // NOT the D half-whole diminished scale.

            // for now give both the C and D 'half-whole diminished'
            if (variation == 2) {
                const twoSemitones = Tonal.Interval.fromSemitones(2);
                const tonic2 = transpose(chordObj.tonic, twoSemitones);

                result = `${tonic2} half-whole diminished`
                return result;
            }
        }
        else if (chordObj.type == 'half-diminished') {  // 'Cm7b5'
            preferredScales = [  // tonal will suggest these, I sorted them
                'locrian',  // note: 'C locrian' is exactly the same as 'Db major'
                'locrian pentatonic',
                'super locrian pentatonic',
                'minor blues',
                'altered',
                'locrian #2',
                'locrian 6',
                'dorian #4',
                'hungarian major',
                'flamenco',
                'bebop locrian',
                'half-whole diminished',
                'composite blues',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == '' &&
            chordObj.symbol.includes('m9b5')) {  // 'Cm9b5'
            preferredScales = [  // tonal will suggest these, I sorted them
                'locrian #2',
                'dorian #4',
                'composite blues',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else {
            return _getFallbackScale('Unexpected Diminished chord', chordObj, chordScales, variation)
        }
        result = `${chordObj.tonic} ${preferredScales[variation - 1]}`
        return result;
    }

    if (chordObj.quality === 'Augmented') {
        let preferredScales

        if (chordObj.type == 'augmented seventh') {  // 'Cmaj7#5'
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian augmented',
                'lydian #5P pentatonic',
                'augmented',
                'double harmonic lydian',
                'augmented heptatonic',
                'leading whole tone',
                'harmonic major',
                'double harmonic major',
                'persian',
                'enigmatic',
                'major augmented',
                'purvi raga',
                'bebop major',
                "messiaen's mode #6",
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == 'minor augmented') {  // 'Cm#5'
            /*
            Note: C#m#5 [C# E A] sounds good with 
              E natural minor or E dorian perhaps.  
              
            Website scales-chords.com suggests those notes go with
              https://www.scales-chords.com/fscale_res_en.php?rn1=C%23%2FDb&rn2=E&rn3=A&rn4=&rn5=&rn6=&rn7=&rn8=&rn9=&c1=&t1=&c2=&t2=&c3=&t3=&normal=1&greek=1
      
            Website scales-chords.com says the chords related to C#m#5 are
              A   A/E   A/Db   A/C#   Dbm#5   Dbm#5/A   C#m#5/E   C#m#5/A   Dbm#5/E  
            */
            preferredScales = [  // tonal will suggest these, I sorted them

                // www.scales-chords.com agrees with tonal on these
                'harmonic minor',
                //'natural minor', // tonal doesn't suggest this?!
                'phrygian',
                'aeolian',
                'locrian',
                'diminished',
                'augmented',

                // tonal also suggests
                'minor bebop',
                'vietnamese 1',
                'pelog',
                'hirajoshi',
                'malkos raga',
                'altered',
                'locrian #2',
                'ultralocrian',
                'augmented heptatonic',
                'balinese',
                'hungarian minor',
                'todi raga',
                'spanish heptatonic',
                'bebop locrian',
                'minor six diminished',
                "messiaen's mode #3",
                "messiaen's mode #7",
                'chromatic'
            ]
        }
        else if (chordObj.type == '' &&
            chordObj.symbol.includes('9#5') &&
            !chordObj.symbol.includes('#9#5')
        ) {  // 'Cmaj9#5'
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian augmented',
                'leading whole tone',
                'harmonic major',
                'major augmented',
                'bebop major',
                "messiaen's mode #6",
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == '' &&
            chordObj.symbol.includes('#9#5') ||
            chordObj.symbol.includes('#5#9')
        ) {  // 'C7#5#9'
            /*
            Use Altered scale C C# Eb E F# G# Bb C which is the melodic minor scale a
            half step up from the root of the chord - see 9:29 in video. E.g Db
            melodic minor scale if you want C Altered. 
            */
            preferredScales = [  // tonal will suggest these, I sorted them
                'altered',
                'spanish heptatonic',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else {
            return _getFallbackScale('Unexpected Augmented chord', chordObj, chordScales, variation)
        }
        result = `${chordObj.tonic} ${preferredScales[variation - 1]}`
        return result;
    }

    if (chordObj.quality === 'Unknown') {
        let preferredScales
        if (chordObj.type == 'eleventh') { // 'C11'
            // https://www.fretjam.com/soloing-over-extended-chords.html
            preferredScales = [  // tonal will suggest these, I sorted them
                'mixolydian',
                'mixolydian b6',
                'bebop',
                'piongio',
                'aeolian',
                'dorian',
                'bebop minor',
                'minor bebop',
                'composite blues',
                'chromatic'
            ]
        }
        else if (chordObj.type == '' &&
            chordObj.symbol.includes('13sus4')) {
            preferredScales = [  // tonal will suggest these, I sorted them
                'mixolydian',
                'dorian',
                'bebop',
                'bebop minor',
                'composite blues',
                'chromatic'
            ]
        }
        else {
            return _getFallbackScale('Unexpected Unknown chord', chordObj, chordScales, variation)
        }
        result = `${chordObj.tonic} ${preferredScales[variation - 1]}`
        return result;
    }

    if (chordObj.quality === 'Minor') {
        let preferredScales = chordScales  // default to tonal's suggestions

        if (chordObj.type == 'minor seventh') {
            preferredScales = [  // tonal will suggest these, I sorted them
                'dorian',
                'minor pentatonic',
                'minor blues',
                'dorian b2', 'dorian #4',
                'phrygian', 'aeolian',
                'hungarian major',
                'flamenco', 'spanish heptatonic',
                'bebop minor', 'bebop locrian',
                'minor bebop', 'half-whole diminished',
                'kafi raga', 'composite blues',
                "messiaen's mode #3", 'chromatic'
            ]
        }
        else if (chordObj.type == 'minor/major seventh') {
            preferredScales = [  // tonal will suggest these, I sorted them
                'melodic minor',
                'minor #7M pentatonic',
                'minor bebop',
                'minor hexatonic',
                'augmented', 'harmonic minor',
                'augmented heptatonic',
                'lydian diminished', 'balinese',
                'neopolitan major', 'hungarian minor',
                'todi raga', 'lydian #9',
                'minor six diminished',
                'kafi raga', "messiaen's mode #3",
                "messiaen's mode #7", 'chromatic'
            ]
        }
        else if (chordObj.type == 'minor sixth') {
            preferredScales = [  // tonal will suggest these, I sorted them
                'melodic minor',
                'dorian',
                'minor six pentatonic',
                'flat three pentatonic',
                'major blues', 'dorian b2',
                'dorian #4',
                'lydian diminished', 'neopolitan major',
                'hungarian major',
                'lydian #9', 'bebop minor',
                'minor six diminished', 'half-whole diminished',
                'kafi raga', 'composite blues',
                "messiaen's mode #7", 'chromatic'
            ]
        }
        else if (chordObj.type == 'minor ninth') {
            preferredScales = [  // tonal will suggest these, I sorted them
                'dorian',  // sounds the best to me
                'dorian #4',
                'bebop minor',
                'aeolian',  // its ok I suppose
                'minor bebop',
                'composite blues',  // I don't like this one
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == '' && chordObj.symbol.includes('m69')) {
            preferredScales = [  // tonal will suggest these, I sorted them
                'melodic minor',
                'dorian',
                'minor six diminished',
                'major blues',
                'dorian #4',
                'lydian diminished',
                'bebop minor',
                'composite blues',
                "messiaen's mode #7",
                'chromatic']
        }
        else {
            return _getFallbackScale('Unexpected Minor chord', chordObj, chordScales, variation)
        }

        result = `${chordObj.tonic} ${preferredScales[variation - 1]}`
        return result;
    }

    if (chordObj.quality === 'Major') {
        let preferredScales = chordScales  // default to tonal's suggestions

        if (chordObj.type == 'dominant seventh') {
            preferredScales = [  // tonal will suggest these, I sorted them
                'mixolydian',
                'lydian dominant',
                'lydian dominant pentatonic',
                'mixolydian pentatonic',
                'mixolydian b6',
                'lydian minor',
                'phrygian dominant',
                'hungarian major',
                'flamenco',
                'spanish heptatonic',
                'bebop',
                'bebop minor',
                'half-whole diminished',
                'kafi raga',
                'composite blues',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == 'dominant ninth') {  // 'C9'
            preferredScales = [  // tonal will suggest these, I sorted them
                'mixolydian',
                'lydian dominant',
                'bebop minor',
                'mixolydian b6',
                'lydian minor',
                'bebop',
                'composite blues',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == 'sixth') {  // 'C6'
            preferredScales = [  // tonal will suggest these, I sorted them
                'major',
                'mixolydian', // <- I reckon this is ok
                'major pentatonic',
                'lydian dominant',
                'scriabin',
                'major blues',
                'lydian',  // <- I don't like this one
                'hungarian major',
                'lydian #9', 'bebop',
                'bebop minor', 'bebop major',
                'ichikosucho', 'half-whole diminished',
                'kafi raga', 'composite blues',
                'chromatic'
            ]
        }
        else if (chordObj.type == 'major ninth') {  // 'Cmaj9'
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian',
                'major',
                'bebop major',
                'harmonic major',
                'bebop',
                'ichikosucho',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == 'major sharp eleventh (lydian)') {  // 'Cmaj9#11'
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian',
                'ichikosucho',
                "messiaen's mode #3",
                'chromatic']
        }
        else if (chordObj.type == '' && chordObj.symbol.includes('9#11')) {  // 'C9#11'
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian dominant',
                'lydian minor',
                'composite blues',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == '' && chordObj.symbol.includes('7b5')) {  // 'CM7b5'
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian pentatonic',
                'leading whole tone',
                'lydian #5P pentatonic',
                'double harmonic lydian',
                'lydian',
                'lydian augmented',
                'persian',
                'enigmatic',
                'lydian #9',
                'purvi raga',
                'ichikosucho',
                "messiaen's mode #6",
                "messiaen's mode #3",
                'chromatic'
            ]
            // However the youtube video says to use C half-whole diminished
            preferredScales.unshift('half-whole diminished')
        }
        else if (chordObj.type == '' && chordObj.symbol.includes('add2')) {  // 'Cadd2'
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian',
                'major',
                // we insert the half-whole diminished here
                'major pentatonic',
                'flat six pentatonic',
                'major blues', 'mixolydian b6',
                'lydian dominant',
                'lydian minor', 'harmonic major',
                'mixolydian',
                'bebop', 'bebop minor',
                'bebop major', 'ichikosucho',
                'composite blues', "messiaen's mode #3",
                'chromatic'
            ]
            // The youtube video says to use C half-whole diminished in transitions to
            // other chords, so add it as variation 3 (pos 2 in array)
            preferredScales.splice(2, 0, 'half-whole diminished');
        }
        else if (chordObj.type == 'dominant thirteenth') {
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian dominant',
                'mixolydian',
                'bebop',
                'bebop minor',
                'composite blues',
                'chromatic'
            ]
        }
        else if (chordObj.type == 'major thirteenth') {  // 'Cmaj13'
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian',
                'major',
                'bebop',
                'bebop major',
                'ichikosucho',
                'chromatic'
            ]
        }
        else if (chordObj.type == 'dominant ninth' || chordObj.type == 'dominant 13th') {
            // https://www.fretjam.com/soloing-over-extended-chords.html
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian dominant',
                'mixolydian',
                'bebop',
                'mixolydian b6',
                'lydian minor',
                'bebop minor',
                'composite blues',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else if (chordObj.type == '' && chordObj.symbol.includes('#11')) {
            preferredScales = [  // tonal will suggest these, I sorted them
                'lydian dominant',
                'lydian minor',
                'composite blues',
                "messiaen's mode #3",
                'chromatic'
            ]
        }
        else {
            preferredScales = _defaultPreferredMajorScales(chordScales);
        }

        result = `${chordObj.tonic} ${preferredScales[variation - 1]}`
        return result;
    }

    // Fallback - probably never gets here
    result = _getFallbackScale(chordObj, chordScales, variation);
    return result;
}

// Support

function _defaultPreferredMajorScales(chordScales) {
    // console.log('dropping through to generic Major algorithm...')

    // variation 1: lydian scale
    // variation 2: major scale
    // variation 3: major pentatonic scale
    const lydian = chordScales.filter(scale => scale == 'lydian');
    const major = chordScales.filter(scale => scale == 'major');
    const pentatonicMajor = chordScales.filter(scale => scale == 'major pentatonic');
    const pentatonicLydian = chordScales.filter(scale => scale == 'lydian pentatonic');
    const pentatonicOther = chordScales.filter(scale => scale == 'pentatonic');
    const preferredScales = [...lydian, ...major,
    ...pentatonicMajor, ...pentatonicLydian, ...pentatonicOther, ...chordScales];
    return preferredScales;
}

function _getFallbackScale(msg, chordObj, chordScales, variation) {
    // console.warn(`${msg}: quality ${chordObj.quality} type, ${chordObj.type}, symbol ${chordObj.symbol} - falling back to generic algorithm`);

    const minor = chordScales.filter(scale => scale == 'minor');
    const major = chordScales.filter(scale => scale == 'major');
    const pentatonics = chordScales.filter(scale => scale.includes('pentatonic') && scale != 'ionian pentatonic');
    const blues = chordScales.filter(scale => scale.includes('blues'));
    let preferredScales = [...pentatonics, ...blues, ...minor, ...major];
    preferredScales = [...preferredScales, ...chordScales];

    const result = `${chordObj.tonic} ${preferredScales[variation - 1]}`;
    return result;
}

