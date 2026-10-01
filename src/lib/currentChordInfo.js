import { globals } from "/src/lib/globals.js"
import * as Tonal from "@tonaljs/tonal";
import { removeBassSlash } from "/src/lib/removeBassSlash.js";
import { getRandomArbitary } from '../../src/lib/util.js';
import { sanitiseNoteToSharp, createChordSymbol } from '../../src/lib/note-tools.js';

export function currentChordInfo() {
    // returns {chordSymbolNoRoot, bass, rootNote, chordNotes} from the currently triggered chord
    const chordConfig = globals.currentChordConfig()
    const chordObj = Tonal.Chord.get(chordConfig.chord)

    // sanitise to sharp to make combo value to match
    const rootNote = sanitiseNoteToSharp(chordObj.tonic)

    // interesting, we recalc the chord symbol rather than using the one from the config?
    const chordSymbolNoRoot = chordObj.aliases[0]

    const bass = chordConfig.bass

    const chordNotes = chordConfig.chordNotes

    return { chordSymbolNoRoot, bass, rootNote, chordNotes }
}
