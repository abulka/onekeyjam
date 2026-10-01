import { sortNotes } from "./note-tools.js"
import pkgLodash from 'lodash';
const { uniqWith, isEqual, uniq } = pkgLodash;  // import {uniqWith, isEqual, uniq} from 'lodash';
import { Interval, Note, Tonal } from "@tonaljs/tonal";
import { includesArray2 as includesArray } from "./array-tools.js"
import { stringify } from "./prettyjson.js";

/*
Parsing MIDI files - see https://github.com/Tonejs/Midi/blob/master/src/Midi.ts

Library naming confusion tip:
    "@tonejs/midi" ("@tonejs/midi": "^2.0.28") https://github.com/Tonejs/Midi is a different library to 
    "tone" ("tone": "^14.7.77") https://github.com/Tonejs/Tone.js which I don't use at all. 
Confusingly, they are both owned by the user 'tonejs' on GitHub.

"@tonaljs/tonal" ("@tonaljs/tonal": "^4.6.5") https://github.com/tonaljs/tonal is a different library yet again.

Summary:
--------

import { Midi } from '@tonejs/midi'                        node cannot handle this import syntax. vite ok, snowpack ok.
import pkg from '@tonejs/midi'; const { Midi } = pkg;      node needs this import syntax. snowpack OK. vite FAILS with "Cannot destructure property 'Midi' of 'pkg' as it is undefined."
import pkg from '@tonejs/midi'; const Midi = pkg.Midi      node needs this import syntax. snowpack OK. vite FAILS with "Cannot read properties of undefined (reading 'Midi')""
const { Midi } = require('@tonejs/midi');                  FAILS with both vite and snowpack. Uses require within a .mjs file - illegal.
import * as pkg from '@tonejs/midi'; const { Midi } = pkg; WORKS 🎉 snowpack OK. vite OK. node OK.

Discussion:
-----------
Importing from a npm repository e.g. import { Midi } from '@tonejs/midi' of
course needs snowpack or vite for this to work via the browser.

But since this entire module (parse-midi.mjs) is also used by node, which can't
handle the "{ named }" import syntax when used on the '@tonejs/midi' library, we
need to use the workaround syntax. Node, in general, CAN handle named {} import
syntax OK e.g. import { Chord } from "@tonaljs/tonal"; but not with the
'@tonejs/midi' library. So its just a matter of luck, whether a particular npm
package supports fancy named import syntax or not via node.

Note that for reading MIDI files via node, node doesn't need this import of Midi
in here, as the reading of the file and conversion to Midi is done in the
node-parse-midi.mjs so the Midi import happens in there. The midi object is
passed into here later. For the browser reading Midi files from urls, yes we do
need this import of tonejs here.

I opened an issue https://github.com/Tonejs/Midi/issues/162 and for a while the best
thing was to use snowpack and avoid vite.  Now with the import * as pkg syntax, it works in vite OK.
*/

// import { Midi } from '@tonejs/midi'  // node cannot handle this import syntax.

// import pkg from '@tonejs/midi';      // <-- two step workaround for node's benefit, 
// const { Midi } = pkg;                // <-- works in snowpack but FAILS in vite

// import pkg from '@tonejs/midi';         // <-- two step workaround for node's benefit, 
// const Midi = pkg.Midi                   // <-- works in snowpack but FAILS in vite

import * as pkg from '@tonejs/midi';      // <-- two step workaround for node's benefit, 
const { Midi } = pkg;                     // 🎉 snowpack OK. vite OK. node OK.

// import { localHost, http } from "./globals.mjs"  // <-- node v16.13.1 doesn't like this because globals in turn imports vue reactive stuff from https
// possibly upgrade node to a later version maybe? see discussion https://stackoverflow.com/questions/69665780/error-err-unsupported-esm-url-scheme-only-file-and-data-urls-are-supported-by
import { http, localHost } from './globals-config.js'

// type ChordObject = {
//     notes: string[];
//     sortedNotes: string[];
//     lowestNote: string;
// }

let timeAnalysis = {};
let chords = []           // type string[][] e.g. ['F3', 'A3', 'C5'], ['G3', 'B3', 'D4']
let chordsAsObjects = []  // type ChordObject
const debug = {
    timeAnalysis: false,
    sort: false,
    duplicates: false,
    transpose: false,
    extremes: false,
    extremes_removal: false,
    finalresult: false,
}

export function parseMidiFile(buffer) {
    const midi = new Midi(buffer);
    return midi
}

