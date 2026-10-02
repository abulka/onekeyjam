// @ts-check
import * as Tonal from '@tonaljs/tonal';
import { removeBassSlash } from "./removeBassSlash.js";
import { findTop3MatchingScales } from './scaleMatching.js';
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

export function detectChordAndScalesFromChordNotes(chordConfig, chordNotes, bassNote, name) {
    // Fills in the chord config with the detected chord, symbols and scale info from the chordNotes
    // Avoids filling in `.name`, `.bass` or `.scale{1,2,3}` if they are already set.
    // returns true if succeeded the detection

    // Take into account the bass note when doing the detection, though sometimes this is not a
    // good thing to do.  Surface this as a granular option in the UI one day - but for now
    // we'll just ignore the bass note.
    let _chordNotes = chordNotes.slice()
    if (bassNote && false)  // TODO: make this a granular UI option instead of always false.
        _chordNotes.unshift(bassNote)

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

    let [scale1, scale2, scale3] = findTop3MatchingScales(detectedChordSymbols);
    chordConfig.scale1 = chordConfig.scale1 ? chordConfig.scale1 : scale1;
    chordConfig.scale2 = chordConfig.scale2 ? chordConfig.scale2 : scale2;
    chordConfig.scale3 = chordConfig.scale3 ? chordConfig.scale3 : scale3;

    return true
}
