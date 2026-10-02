/*
 CONFIG
*/
import * as Tonal from "@tonaljs/tonal";

// Wow, ALL these objects are available within a module, even document.
// console.log('window', window)
// console.log('window.document', window.document)
// console.log('document', document)
// console.log('window.Tonal', window.Tonal)
// console.log('Tonal', Tonal)

// document.querySelector('#generalLog').innerHTML += `<i>config loaded</i> <br>`
// document.broadcastEvent('hello', { name: "config loaded, cool" })

// console.log(Tonal.Key.minorKey("Ab"));
// console.log(Tonal.Scale.get("c5 pentatonic"))


// ╔═╗┬ ┬┌─┐┬─┐┌┬┐┌─┐
// ║  ├─┤│ │├┬┘ ││└─┐
// ╚═╝┴ ┴└─┘┴└──┴┘└─┘

export let CM7Chord = [
    'C2',
    'C3',
    'E3',
    'G3',
    'B3'
]

export let Dm11Chord = [
    'D2',
    'D3',
    'F3',
    'A3',
    'C4',
    'E4',
    'G4',
]

export let Em7Chord = [
    'E2',
    'E3',
    'G3',
    'B3',
    'D4',
]

export let AmAdd9Chord = [
    'A2',
    'A3',
    'B3',
    'C4',
    'E4',
]

// https://www.scales-chords.com/chord/piano/CM9
export let CM9Chord = [
    'C2',
    'C3',
    'D3',
    'E3',
    'G3',
    'B3',
]

let _BmAdd11Chord = [  // not a Bm11 chord, its just a Bm with an added 11 which is the E
    'B2',
    'B3',
    'D4',
    'F#4',
    'E4',
]

export let BmAdd11ChordInversion1 = [  // not a Bm11 chord, its just a Bm with an added 11 which is the E
    'B2',
    'D3',
    'F#3',
    'B3',
    'E4',
]

// C Minor II-V-I Project 
// https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-chord-progressions/minor-ii-v-i/

// CHORDS

let _Dm7b5Chord = [  // Dø7
    'D3',
    'F3',
    'Ab3',
    'C3'
]
export let Dm7b5ChordNicerVoicing = [  // https://www.youtube.com/watch?v=x9LNj2uCWtE
    'F3',
    'Ab3',
    'C4',
    'D4',
]

let _G7b9Chord = [ // possibly G7alt though A# Eb involved with alt?
    'G2',
    // 'Ab2',  // optional, a bit weird
    'B2',
    'D3',
    'F3'
]
let G7b9ChordNicerVoicing = [
    'F3',
    'Ab3',
    'B3',
    'D4',
]
export let G7alt = G7b9ChordNicerVoicing

let _CmMaj7Chord = [
    'C3',
    'Eb3',
    'G3',
    'B3',
]
export let Cm7ChordNicerVoicing = [
    'Eb3',
    'G3',
    'Bb3',
    'C4',
]


// C II I V

export let Dm7 = Tonal.Chord.getChord("m7", "D3").notes
export let G7 = Tonal.Chord.getChord("7", "G2").notes
export let Cmaj7 = Tonal.Chord.getChord("maj7", "C3").notes

export let Db7 = Tonal.Chord.getChord("7", "Db3").notes  // tritone substitution

// TODO watch out with custom chords that they don't start in the wrong octave
//     ideally would dynamically build them based on the lowest bass note in settings!
//     Luckily the inversion start note of D3 pushes the chord into the correct octave of 3
// "D2" is the root of the chord, thus the way to specify which inversion
// which inversion is thus defined by the starting/root note - which has to be higher 
export let G7inversion2 = Tonal.Chord.getChord("7", "G2", "D3").notes
// transposed
export let Cm7 = Tonal.Chord.getChord("m7", "C3").notes
export let F7inversion2 = Tonal.Chord.getChord("7", "F2", "C2").notes
// Tonal.Chord.getChord("m7", "D3")
// Tonal.Chord.transpose("Dm7", "-2M") only gives us a string. 


// Peg - Steely Dan

// Chords

export let Cmaj7ChordStartOnB = Tonal.Chord.getChord("maj7", "C3", "B").notes

// BUG in tonal - reported https://github.com/tonaljs/tonal/issues/231 
// export let Gadd9ChordStartsOnA = Tonal.Chord.getChord("add9", "G2", "A").notes
export let Gadd9ChordStartsOnA = ['A3', 'B3', 'D4', 'G4']  // workaround
