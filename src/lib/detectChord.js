// @ts-check
import * as Tonal from '@tonaljs/tonal';
import { removeBassSlash } from "./removeBassSlash.js";
import { fillMissingScales } from './scaleMatching.js';
import { globals } from './globals.js';

/**
 * @module lib/detectChord
 * @desc Fills in a chord config's chord, symbols and scale info from notes.
 *
 * Kept separate from `build-project.js` so that `expandChordConfig.js` can use
 * it without importing `build-project.js`, which imports `expandChordConfig.js`
 * (previously an import cycle).
 */

const debug = {
    tonal_chord_detect: false,
}

export function detectChordAndScalesFromChordNotes(chordConfig, chordNotes, _bassNote, name) {
    // Fills in the chord config with the detected chord, symbols and scale info from the chordNotes
    // Avoids filling in `.name`, `.bass` or `.scale{1,2,3}` if they are already set.
    // returns true if succeeded the detection

    // The bass note is currently ignored during detection. Surface this as a
    // granular UI option one day (TODO), but for now just detect from chordNotes.
    let _chordNotes = chordNotes.slice()

    /** @type {Array<string>} */
    const detectedChordSymbols = Tonal.Chord.detect(_chordNotes)  // e.g. ['Am#5', 'FM/A'] 

    if (detectedChordSymbols.length > 0) {
        // Chord detection worked, name the chord config entries
        chordConfig.symbols = detectedChordSymbols.toString()

        if (!chordConfig.name)
            chordConfig.name = name
        if (chordConfig.name == chordConfig.symbols)
            chordConfig.name = `Chord ${chordConfig.id}`
        chordConfig.name += ' (chord was auto detected)'

        let [symbol, bass] = removeBassSlash(detectedChordSymbols[0])
        chordConfig.chord = symbol

        if (!chordConfig.bass)
            chordConfig.bass = bass
    } else if (globals.importMidiUnrecognisedChords) {
        chordConfig.name = 'Unrecognised chord'
        chordConfig.chord = chordNotes.join()
        chordConfig.symbols = ''
        chordConfig.bass = Tonal.Note.get(chordNotes[0]).pc
        chordConfig.scale1 = chordConfig.scale2 = chordConfig.scale3 = 'C major'
        return true
    }
    else {
        // Skip chords that Tonal can't detect
        const msg = `Unknown (notes: ${chordNotes.join()}) in config ${name}`
        if (debug.tonal_chord_detect)
            console.log('Tonal cannot detect, skipping', msg)
        return false
    }

    // Use the chord's section key, or the project key when it has none (for
    // example a chord added to an existing project), when one is already
    // resolved. During boot the key may not be set yet, in which case the
    // scales are key-free until the project re-ranks. The live transposition
    // offset, if any, is part of the resolved key.
    fillMissingScales(chordConfig, { notes: _chordNotes, bass: _bassNote, name }, globals.getChordKey(chordConfig) ?? undefined);

    return true
}
