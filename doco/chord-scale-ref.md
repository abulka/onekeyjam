
# Tonaljs Lookups

## ChordType.names

```js
console.log('Possible ChordType Names', Tonal.ChordType.names())

['fifth', 'suspended fourth', 'suspended fourth seventh',
'augmented', 'major seventh flat sixth', 'augmented seventh', 'major',
'major seventh', 'dominant seventh', 'sixth', 'major seventh sharp
eleventh', 'lydian dominant seventh', 'minor augmented', 'minor',
'minor/major seventh', 'minor seventh', 'minor sixth', 'diminished',
'half-diminished', 'diminished seventh', 'dominant sharp ninth',
'suspended second', 'eleventh', 'major ninth', 'dominant ninth',
'sixth/ninth', 'major thirteenth', 'dominant thirteenth', 'major sharp
eleventh (lydian)', 'minor/major ninth', 'minor ninth', 'minor
thirteenth', 'minor eleventh', 'suspended fourth flat ninth', 'altered',
'dominant flat ninth']
```

## ChordType.symbols

Note that there are additional symbol names which are not
listed here, which are 'aliases'. E.g. add2 is the same as add9
yet add9 is listed here but add2 is not. So there are a lot of 
aliases in Tonaljs to discover and list. E.g.

    cadd9 aliases are: [ 'Madd9', '2', 'add9', 'add2' ]

> The use of space is critical sometimes. E.g. 'C 2' is an alias
for 'Cadd9' yet missing the space and writing 'C2' is interpreted
as a major chord with 2 in the octave - be careful!

```js
import * as Tonal from "@tonaljs/tonal";
Tonal.ChordType.symbols().sort().forEach(chordSymbol => {
    console.log(chordSymbol)
});
```

This listing also lists all the aliases

```
'+add#9'
'11'
'11b9'
'13'
'13#11', '13+4', '13#4'
'13#9'
'13#9#11'
'13b5'
'13b9'
'13b9#11'
'13no5'
'13sus4', '13sus'
'4', 'quartal'
'5'
'6', 'add6', 'add13', 'M6'
'6/9', '69', 'M69'
'69#11'
'7', 'dom'
'7#11', '7#4'
'7#11b13', '7b5b13'
'7#5', '+7', '7+', '7aug', 'aug7'
'7#5#9', '7#9#5', '7alt'
'7#5b9', '7b9#5'
'7#5b9#11'
'7#5sus4'
'7#9'
'7#9#11', '7b5#9', '7#9b5'
'7#9#11b13'
'7#9b13'
'7add6', '67', '7add13'
'7b13'
'7b5'
'7b6'
'7b9'
'7b9#11', '7b5b9', '7b9b5'
'7b9#9'
'7b9b13'
'7b9b13#11', '7b9#11b13', '7b5b9b13'
'7no5'
'7sus4', '7sus'
'7sus4b9b13', '7b9b13sus4'
'9'
'9#11', '9+4', '9#4'
'9#11b13', '9b5b13'
'9#5', '9+'
'9#5#11'
'9b13'
'9b5'
'9no5'
'9sus4', '9sus'
'M', '^', ''
'M#5add9', '+add9'
'M13#11', 'maj13#11', 'M13+4', 'M13#4'
'M6#11', 'M6b5', '6#11', '6b5'
'M7#5sus4'
'M7add13'
'M7b5'
'M7b6', '^7b6'
'M7b9'
'M7sus4'
'M9#5sus4'
'M9b5'
'M9sus4'
'Madd9', '2', 'add9', 'add2'
'Maddb9'
'Mb5'
'alt7'
'aug', '+', '+5', '^#5'
'9sus4', '9sus'
'dim', '°', 'o'
'dim7', '°7', 'o7'
'm', 'min', '-'
'm#5', '-#5', 'm+'
'm/ma7', 'm/maj7', 'mM7',   'mMaj7', 'm/M7',  '-Δ7', 'mΔ', '-^7'
'm11', '-11'
'm11A'
'm13', '-13'
'm6', '-6'
'm69', '-69'
'm7', 'min7', 'mi7', '-7'
'm7#5'
'm7add11', 'm7add4'
'm7b5', 'ø', '-7b5', 'h7', 'h'
'm9', '-9'
'm9#5'
'm9b5'
'mM9', 'mMaj9', '-^9'
'mMaj7b6'
'mMaj9b6'
'madd4'
'madd9'
'maj#4', 'Δ#4', 'Δ#11', 'M7#11', '^7#11', 'maj7#11'
'maj13', 'Maj13', '^13'
'maj7', 'Δ', 'ma7', 'M7', 'Maj7', '^7'
'maj7#5', 'maj7+5', '+maj7', '^7#5'
'maj7#9#11'
'maj9', 'Δ9', '^9'
'maj9#11', 'Δ9#11', '^9#11'
'maj9#5', 'Maj9#5'
'mb6M7'
'mb6b9'
'o7M7'
'oM7'
'sus2'
'sus24', 'sus4add9'
'sus4', 'sus'
```

P.S. ChordType.all via `console.log('Possible ChordType.all()', Tonal.ChordType.all())` - NOT INTERESTING

## ScaleType.names

> Note 'natural minor' scale is 'aeolian'

