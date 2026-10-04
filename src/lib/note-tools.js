import { Chord, Note } from "@tonaljs/tonal";
import { chordOctave, bassNoteOctave } from "./settings";
import * as Tonal from '@tonaljs/tonal';

// for combo box use
export const noteOptions = [  // value is always a sharp (via sanitiseNoteToSharp() calls), so that combo matching works
    { text: 'C', value: 'C' },
    { text: 'C#/Db', value: 'C#' },
    { text: 'D', value: 'D' },
    { text: 'D#/Eb', value: 'D#' },
    { text: 'E', value: 'E' },
    { text: 'F', value: 'F' },
    { text: 'F#/Gb', value: 'F#' },
    { text: 'G', value: 'G' },
    { text: 'G#/Ab', value: 'G#' },
    { text: 'A', value: 'A' },
    { text: 'A#/Bb', value: 'A#' },
    { text: 'B', value: 'B' },
]

const noteToIndex = {
    'C': 0,
    'B#': 0,

    'C#': 1,
    'Db': 1,

    'D': 2,

    'D#': 3,
    'Eb': 3,

    'E': 4,
    'Fb': 4,

    'E#': 5,
    'F': 5,

    'F#': 6,
    'Gb': 6,

    'G': 7,

    'G#': 8,
    'Ab': 8,

    'A': 9,

    'A#': 10,
    'Bb': 10,

    'B': 11,
    'Cb': 11,
}

export function noteObjectToMidiValue(noteObject) {
    // Converts note object to MIDI value, assumes noteObject is e.g. { letter: 'C', octave: 4}
    let index = noteToIndex[noteObject.letter]
    if (index === undefined)
        throw new Error(`${noteObject.letter} not in noteToIndex`)
    return index + (noteObject.octave * 12)
}

export function noteObjectToNextWhiteNoteObject(noteObject) {
    let whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    let nextIndex = whiteNotes.indexOf(noteObject.letter) + 1
    if (nextIndex === 7) {
        // if nextIndex is 7, it means the current note is 'B'
        // therefore, the next white note is 'C' in the next octave
        return {
            letter: 'C',
            octave: noteObject.octave + 1
        }
    } else {
        return {
            letter: whiteNotes[nextIndex],
            octave: noteObject.octave
        }
    }
}

function noteToKeyboardNumber(note) {
    let index = noteToIndex[note]
    if (index === undefined)
        throw new Error(`${note} not in noteToIndex`)
    return index
}

export function notesToKeyboardNumbers(notes) {
    // Converts array of notes into array of keyboard numbers (0-24)
    // takes into account octave crossings
    let lastNote = undefined
    let offset = 0
    let result = []
    for (let note of notes) {
        if (note == '')
            continue
        if (lastNote && isInNextOctave(lastNote, note))
            offset += 12
        let n = noteToKeyboardNumber(note) + offset
        result.push(n)
        lastNote = note
    }
    // console.log('notesToKeyboardNumbers', notes, result)
    return result
}

export function isInNextOctave(note1, note2) {
    // Is note2 in the next octave?
    return noteToIndex[note2] < noteToIndex[note1]
}

export function indexToNote(index, startOctave = 3) {
    // Converts keyboard number to note. A normalised modulo keeps negative
    // (off-screen) indices working, e.g. -1 -> B2 and -12 -> C2.
    const keyboardNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const pitchClass = keyboardNotes[((index % 12) + 12) % 12]
    return `${pitchClass}${(Math.floor(index / 12) + startOctave)}`
}

export function indexToWhiteNote(index) {
    // Converts keyboard number (0-nn) to white note e.g. 'C', subsequent octaves become 'C_2' etc
    const keyboardNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    const numNotes = keyboardNotes.length
    let note = keyboardNotes[((index % numNotes) + numNotes) % numNotes]
    let octaveOffset = Math.floor(index / numNotes)
    return (octaveOffset > 0) ? `${note}_${octaveOffset + 1}` : note
}