export async function parseMidiUrl(url) {
    // load a midi file in the browser

    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/simple1.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/voicings.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/AHouseis_flattened-type0.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/Peg.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/single-note.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/House-short1.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/house2.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/house3.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/house4.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/house5.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/house6.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/peg-piano.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/AHouseis_flattened-type0.mid`)
    const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/faurreq7.mid`)
    // const midi = await Midi.fromUrl(`${http}${localHost}:8080/midi-files/2022-06-29 Adam Neely crazy chord.mid`)

    return midi
}

export function detectChords(midi) {
    // Read through MIDI file and extract chords.
    // Params: 'midi' (tonejs/midi Midi object)
    // Returns: chords array (array of arrays of strings)

    // Clear old chords and analysis
    chords = []
    timeAnalysis = {}

    //the file name decoded from the first track
    const name = midi.name

    //tracks have notes and controlChanges, channel and instrument e.g. track.instrument.name
    midi.tracks.forEach(track => {
        track.notes.forEach(note => {
            //notes have e.g. note.midi, note.time, note.duration, note.name
            analyseNote(note)
        })
    })
    extractChordsAndProcess();
    // exportMidiChords(chords)
    return chords
}

/**
 * 
 * @param {string[][]} midiChords e.g. ['F3', 'A3', 'C5'], ['G3', 'B3', 'D4']
 * @returns a Midi object - "@tonejs/midi" library
 */
export function exportMidiChords(midiChords) {
    var midiObj = new Midi()
    const track = midiObj.addTrack()

    // add each chord note from midiChords at the same time then incr time by 0.5
    let time = 0
    for (let chord of midiChords) {
        for (let note of chord) {
            track.addNote({
                name: note,
                time: time,
                duration: 0.5
            })
        }
        time += 0.5
    }

    return midiObj
}

export function exportMidiChordsForChordMemoryTrigger(midiChords) {
    // Same as exportMidiChords except between each chord we have a single note
    // starting at C3 and going up the scale. This will be fed into the 
    // "chord memory trigger" max for live device to associate each chord with 
    // a trigger note.
    var midiObj = new Midi()
    const track = midiObj.addTrack()
    let time = 0
    let triggerNote = 'C3'
    let semitone = Interval.distance("C4", "C#4") // 1A
    let timeSpacing = 0.5
    for (let chord of midiChords) {

        // Add trigger note
        track.addNote({
            name: triggerNote,
            time: time,
            duration: timeSpacing
        })

        time += timeSpacing

        // Add chord notes
        for (let note of chord) {
            track.addNote({
                name: note,
                time: time,
                duration: timeSpacing
            })
        }

        time += timeSpacing

        triggerNote = Tonal.transpose(triggerNote, semitone)
        triggerNote = Note.simplify(triggerNote) // fix ## and bb that Tonal often produces
        console.log('new triggerNote', triggerNote)
    }
    return midiObj
}

function extractChordsAndProcess() {
    grabChordsFromTimeAnalysis();  // sets chords

    buildChordsAsObjects()  // chords -> chordsAsObjects
    sortNotesWithinChords();
    removeDuplicateChords()
    transposeChordsToC2();
    removeExtremeNotes();
    unbuildChordsAsObjects() // chordsAsObjects -> chords again
}

function analyseNote(note) {
    // Add 'note' (tonejs midi note - not a tonaljs Note) to timeAnalysis as a note name (string), to the nearest time step, allowing us to detect chords
    // Each note is an combined note on and note off object with midi, time, duration, name, noteOffVelocity 

    function round(value, decimals) {
        // https://www.jacklmoore.com/notes/rounding-in-javascript/
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }

    let approxTime = round(note.time, 1)  // 2 decimal places fails to detect enough for simpl1.mid, so use 1
    if (!(approxTime in timeAnalysis))
        timeAnalysis[approxTime] = []
    if (!timeAnalysis[approxTime].includes(note.name))
        timeAnalysis[approxTime].push(note.name)
}

function grabChordsFromTimeAnalysis() {
    // loop through timeAnalysis and find all the entries with more than one note
    let results = []

    if (debug.timeAnalysis) {
        console.log('raw timeAnalysis num chords', Object.keys(timeAnalysis).length)
        console.log('timeAnalysis', stringify(timeAnalysis))
    }

    for (let time in timeAnalysis) {
        let chord = timeAnalysis[time]
        if (_enoughUniqueNotesToBeChord(chord))
            results.push(chord)
    }
    if (debug.timeAnalysis)
        console.log('chords', stringify(results))
    chords = results
}

function _enoughUniqueNotesToBeChord(chord) {
    // Remove octaves and remove duplicate notes e.g. [C4 D4 D5] should end up as just [C D]
    const chordNotesNoOctave = chord.map(note => note.slice(0, -1))
    const chordNotesNoOctaveNoDuplicates = uniq(chordNotesNoOctave)
    return (chordNotesNoOctaveNoDuplicates.length >= 3)
}

