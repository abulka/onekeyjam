import { globals } from "./globals.js"
import * as Tonal from "@tonaljs/tonal";
import { playChordNote } from "./midi/play-chord.js"
import { stopAuditionChord } from "./midi/audition-note.js"
import { createChordSymbol } from "../../src/lib/note-tools.js"
import { chordSymbolToNotesInversion } from "../../src/lib/chordSymbolToNotes";
import { bassNoteOctave } from "../../src/lib/settings.js";
import { bassWithOctFromChordNotesWithOct } from "../../src/lib/note-tools"

/**
 * @module lib/auditionNotes
 * @desc PLaying Notes and chords.
 * 
 * ![auditionNotes](doco/ableton-midi-setup.png)
 * 
 */

/**
 * Plays a chord with the given notes without affecting the current chord
 * config. All notes include octaves
 *
 * @param {string[]} notes array of notes to play
 * @param {string} bass bass note (incl. octave) to play e.g. 'A3'
 * @param {boolean} noteState whether to play or stop the note, defaults to `true`
 */
export function auditionNotes(notes, bass, noteState = true) {
    // console.log('  auditionNotes', notes, bass, noteState);
    const fakeOriginNote = Tonal.Note.get('C20')
    const fakeTriggerNote = 'C21'  // fake trigger just for this auditioned chord
    fakeOriginNote.attack = globals.fixedNoteVelocity

    const options = {
        originNote: fakeOriginNote,
        duration: 0,
        when: 0
    }

    if (noteState) {
        // An audition is a preview, not a performance, so it must never reach
        // the live take or the hidden background buffer. Without this the grey
        // audition buttons and the Chord Picker's chordPlay() would record
        // notes the user never triggered, and Flashback Capture would recover
        // them. Mirrors auditionChord() in midi/audition-note.js.
        const wasSuppressed = globals.recording.suppressCapture
        globals.recording.suppressCapture = true
        try {
            // chord
            if (!(fakeTriggerNote in globals.pendingChordNoteOffs))
                globals.pendingChordNoteOffs[fakeTriggerNote] = []
            for (let noteName of notes)
                playChordNote(noteName, 'chord', options, globals.channel2, fakeTriggerNote, globals.pendingChordNoteOffs);

            // bass
            if (bass)
                playChordNote(bass, 'bass', options, globals.channel3, fakeTriggerNote, globals.pendingChordBassNoteOffs);
        }
        finally {
            globals.recording.suppressCapture = wasSuppressed
        }
    }
    else
        // The fake trigger is not in the chord trigger map, so playChordOff
        // would throw and the notes would ring forever. Stop them directly.
        stopAuditionChord()
}

// New

export function chordPlay(noteState = true) {
    // Create notes array e.g. ['C3', 'E3', 'G3'] and bass note e.g. 'C2'
    // and audition the chord, without changing current chord config
    const info = auditionInfo()
    auditionNotes(info.defaultVoicing.notes, info.defaultVoicing.bass, noteState)  // all notes & bass include octaves
  
    // Update UI
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('chord-changed', {
      notes: info.defaultVoicing.notes,
      bass: info.defaultVoicing.bass
    })
  }
  
  export function auditionInfo() {
    // returns an object
  
    function getDefaultVoicingNotes() {
      // get notes of current chord picker chord
      const chordSymbolInclRoot = createChordSymbol(globals.chordPicker.currentRoot, globals.chordPicker.currentChord)
      const notes = chordSymbolToNotesInversion(chordSymbolInclRoot, globals.chordPicker.currentChordInversion)
      return notes
    }
    function getDefaultVoicingBass() {
      return globals.chordPicker.currentBass ? globals.chordPicker.currentBass + bassNoteOctave : bassWithOctFromChordNotesWithOct(getDefaultVoicingNotes())
    }
    function getCurrentChordBeingJammedBass() {
      return globals.currentChordBeingJammed.bass ? globals.currentChordBeingJammed.bass + bassNoteOctave : bassWithOctFromChordNotesWithOct(getDefaultVoicingNotes())
    }
  
    return {
      defaultVoicing: {
        notes: getDefaultVoicingNotes(),
        bass: getDefaultVoicingBass()
      },
      currentChordBeingJammed: {
        notes: globals.currentChordBeingJammed.chordNotes,
        bass: getCurrentChordBeingJammedBass()
      }
    }
  }