export function sortNotes(notes) {
    // Sorts midi notes e.g. ['D2', 'C2'] in ascending order

    function isPreResolvedNote(note) {
        // Unresolved note is a note from the project config e.g. 'C_2' or just 'C' (no octave number)
        const noteObj = Note.get(note)
        return (noteObj.oct === undefined || noteObj.empty)
    }

    if (notes.length > 0 && isPreResolvedNote(notes[0])) { // too early to sort, have not added octave numbers etc. yet
        // console.log('aborting sortNotes, notes not yet resolved', notes, Note.get(notes[0]))
        return notes
    }

    let result = notes.sort(function (a, b) {
        // last character is the octave
        let aOctave = Note.get(a).oct  // parseInt(a.charAt(a.length - 1))
        let bOctave = Note.get(b).oct  // parseInt(b.charAt(b.length - 1))
        // sort by octave, then by note
        if (aOctave > bOctave) return 1
        if (aOctave < bOctave) return -1

        // must be the same octave, so now sort by note
        let aNote = a.substring(0, a.length - 1)
        let bNote = b.substring(0, b.length - 1)
        return (noteToIndex[aNote] - noteToIndex[bNote])
    })
    return result
}

export function sortNotesNoOctave(notes) {
    // Sorts midi notes e.g. ['D', 'C'] in ascending order, no octave numbers
    let result = notes.sort(function (a, b) {
        return (noteToIndex[a] - noteToIndex[b])
    })
    return result
}

export function sortChordConfigs(chordConfigs) {  // array of chord configs
    // Sort the chord configs array by chordConfig.name (which contains string chordSymbols)

    function nameToTonic(chordSymbols) {
        // name contains a comma separated string of chord symbols e.g. 'Cm7,Am7,G7'
        let chordSymbol = chordSymbols.split(',')[0]
        if (chordSymbol.includes('/'))
            chordSymbol = chordSymbol.split('/')[0]
        let chordObj = Chord.get(chordSymbol); // analyse the chord symbol properly
        return chordObj.tonic
    }

    let result = chordConfigs.sort(function (a, b) {
        let aTonic = nameToTonic(a.name)
        let bTonic = nameToTonic(b.name)
        return (noteToIndex[aTonic] - noteToIndex[bTonic])
    })
    // console.log('result', result)

    return result
}

// export function sortChordConfigsFavouritesFirst(chordConfigs, favourites) {
//     // Sort the chord configs array so that any chordConfig.index matching favourites goes first
//     let result = chordConfigs.sort(function (a, b) {
//         let aInFavourites = favourites.includes(a.index) ? 0 : 1
//         let bInFavourites = favourites.includes(b.index) ? 0 : 1
//         return (aInFavourites - bInFavourites)
//     })
//     return result
// }

export function addOctavesToNotes(notes, startOctave = chordOctave) {
    // Add octave numbers to notes
    let result = []
    let lastNote = undefined
    let octave = startOctave

    for (let note of notes) {
        let noteObj = Note.get(note)
        if (noteObj.empty)
            throw (new Error(`${note} is not a valid note`))

        if (noteObj.oct === undefined) {
            // note is unresolved, so add octave number

            if (lastNote && isInNextOctave(lastNote, note))
                octave += 1

            result.push(`${note}${octave}`)
        } else {
            // note is already resolved
            result.push(note)
        }
        lastNote = note
    }
    return result
}

export function findOctaveCrossingPoint(notes) {
    // Finds the first note in the notes array that is in the next octave
    // Returns the index of the note, or -1 if no note is in the next octave
    let lastNote = undefined
    let offset = 0
    for (let note of notes) {
        if (note == '')
            continue
        if (lastNote && isInNextOctave(lastNote, note))
            return offset
        lastNote = note
        offset += 1
    }
    return -1
}

export function samePitchClass(noteA, noteB) {
    // Are two notes the same tone regardless of octave and spelling?
    // e.g. samePitchClass('C4', 'C2') -> true, samePitchClass('C#3', 'Db5') -> true
    if (!noteA || !noteB)
        return false
    const a = Note.get(noteA)
    const b = Note.get(noteB)
    if (a.empty || b.empty)
        return false
    return a.chroma === b.chroma
}

export function noteInAnyPitchClass(note, notes) {
    // Does note match any of the notes in the list, ignoring octave and spelling?
    if (!Array.isArray(notes))
        return false
    return notes.some(other => samePitchClass(note, other))
}

export function describeNoteRoles({ inProjectKey, inCurrentScale, inCurrentChord }) {
    // A short educational description of a note in the live scale display.
    const parts = []
    parts.push(inProjectKey ? 'Project key note' : 'Outside the project key')
    parts.push(inCurrentScale ? 'in the current scale' : 'not in the current scale')
    parts.push(inCurrentChord ? 'in the current chord' : 'not in the current chord')
    return parts.join(' — ')
}