function sortNotesWithinChords() {
    /*
    Sorting the notes in order to delete duplicates means losing the voicings.    
    [
        [c3,d3,e3], -> [c3,d3,e3]
        [d3,c3,e3], -> [c3,d3,e3] // this is a duplicate of the previous chord
        [a3,c3,e3], -> [c3,e3,a3]
    ]
    */
    // 1. Sort chords
    let sortedChords = []
    for (let chord of chords)
        sortedChords.push(sortNotes(chord))
    chords = sortedChords
    if (debug.sort)
        console.log('sorted chords', stringify(chords))

    // 2. Update chordsAsObjects, too
    // No need, already has sorted info in it
    verify()
}

function removeDuplicateChords() {
    if (Object.keys(chordsAsObjects).length !== chords.length)
        throw ('chordsAsObjects.length !== chords.length')

    // 1. Remove duplicate chords from chords array
    chords = uniqWith(chords, isEqual)

    // 2. Update chordsAsObjects, too
    removeChordsAsObjectsDuplicates();

    if (Object.keys(chordsAsObjects).length !== chords.length) {
        console.log('chordsAsObjects.length !== chords.length', Object.keys(chordsAsObjects).length, chords.length)
        console.log('chordsAsObjects', stringify(chordsAsObjects))
        console.log('chords', stringify(chords))
        throw ('chordsAsObjects.length !== chords.length')
    }
    verify()

    if (debug.duplicates) {
        console.log('after duplicate removal, chords', stringify(chords))
        // console.log('chordsAsObjects', stringify(chordsAsObjects))
    }
}

function removeChordsAsObjectsDuplicates() {
    let uniqueChords = [];
    for (let chordObj of chordsAsObjects) {
        if (includesArray(uniqueChords, chordObj.sortedNotes))
            chordObj.duplicate = true;
        else {
            uniqueChords.push(chordObj.sortedNotes); // first time this chord is seen
            chordObj.duplicate = false;
        }
    }
    chordsAsObjects = chordsAsObjects.filter(chordObj => !chordObj.duplicate);
}

function transposeChordsToC2() {
    const MIN_OCTAVE = 2  // make this 3 to lift chords a little higher and avoid the 2 octave low notes
    const MAX_OCTAVE = 3

    function transposeByOctaves(noteName, octaveShift) {
        return Tonal.transpose(noteName, Interval.fromSemitones(octaveShift * 12));
    }

    // 1. Transpose chords
    let result = []
    for (let chord of chords) {
        const chordNotes = chord.map(note => Note.get(note))

        // sanity check that converting chord array of (string) notes to array of Tonal.Note objects and back again works ok
        const chordAsArrayOfStringsAgain = chordNotes.map(note => note.name)
        if (!isEqual(chord, chordAsArrayOfStringsAgain))
            throw ('transposeChordsToC2: chord not equal to chordAsArrayOfStringsAgain')

        const rootNote = chordNotes[0]
        if (rootNote.empty)
            throw ('could not recognize root note of chord: ' + chord, chord[0])
        // console.log('rootNote (chords)', rootNote.name, rootNote.oct)

        if (rootNote.oct < MIN_OCTAVE) {
            const numOctaves = MIN_OCTAVE - rootNote.oct
            // console.log(chord, 'rootNote too low', rootNote.name, 'needs transposing by', numOctaves, 'octaves =>')
            let chordTransposed = chordNotes.map(note => transposeByOctaves(note.name, numOctaves))
            // console.log(chordTransposed)
            result.push(chordTransposed)
        }
        else if (rootNote.oct > MAX_OCTAVE) {
            const numOctaves = MAX_OCTAVE - rootNote.oct
            // console.log(chord, 'rootNote too high', rootNote.name, 'needs transposing by', numOctaves, 'octaves =>')
            let chordTransposed = chordNotes.map(note => transposeByOctaves(note.name, numOctaves))
            // console.log(chordTransposed)
            result.push(chordTransposed)
        }
        else
            result.push(chord)
    }
    chords = result

    // 2. Update chordsAsObjects, too (in place)
    for (let chordObj of chordsAsObjects) {
        // Convert to proper Note objects
        const chordNotes = chordObj.notes.map(note => Note.get(note))
        const sortedChordNotes = chordObj.sortedNotes.map(note => Note.get(note))
        const rootNote = Note.get(chordObj.lowestNote)
        // Transpose
        let numOctaves = 0
        if (rootNote.oct < MIN_OCTAVE)
            numOctaves = MIN_OCTAVE - rootNote.oct
        else if (rootNote.oct > MAX_OCTAVE)
            numOctaves = MAX_OCTAVE - rootNote.oct
        // console.log('rootNote (object)', rootNote.name, rootNote.oct, 'numOctaves', numOctaves)
        if (numOctaves !== 0) {
            chordObj.notes = chordNotes.map(note => transposeByOctaves(note.name, numOctaves))
            chordObj.sortedNotes = sortedChordNotes.map(note => transposeByOctaves(note.name, numOctaves))
        }
    }
    // chordsAsObjects has been updated in place
    verify()

    if (debug.transpose) {
        console.log('after transposeChordsToC2, chords', stringify(chords))
        // console.log('chordsAsObjects', stringify(chordsAsObjects))
    }
}

