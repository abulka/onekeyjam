import * as Tonal from "@tonaljs/tonal";
import { sanitiseNoteToSharp, createChordSymbol } from './note-tools.js';
import { chordSymbolToNotes, chordSymbolToNotesInversion } from "./chordSymbolToNotes";

export function calcChordInversionNumberAndNewBass(tonic, type, inversion, inversionChangesBass = false, direction = 1) {
    // Called by chord picker when calculating the inversion of a chord when press the invert buttons
    // returns object with the following properties:
    // - bass: the first/lowest note of the chord to be potentially used as a proper bass note
    // - inversion: the inversion number (0, 1, 2, 3)
    let resultInversion
    let resultBass
    const chordSymbol = createChordSymbol(tonic, type)
    const numNotes = chordSymbolToNotes(chordSymbol).length
    if (direction == 0) {
        resultInversion = 0  // reset inversion
    }
    else {
        resultInversion = (inversion + direction) % numNotes
        if (inversion < 0)
            resultInversion = numNotes - 1
    }

    if (inversionChangesBass) {
        const notes = chordSymbolToNotesInversion(chordSymbol, resultInversion)
        const firstNote = Tonal.Note.get(notes[0])
        resultBass = sanitiseNoteToSharp(firstNote.pc)  // .letter doesn't give the accidental, .pc does
    }
    else
        resultBass = sanitiseNoteToSharp(tonic)
    return { bass: resultBass, inversion: resultInversion }
}
