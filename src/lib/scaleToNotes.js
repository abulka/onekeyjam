import * as Tonal from '@tonaljs/tonal';
import * as db from './config.js';

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").ScaleNotes} ScaleNotes */

/**
 * @module lib/scaleToNotes
 * @desc Scale Note related.
*/


// ┌─┐┌─┐┌─┐┬  ┌─┐       ┌┬┐┌─┐       ┌┐┌┌─┐┌┬┐┌─┐┌─┐
// └─┐│  ├─┤│  ├┤   ───   │ │ │  ───  ││││ │ │ ├┤ └─┐
// └─┘└─┘┴ ┴┴─┘└─┘        ┴ └─┘       ┘└┘└─┘ ┴ └─┘└─┘

/**
 * Convert scale name to notes, looking up in the config.js file first, then via Tonal.Scale.get().
 * @param {string} name scale name e.g. "d dorian"
 * @returns {ScaleNotes}
 */
export function scaleNameToNotes(name) {
    if (!name)
        return []
    let result = db[name];  // db is both scales and chords, should separate them
    if (!result) {
        // Try looking up scale from Tonal
        let scale = Tonal.Scale.get(name);
        if (!scale.empty) {
            result = scaleObjToNotes(scale);
        }
        else {
            console.error('ERROR: scaleNameToNotes', name);
            result = [];
        }
    }
    return result;
}

export function chordNotesToScaleNotes(chordNotes, bass) {
    // Extract pure letters from chord (sans octave) and sort the scale notes
    // and start them on C or the closest to C so the scale trigger map gets
    // generated correctly
    let result = chordNotes.map(note => Tonal.Note.get(note).pc)
    result.unshift(bass)
    return Tonal.Note.sortedUniqNames(result)
}

/**
 * Convert Scale object into array of string notes, also repair the double
 * accidentals e.g. ## and bb that Tonal often produces. 
 * 
 * > TODO change type of parameter `scaleObj` from `object` to `Tonal.Scale` type.
 * 
 * @method
 * @param {object} scaleObj 
 * @returns {ScaleNotes}
 */
export const scaleObjToNotes = (scaleObj) => scaleObj.notes.map(note => Tonal.Note.simplify(note));