```js
console.log('Possible Scale Names', Tonal.ScaleType.names())

['major pentatonic', 'ionian pentatonic', 'mixolydian pentatonic',
'ritusen', 'egyptian', 'neopolitan major pentatonic', 'vietnamese 1',
'pelog', 'kumoijoshi', 'hirajoshi', 'iwato', 'in-sen', 'lydian
pentatonic', 'malkos raga', 'locrian pentatonic', 'minor pentatonic',
'minor six pentatonic', 'flat three pentatonic', 'flat six pentatonic',
'scriabin', 'whole tone pentatonic', 'lydian #5P pentatonic', 'lydian
dominant pentatonic', 'minor #7M pentatonic', 'super locrian
pentatonic', 'minor hexatonic', 'augmented', 'major blues', 'piongio',
'prometheus neopolitan', 'prometheus', 'mystery #1', 'six tone
symmetric', 'whole tone', "messiaen's mode #5", 'minor blues', 'locrian
major', 'double harmonic lydian', 'harmonic minor', 'altered', 'locrian
#2', 'mixolydian b6', 'lydian dominant', 'lydian', 'lydian augmented',
'dorian b2', 'melodic minor', 'locrian', 'ultralocrian', 'locrian 6',
'augmented heptatonic', 'dorian #4', 'lydian diminished', 'phrygian',
'leading whole tone', 'lydian minor', 'phrygian dominant', 'balinese',
'neopolitan major', 'aeolian', 'harmonic major', 'double harmonic
major', 'dorian', 'hungarian minor', 'hungarian major', 'oriental',
'flamenco', 'todi raga', 'mixolydian', 'persian', 'major', 'enigmatic',
'major augmented', 'lydian #9', "messiaen's mode #4", 'purvi raga',
'spanish heptatonic', 'bebop', 'bebop minor', 'bebop major', 'bebop
locrian', 'minor bebop', 'diminished', 'ichikosucho', 'minor six
diminished', 'half-whole diminished', 'kafi raga', "messiaen's mode #6",
'composite blues', "messiaen's mode #3", "messiaen's mode #7",
'chromatic']
```

Note: `Tonal.Chord.chordScales(chordSymbol)` returns an array of above possibilities.

# Tonal.Chord.get

Example Chord object
```js
{
    empty: false,                   <---- interesting
    name: 'E minor augmented',
    setNum: 2312,
    chroma: '100100001000',
    normalized: '100001000100',
    intervals: [ '1P', '3m', '5A' ],
    quality: 'Augmented',           <---- interesting
    aliases: [ 'm#5', '-#5', 'm+' ],
    symbol: 'Em#5',                 <---- interesting
    type: 'minor augmented',        <---- interesting
    root: '',
    rootDegree: 0,
    tonic: 'E',
    notes: [ 'E', 'G', 'B#' ]       <---- interesting
}
```

# Tonal Scales vs Chords

Chord symbols are different to Scale names.

    - Chord symbols like Cm need to be converted into Scales like "c minor"
    - Chord symbols like CM need to be converted into Scales like "c major"
 
Tonal can detects chord notes into Chord symbol strings.

CLARIFY THIS MESS OF THOUGHTS: but does not currently support convert Chord symbol into a proper Tonal Chord object using using Chord.get() probably one notation, and defines scales using another. there is a bug in tonal.
  
# Tonal Chord Detect

https://github.com/tonaljs/tonal/issues/36

The tonal.scale.detect function. What it does: given a collection of
notes, it tells you what scales have exactly that notes. For example "C
Eb G" is not a scale (is a chord) so results are []. Notes
"C,Eb,G,A#,C##,E#,F,Ab,C" are exactly A minor and all its modes.

I think the results of your test are ok, but that's not what you are
looking for.

If I understand you, you want all the scales that a chord fits in.
Currently, this function is not implemented, but it should not very hard
to do using tonal-pcset and tonal-dictionary. 

## There's no Scale.detect

There's no Scale.detect because, as you said, I think scale detection is
just a matter of find the chroma of the notes and get the scale that
matches.

Chroma - https://en.wikipedia.org/wiki/Chroma_feature
        - https://www.ee.columbia.edu/~dpwe/e4896/lectures/E4896-L11.pdf

## you need to remove the tonic

https://github.com/tonaljs/tonal/issues/115

For example, to go from "Cmaj7" to "Em" you need to remove the tonic. For example:

    - Remove the tonic
    - Map the intervals to make the 3th become tonic (Interval.add)
    - Find the chord in the dictionary (For example, calculating the set chroma)

## how to use chroma

https://github.com/tonaljs/tonal/issues/284




# Some Interesting Internet Chord Rules 

List of Chord-Scale Relationships - https://musictheory.pugetsound.edu/mt21c/HowToDetermineChord-ScaleRelationships.html

    CHORD	CORRESPONDING SCALE(S)
    C	    C major scale or C Lydian scale
    C♯11	C Lydian scale
    C♯5	    C Lydian-Augmented scale
    Cm	    C dorian scale or C natural minor
    Cø	    C locrian scale or C locrian ♯2
    Cø	    C locrian ♯2
    C	    C Octatonic Whole-Half
    Cm	    C melodic minor ascending
    Cm      C Dorian or C melodic minor ascending
    C	    C Mixolydian
    C♯11	C Lydian-Dominant
    C♯5	    C Whole Tone scale
    C♭5	    C Whole Tone scale
    C♭9	    C Octatonic (Half-Whole)
    C♯9	    C Octatonic (Half-Whole)
    C♯11♯9  C Octatonic (Half-Whole)
    Calt	C Diminished-Whole Tone