export function unionPitchClassNotes(primaryNotes, extraNotes) {
    // Merge two lists of notes into one, drop duplicate tones (by chroma), and
    // sort ascending from C so a given note always sits in the same place.
    // The spelling from the first list wins, then the second list fills gaps.
    const lists = [primaryNotes, extraNotes]
    const byChroma = new Map()
    for (const list of lists) {
        if (!Array.isArray(list))
            continue
        for (const note of list) {
            if (!note)
                continue
            const chroma = Note.get(note).chroma
            if (!Number.isFinite(chroma))
                continue
            if (!byChroma.has(chroma))
                byChroma.set(chroma, note)
        }
    }
    return [...byChroma.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, note]) => note)
}

export function sanitiseNoteToSharp(note) {
    // Convert accidental b notes into #
    // param note: string e.g. 'Cb'
    // return: string e.g. 'C#'
    const noteObj = Note.get(note)
    if (noteObj.acc == 'b') {
        const noteName = Note.enharmonic(noteObj.name)
        return noteName
    }
    return note  // unchanged
}

export function notesToPreferredRepresentation(notes) {
    const niceNoteNames = [ "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B" ]
    return notes.map(note => niceNoteNames.includes(Tonal.Note.get(note).name) ? note : Tonal.Note.enharmonic(note))
}

export function createChordSymbol(root, type) {
    // Avoid creating C69#11 cos this doesn't get re-recognised by Tonal
    // needs a space between root and chord name
    // Another example is A# 5th which can become A#5 which is not recognised by Tonal

    if (type === '69#11' || type === '5')
        return root + ' ' + type
    else
        return root + type
}

export function suggestBass(chordNotes) {
    let bassObj = Tonal.Note.get(chordNotes[0])
    bassObj = Tonal.Note.get(bassObj.pc)  // discard chord octave
    if (bassObj.empty)
        throw (new Error(`suggestBass created an empty suggestion! Maybe ${chordNotes[0]} is not a valid note`))
    return bassObj
}

export function bassWithOctFromChordNotesWithOct(chordNotes) {
    const bassNoteWithOct = chordNotes[0]
    return Tonal.Note.get(bassNoteWithOct).pc + bassNoteOctave
}

// export function incrNotesByOne(rhNotes) {
//     let result = []

//     for (let note of rhNotes) {
//         if (note[0] == '_')
//             note = note.slice(1)
//         switch (note) {
//             case 'C':
//                 note = 'C#'
//                 break
//             case 'C#':
//             case 'Db':
//                 note = 'D'
//                 break
//             case 'D':
//                 note = 'D#'
//                 break
//             case 'D#':
//             case 'Eb':
//                 note = 'E'
//                 break
//             case 'E':
//                 note = 'F'
//                 break
//             case 'F':
//                 note = 'F#'
//                 break
//             case 'F#':
//             case 'Gb':
//                 note = 'G'
//                 break
//             case 'G':
//                 note = 'G#'
//                 break
//             case 'G#':
//             case 'Ab':
//                 note = 'A'
//                 break
//             case 'A':
//                 note = 'A#'
//                 break
//             case 'A#':
//             case 'Bb':
//                 note = 'B'
//                 break
//             case 'B':
//                 note = 'C'
//                 break
//             default:
//                 throw (`${note} not in ${rhNotes}`)
//         }
//         result.push(note)
//     }
//     return result
// }

// export function decrementNotesByOne(rhNotes) {
//     let result = []

//     for (let note of rhNotes) {
//         if (note[0] == '_')
//             note = note.slice(1)
//         switch (note) {
//             case 'C':
//                 note = 'B'
//                 break
//             case 'C#':
//             case 'Db':
//                 note = 'C'
//                 break
//             case 'D':
//                 note = 'C#'
//                 break
//             case 'D#':
//             case 'Eb':
//                 note = 'D'
//                 break
//             case 'E':
//                 note = 'D#'
//                 break
//             case 'F':
//                 note = 'E'
//                 break
//             case 'F#':
//             case 'Gb':
//                 note = 'F'
//                 break
//             case 'G':
//                 note = 'F#'
//                 break
//             case 'G#':
//             case 'Ab':
//                 note = 'G'
//                 break
//             case 'A':
//                 note = 'G#'
//                 break
//             case 'A#':
//             case 'Bb':
//                 note = 'A'
//                 break
//             case 'B':
//                 note = 'Bb'
//                 break
//             default:
//                 throw (`${note} not in ${rhNotes}`)
//         }
//         result.push(note)
//     }
//     return result
// }
