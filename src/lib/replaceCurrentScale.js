import * as Tonal from "@tonaljs/tonal";
import { globals } from "./globals.js"
import { updateProjectChordConfig } from './projectConfig';
import {expandChordConfig} from './expandChordConfig.js';

export function replaceCurrentScale() {
    // update the chord trigger map chord config with the current (global) scale combo info
    // viz. a new scale name and scale notes
    const tonic = globals.scaleFiltering.scaleTonic
    const type = globals.scaleFiltering.scaleType
    const chordConfig = globals.currentChordConfig()

    // update chord config in the chord trigger map 
    chordConfig[globals.currentScaleFilter] = `${tonic} ${type}`
    chordConfig[`${globals.currentScaleFilter}Notes`] = []  // this will be regenerated in next line

    expandChordConfig(chordConfig)  // update other fields in this chord triggermap chord config
    updateProjectChordConfig(chordConfig)  // update the project config too
}

export function setScaleToNotesOfChord() {
    const chordConfig = globals.currentChordConfig()
    chordConfig[globals.currentScaleFilter] = 'notes of chord'
    chordConfig[`${globals.currentScaleFilter}Notes`] = []  // this will be regenerated in next line

    expandChordConfig(chordConfig)  // update other fields in this chord triggermap chord config
    updateProjectChordConfig(chordConfig)  // update the project config too
}
