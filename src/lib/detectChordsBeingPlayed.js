import * as Tonal from "@tonaljs/tonal";
import { globals } from "./globals.js";
import { sortNotes } from './note-tools.js';
import { removeBassSlash } from "./removeBassSlash.js";
import { arraysAreEqual } from "../../src/lib/array-tools"

/**
 * Detect the chord being played or notes of chord passed in.
 * @param {Array<string>} [notes] notes to analyse. If not provided, uses currentNotes
 * @returns Nothing - sets globals.currentChordBeingJammed fields (lots of them)
 * 
 * # Notes:
 * If a particular combination of notes has been there for more than n seconds then
 * this is a candidate for detecting a chord.
 */
export function detectChordsBeingPlayed(notes) {
    if (notes != undefined) {
        lastNotes = currentNotes = notes
        analyseNotes(notes)
    }
    else {
        lastNotes = currentNotes = currentNotesDown()
        setTimeout(function () { analyseNotes(); }, 100);
    }
}


// Private


let currentNotes = []
let lastNotes = []
let lastNotesAnalysed = []

const currentNotesDown = () => sortNotes(Object.values(globals.pendingNoteOffs).map(noteInfo => noteInfo.allowedNote))

/**
 * 
 * @param {Array<string>} [notes] notes to analyse. If not provided, uses currentNotes
 * @returns Nothing - sets globals.currentChordBeingJammed fields (lots of them)
 */
function analyseNotes(notes) {
    const currentNotes = notes != undefined ? notes : currentNotesDown()
    const notesHaveStabilised = () => arraysAreEqual(currentNotes, lastNotes)
    const notesSameAsLastAnalysis = () => arraysAreEqual(currentNotes, lastNotesAnalysed)

    if (!notesHaveStabilised()) {
        // console.log(`Notes have not stabilised last=${lastNotes} current=${currentNotes}`)
        return
    }
    if (notesSameAsLastAnalysis()) {
        // console.log(`Notes same as last analysis current=${currentNotes}`)
        return
    }

    // console.log('OK, same notes detected after 1 sec', currentNotes, 'proceeding to detect...')
    doDetect(currentNotes);
}

function doDetect(currentNotes, retainLastDetectionResult=true) {
    if (!(currentNotes instanceof Array))
        throw (`currentNotes '${currentNotes}' is not an array?`)

    lastNotesAnalysed = currentNotes;

    const detectedChordSymbols = Tonal.Chord.detect(currentNotes);

    // Pick the first chord symbol
    if (detectedChordSymbols.length > 0) {
        const chordSymbol = detectedChordSymbols[0];
        let [symbol, bass] = removeBassSlash(chordSymbol);
        const chordObj = Tonal.Chord.get(symbol);
        if (chordObj.empty)
            throw (`Could not find chord matching ${chordSymbol} even though Tonal once detected this chord`);
        globals.currentChordBeingJammed.chordNotes = currentNotes;
        globals.currentChordBeingJammed.symbols = detectedChordSymbols;
        globals.currentChordBeingJammed.chord = chordObj.symbol; // still has root note
        globals.currentChordBeingJammed.tonic = chordObj.tonic;
        globals.currentChordBeingJammed.type = chordObj.aliases[0]; // no root, no bass
        globals.currentChordBeingJammed.bass = bass;
        globals.currentChordBeingJammed.stale = false

        if (globals.syncChordPickerToJamChord)
            document.broadcastEvent("syncChordPickerToJamChord", { chordInfo: globals.currentChordBeingJammed });
    }
    else {
        // Even though notes weren't detected, still save them just in case user wants to add them to project anyway
        if (currentNotes.length > 1)
            globals.currentChordBeingJammed.chordNotes = currentNotes;
        
        globals.currentChordBeingJammed.stale = true

        if (!retainLastDetectionResult)
            clearDetection();
    }
}

function clearDetection() {
    globals.clearCurrentChordBeingJammed()
    lastNotesAnalysed = []
    lastNotes = []
    currentNotes = []
}
