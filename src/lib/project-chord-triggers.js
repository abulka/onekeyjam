import { globals } from './globals.js'
import { sortNotes } from "./note-tools.js"

export function getProjectChordsTriggers() {
    // Returns sorted array of notes (incl. octave) that trigger chords in l.h.
    if (globals.chordTriggerMap) {
        return sortNotes(Object.keys(globals.chordTriggerMap))
    }
    else
        return []  // Project not loaded yet
}
