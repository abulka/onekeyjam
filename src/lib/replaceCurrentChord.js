import { globals } from "./globals.js"
import {fillInChordConfig, fillInChordConfig2} from './fillInChordConfig';
import { updateProjectChordConfig } from './projectConfig';
import {expandChordConfig} from './expandChordConfig.js';
import {removeBassSlash} from './removeBassSlash.js';

export function replaceCurrentChord(currentRoot, currentChord, currentChordInversion, bass) {
    // Replace the current chord config with the new chord info, adjust scales etc
    const chordConfig = globals.currentChordConfig()
    fillInChordConfig(chordConfig, currentRoot, currentChord, currentChordInversion, bass)

    expandChordConfig(chordConfig)  // update other fields in this chord triggermap chord config
    updateProjectChordConfig(chordConfig)  // update the project config too
}

export function replaceCurrentChordExact(symbol, notes, symbols, bassUser) {
    const chordConfig = globals.currentChordConfig()
    let [chord, bass] = removeBassSlash(symbol)
    bass = bassUser ? bassUser : bass
    fillInChordConfig2(chordConfig, chord, symbols, notes, bass)
    expandChordConfig(chordConfig)
    updateProjectChordConfig(chordConfig)
}
