import * as Tonal from "@tonaljs/tonal";
import { addOctavesToNotes, sortNotesNoOctave, findOctaveCrossingPoint, isInNextOctave } from './note-tools.js';
import { scaleObjToNotes } from './scaleToNotes';
import { chordOctave } from './settings';
import * as db from './config.js';


// ┌─┐┬ ┬┌─┐┬─┐┌┬┐       ┌┬┐┌─┐       ┌┐┌┌─┐┌┬┐┌─┐┌─┐
// │  ├─┤│ │├┬┘ ││  ───   │ │ │  ───  ││││ │ │ ├┤ └─┐
// └─┘┴ ┴└─┘┴└──┴┘        ┴ └─┘       ┘└┘└─┘ ┴ └─┘└─┘

export function chordSymbolToNotes(name) {
    // Convert chord symbol to notes
    if (!name) {
        console.warn("chord name is undefined", name);
        return []
    }
    let notes = db[name];  // db is both scales and chords, should separate them
    if (!notes) {
        // Try looking up chord from Tonal
        let chordObj = Tonal.Chord.get(name);
        if (!chordObj.empty) {
            notes = scaleObjToNotes(chordObj);
            notes = addOctavesToNotes(notes, chordOctave)
        }
        else {
            console.error('ERROR: chordSymbolToNotes', name);
            notes = [];
        }
    }
    return notes;
}

// ┌─┐┬ ┬┌─┐┬─┐┌┬┐       ┌┬┐┌─┐       ┌┐┌┌─┐┌┬┐┌─┐┌─┐  ┬┌┐┌┬  ┬┌─┐┬─┐┌─┐┬┌─┐┌┐┌
// │  ├─┤│ │├┬┘ ││  ───   │ │ │  ───  ││││ │ │ ├┤ └─┐  ││││└┐┌┘├┤ ├┬┘└─┐││ ││││
// └─┘┴ ┴└─┘┴└──┴┘        ┴ └─┘       ┘└┘└─┘ ┴ └─┘└─┘  ┴┘└┘ └┘ └─┘┴└─└─┘┴└─┘┘└┘


export function chordSymbolToNotesInversion(name, inversion = 0, octave = chordOctave) {
    // Convert chord symbol 'name' to notes with octaves, taking into account inversion
    // Only works with Tonal symbols, not custom names
    // // v1. Doesn't actually invert the chord in terms of octave assignments, just the order of notes
    // // which ultimately doesn't matter and sounds the same.
    // const notes = chordSymbolToNotes(name)  // also adds octaves - nice
    // for (let i=0; i < inversion; i++)
    //   notes.push(notes.shift())
    // return notes
    // v2. Inverts the chord in terms of octave assignments properly
    if (!name) {
        console.warn("chord name is undefined", name);
        return [];
    }
    let notes = [];
    let chordObj = Tonal.Chord.get(name);
    if (!chordObj.empty) {
        notes = scaleObjToNotes(chordObj);

        // apply inversions
        for (let i = 0; i < inversion; i++) {
            notes.push(notes.shift());
        }

        // sort the notes after the octave crossing point so that those notes clump together in the same
        // octave rather than jumping into yet another octave
        notes = _clumpNotesInNextOctaveTogether(notes);

        notes = addOctavesToNotes(notes, octave);
    }
    else {
        console.error('ERROR: chordSymbolToNotesInversion', name);
        notes = [];
    }
    return notes;
}

export function _clumpNotesInNextOctaveTogether(notes) {
    // Sort the notes after the octave crossing point so that those notes clump together in the same
    // octave rather than jumping into yet another octave. We must ensure that the lowest note is
    // respected. Used by inversion chordSymbolToNotesInversion() function only.

    // returns a new array of notes

    const index = findOctaveCrossingPoint(notes)
    if (index === -1) return notes

    const notesBefore = notes.slice(0, index)
    const notesAfter = notes.slice(index)
    const notesAfterSorted = sortNotesNoOctave(notesAfter)
    notes = [...notesBefore, ...notesAfterSorted]

    // Always respect the low note, but other notes can be shifted lower if possible
    // only notes lower than the low note will be played in the next octave
    const rootNote = notes[0]
    const notesAfterRoot = []
    const notesInNextOctave = []
    notesAfterRoot.push(rootNote)
    for (let i = 1; i < notes.length; i++) {  // start at 1 to skip the root note
        const note = notes[i]
        if (isInNextOctave(rootNote, note))
            notesInNextOctave.push(note)
        else
            notesAfterRoot.push(note)
    }
    notes = [...notesAfterRoot, ...notesInNextOctave]

    return notes
}

