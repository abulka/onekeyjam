// @ts-check
import * as Tonal from "@tonaljs/tonal";
import { bassNoteOctave } from './settings.js';  // if running via node, need '../../src/lib/settings.js' or './settings.js' 
import { removeBassSlash } from "./removeBassSlash.js";
import { getRandomArbitary } from './util.js';
import { chordSymbolToNotes } from './chordSymbolToNotes';
import { scaleNameToNotes, chordNotesToScaleNotes } from './scaleToNotes';
import { suggestBass } from './note-tools';
import { detectChordAndScalesFromChordNotes } from './detectChord.js';
import { fillMissingScales } from './scaleMatching.js';
import { globals } from './globals.js';

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").ScaleNotes} ScaleNotes */

/**
 * @module lib/expandChordConfig
 * @desc Various expansion algorithms.
*/


/**
 * Expands a chord config so that all the notes are worked out and all fields
 * exist.
 * @param {ChordConfig} config 
 * @returns Nothing (in place)
 * - scale notes are always expanded and overwritten
 * - chord notes are _not_ expanded, if they already exist in the config
 * - `bassNote` is _not_ overwritten if it exists in the config, both `bass` and
 *   `bassNote` are filled in to be consistent with each other. Pretty sure
 *   `bass` may have an octave in it, too, and `bassNote` always has an octave
 *   in it.
 * - will auto find matching scales names if not supplied - if any entries are blank, 
 *   they will be filled in 
 */
export function expandChordConfig(config) {
    // Id
    if (config.id == undefined) {
        config.id = getRandomArbitary(500, 1000000);
    }

    // Symbols
    if (!config.symbols) {
        config.symbols = ''
    }

    if (!config.chord) {
        if (!config.chordNotes)
            throw new Error('chord or chordNotes is required')
        detectChordAndScalesFromChordNotes(config, config.chordNotes, config.bassNote, config.name)
    }

    // Fill in chordNotes if not supplied (chordNotes take precedence over the chord name)
    if (!config.chordNotes || config.chordNotes.length == 0) {
        if (!config.chord) {
            if (config.symbols) {
                let [symbol, bass] = removeBassSlash(config.symbols.split(',')[0])
                config.chord = symbol
                config.bass = bass
            } else {
                throw (new Error(`Chord config ${config.id} has no chord or chordNotes or symbols`))
            }
        }
        config.chordNotes = chordSymbolToNotes(config.chord)
    }

    // typescript/jsdoc reckons there may be a way through the above logic where config.chord
    // remains unassigned, so we need to check for it here to avoid red underline error.
    if (config.chord == undefined)
        throw (new Error(`Chord config ${config.id} has no chord and we could not detect it`))

    // Auto find matching scales if not supplied - if any entries are blank,
    // they will be filled in using the project key when one is resolved.
    fillMissingScales(config, {}, globals.projectKey ?? undefined)

    // Fill in scale notes, also ensure all scale keys exist
    for (let key of ['scale1', 'scale2', 'scale3']) {
        if (config[key] == undefined)
            config[key] = ''
        const scaleName = config[key]
        config[`${key}Notes`] = (scaleName == 'notes of chord') ?
            chordNotesToScaleNotes(config.chordNotes, config.bass) :
            scaleNameToNotes(scaleName)
    }
    
    config.scaleNotesOfChord = chordNotesToScaleNotes(config.chordNotes, config.bass)

    // If bass or bass note supplied use that, otherwise default to lowest note in chord
    let bassObj
    if (config.bassNote) {
        bassObj = Tonal.Note.get(config.bassNote)
        if (bassObj.empty)
            console.log('.bassNote bad', config.bassNote)
    }
    else if (config.bass) {
        bassObj = Tonal.Note.get(config.bass)
        if (bassObj.empty)
            console.log('.bass bad', config.bass)
    }
    else {
        bassObj = suggestBass(config.chordNotes)
        if (bassObj.empty)
            console.log('suggestBass bad', bassObj, config.chordNotes)
    }

    if (bassObj.empty)
        throw (new Error(`expanding chord config, bassNote ${config.bassNote} is not a valid note`))

    if (bassObj.oct === undefined)
        bassObj = Tonal.Note.get(`${bassObj.pc}${bassNoteOctave}`)

    config.bassNote = bassObj.name
    config.bass = bassObj.pc
}

