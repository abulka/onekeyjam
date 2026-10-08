import { globals } from "./globals.js"
import { appendChordConfigsToGrid } from './gridArrangement.js';
import { fillInChordConfig, fillInChordConfig2 } from './fillInChordConfig';
import { removeBassSlash } from './removeBassSlash.js';
import { keyDetection } from './keyDetection';
import { resolveProjectKey } from './projectKey.js';

export function chordAddToProject(currentRoot, currentChord, currentChordInversion, bass) {
    const o = new ChordAddToProjectFromCombo(currentRoot, currentChord, currentChordInversion, bass)
    o.recipe()
}

export function chordAddToProjectExact(symbol, notes, symbols, bass) {
    const o = new ChordAddToProjectExact(symbol, notes, symbols, bass)
    o.recipe()
}


//  Private


class ChordAddToProjectBase {
    constructor() {
        this.chordConfig = emptyChordCandidate()
        this.root = ""
        this.type = ""
        this.bass = ""
        this.inversion = 0
        this.chordNotes = []
        this.chord = ""  // incl. root but without bass
        this.symbols = []
    }
    recipe() {
        this.chordConfig.id = allocatedNextId(globals.project.chords)

        this.doFillInChordConfig()  // template method pattern

        // Append to the pool and the grid arrangement, and grow the grid so the
        // new chord is visible and saved. The arrangement is the source of
        // truth, so this persists where a random rebuild would not.
        appendChordConfigsToGrid([this.chordConfig])

        globals.projectKey = resolveProjectKey(globals.project) ?? globals.projectKey ?? null
        keyDetection()
    }
    doFillInChordConfig() {
        // template method pattern, override this in a subclass
        throw ("doFillInProjectChordConfig() not implemented")
    }
}
class ChordAddToProjectFromCombo extends ChordAddToProjectBase {
    constructor(currentRoot, currentChord, currentChordInversion, bass) {
        super()
        this.root = currentRoot
        this.type = currentChord
        this.inversion = currentChordInversion
        this.bass = bass
    }
    doFillInChordConfig() {
        fillInChordConfig(this.chordConfig, this.root, this.type, this.inversion, this.bass)
    }
}
class ChordAddToProjectExact extends ChordAddToProjectBase {
    constructor(chordSymbol, chordNotes, symbols, bassUser) {
        super()
        let [chord, bass] = removeBassSlash(chordSymbol)
        this.chord = chord
        this.bass = bassUser ? bassUser : bass
        this.chordNotes = chordNotes
        this.symbols = symbols
    }
    doFillInChordConfig() {
        fillInChordConfig2(this.chordConfig, this.chord, this.symbols, this.chordNotes, this.bass)
    }
}



function emptyChordCandidate() {  // TODO get this from globals !!!!
    return {
        name: "",
        chord: "",
        chordNotes: [],
        bass: "",
        scale1: "",
        scale2: "",
        scale3: "",
    }
}

function allocatedNextId(chordConfigs) {
    // Allocate a new id, guaranteed to be unique in the project
    if (chordConfigs.length == 0)
        return 1
    const ids = chordConfigs.map(chordConfig => chordConfig.id != undefined ? chordConfig.id : -1)
    const maxId = Math.max(...ids)
    return maxId + 1
}