function removeExtremeNotes() {
    // Remove chord notes which are too low or too high
    // If the chord then has too few notes, remove it too
    // If the chord then has not enough different notes to be a chord, remove it too
    // Future: instead of removing extremeties, perhaps just transpose them down e.g. [A3, C7] => [A3, C4]

    // 1. Fix chords
    let result = []
    for (let chord of chords) {
        const newChord = chord.filter(note => {
            const noteObj = Note.get(note)
            return noteObj.oct >= 2 && noteObj.oct <= 4
        })
        if (!_enoughUniqueNotesToBeChord(newChord)) {
            if (debug.extremes_removal)
                console.log('removing chord', chord, 'because not enough unique notes', newChord)
            continue
        }

        if (newChord.length >= 3 && !includesArray(result, newChord))
            result.push(newChord)
        else if (debug.extremes_removal)
            console.log('removing chord', chord, 'because after removing extreme notes, it has too few notes', newChord)
    }
    chords = result

    // 2. Update chordsAsObjects, too (in place)
    // TODO keep everything as Note objects - all this conversion is tedious
    for (let chordObj of chordsAsObjects) {
        chordObj.notes = chordObj.notes.filter(note => {
            const noteObj = Note.get(note)
            return noteObj.oct >= 2 && noteObj.oct <= 4
        })
        chordObj.sortedNotes = chordObj.sortedNotes.filter(note => {  // need to also do sorted notes cos are comparing later with chords
            const noteObj = Note.get(note)
            return noteObj.oct >= 2 && noteObj.oct <= 4
        })
        if (chordObj.notes.length < 3)
            chordObj.remove = true
        if (!_enoughUniqueNotesToBeChord(chordObj.notes))
            chordObj.remove = true
    }
    chordsAsObjects = chordsAsObjects.filter(chordObj => !chordObj.remove)
    removeChordsAsObjectsDuplicates();  // stripping a note could have created a duplicate

    if (debug.extremes) {
        console.log('after removeExtremeNotes, chords', stringify(chords))
        // console.log('chordsAsObjects', stringify(chordsAsObjects))
    }

    verify()
}


// Util

function buildChordsAsObjects() {
    // Turn each chord into an object thus preserve the original voicing e.g.
    let result = []
    for (let chord of chords) {
        let sortedNotes = sortNotes(chord)
        let chordObj = {
            notes: chord,
            sortedNotes: sortedNotes,
            lowestNote: sortedNotes[0],
        }
        result.push(chordObj)
    }
    chordsAsObjects = result
}

function unbuildChordsAsObjects() {
    let result = chordsAsObjects.map(chordObj => chordObj.notes)

    // Are they different? Turns out original algorithm was already voicing
    // preserving 😤 cos precise notes e.g. C3 G3 vs G3 C4 respected and treated
    // as different chords
    if (isEqual(chords, result)) {
        // console.log('voicing preserved - no change')  // this is expected
    }
    else
        console.log('voicing preserved version - changes present?')

    if (debug.finalresult) {
        console.log('final chords:', chords.length, stringify(chords))
        // console.log('final chords via defunct voicing preserved:', stringify(result))
    }
    // chords = result // override chords, with voicing preserving version
}

function verify() {
    // Verify that chordsAsObjects and chords are in sync
    if (!Object.keys(chordsAsObjects).length == chords.length)
        console.log('Object.keys(chordsAsObjects)', Object.keys(chordsAsObjects).length, '!= chords.length', chords.length)
    // else
    //     console.log('so far so good - length of chordsAsObjects and chords are equal')
    const chords2 = chordsAsObjects.map(chordObj => chordObj.sortedNotes)
    if (!isEqual(chords, chords2)) {
        const errMsg = 'chords and chordsAsObjects are not in sync'
        console.warn(errMsg)
        console.log(' - chords original:', stringify(chords))
        console.log(' - voicing preserved:', stringify(chords2))
        throw (errMsg)
    }
}
