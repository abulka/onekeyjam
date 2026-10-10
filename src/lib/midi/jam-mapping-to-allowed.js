import * as Tonal from "@tonaljs/tonal";
import { globals } from "../globals.js";  // globals.jamTriggerOctave is set here!! 
import { isInNextOctave } from "../note-tools.js"

/**
 * @module lib/jam-mapping-to-allowed
 * @desc Contains buildNoteMap and utility functions.
 */

/** @typedef {import("../typedefs").ScaleTriggerMap} ScaleTriggerMap */

const maxOctave = 9

/**
 * Creating a mappings object of trigger note -> allowed note
 *
 * @param {Array} rhNotesScale -   The scale notes - no octave numbers
 * @param {int} numLhTriggers -    Number of lh trigger notes, which pushes the
 *                                 jam octave upwards to nearest octave not
 *                                 occupied by lh trigger notes.
 * @param {int} lhTriggerOctave -  The octave of the lh trigger notes
 * @param {int} rhJamSoundOctave - The octave of the rh jam sound, thus the
 *                                 first note of rhNotesScale (the jam scale)
 *                                 will have this octave
 * @param {object} options -       Options object, where: 
 *   - .strategy: `CToScaleTonic` or `CToC`,
 *   - .preserveOctaves: boolean,
 *   - .padWithLastGoodNote: boolean (for use with 'preserveOctaves' option)
 *   - .autoDropOctave: boolean (for use with 'CToScaleTonic' strategy)
 *   - .backfill: boolean (backfill Into Previous Chord Trigger Octave)
 *
 * Strategies:
 *   - `CToScaleTonic` - maps real C4 to tonic of scale then fills upwards from
 *     there, allocating scale notes
 *   - `CToC` - preserves C4 - maps real C4 to scale C4 (or closest) then fills
 *     upwards from there, allocating scale notes
 *
 * Options:
 *   - preserveOctaves - whenever there is an octave crossing in the scale being
 *     allocated, pad with blanks till the real note catches up. 
 *       - Note: when the strategy is 'CToScaleTonic' preserve octaves works a
 *         bit differently - cos octave shift happens in allowed notes very
 *         quickly. Its about preserving the C to ScaleTonic mapping on octave
 *         boundaries, so that each octave C will be a scale tonic. Each octave
 *         can contain mappings to notes in different octaves e.g. { C4: 'G4',
 *         D4: 'A4', E4: 'B4', F4: 'D5', G4: 'E5', A4: '', B4: '', C5: 'G5' }
 *         but that's ok.
 *   - autoDropOctave - only applies to CToScaleTonic strategy - shifts the
 *     mapping downwards by an octave if it reduces the pitch jump.
 *   - padWithLastGoodNote - pads with last good note if there are no more scale
 *     notes in that octave to allocate.
 *   - backfillIntoPreviousChordTriggerOctave - adds extra notes to the previous
 *     chord trigger octave to fill any gaps, giving extra jamming notes
 *
 * @returns {ScaleTriggerMap} - Mapping from {real played trigger note ->
 * allowed scale note} incl. octave numbers on both sides
*/
export function buildNoteMap(rhNotesScale, numLhTriggers, lhTriggerOctave, rhJamSoundOctave, options = undefined) {

    function _processOptions() {
        if (options === undefined)
            options = {
                strategy: '',
                preserveOctaves: false,
                padWithLastGoodNote: false,
                autoDropOctave: false,
                backfillIntoPreviousChordTriggerOctave: false,
            };
        if (!options.strategy)
            options.strategy = 'CToScaleTonic';
        if (!options.preserveOctaves)
            options.preserveOctaves = false;
        if (!options.padWithLastGoodNote)
            options.padWithLastGoodNote = false;
        if (!options.autoDropOctave)
            options.autoDropOctave = false;
        if (!options.backfillIntoPreviousChordTriggerOctave)
            options.backfillIntoPreviousChordTriggerOctave = false;
    }

    _processOptions();

    let { strategy, allowedNotes } = _makeRepeatingScale(rhNotesScale)  // pure notes, no octaves

    const jamTriggerOctave = _calcJamOctave(numLhTriggers, lhTriggerOctave)
    globals.jamTriggerOctave = jamTriggerOctave

    // When backfill is on and the chords overflow the trigger octave, the jam
    // octave floats up above the highest chord. The sound side must float with
    // it, otherwise the backfilled solo keys sound an octave below the key they
    // sit on. Without backfill there is no such problem, and the historical
    // behaviour is kept (the tests for the no-backfill path pin it).
    const soundAnchorOctave = options.backfill && Number.isFinite(jamTriggerOctave)
        ? Math.max(rhJamSoundOctave, jamTriggerOctave)
        : rhJamSoundOctave

    const allowedSoundNotes = _injectOctaves(
        allowedNotes,
        strategy,

        // allocate extra octave below for auto drop, 
        // and one more for possible backfill
        // and one more for pentatonic scales which consume more
        soundAnchorOctave - 3)

    let mapping = {}

    switch (options.strategy) {
        case 'CToScaleTonic': 
            mapping = createMappingC4ToScaleTonic(
                allowedSoundNotes,
                jamTriggerOctave,
                soundAnchorOctave,
                rhNotesScale[0], // viz. scaleTonicLetter
                numLhTriggers,
                rhNotesScale.length,
                options,
            );
            break;

        case 'CToC':
            mapping = createMappingC4ToC4(
                allowedSoundNotes,
                jamTriggerOctave,
                soundAnchorOctave,
                numLhTriggers,
                rhNotesScale.length,
                options,
            );
            break;

        default:
            // Old pure mapping, relies on allowedSoundNotes starting at 
            // rhJamSoundOctave (not rhJamSoundOctave - 1 like it is now).
            mapping = createMappingPure(allowedNotes, jamTriggerOctave)
            throw ('old pure scale mapping strategy deprecated')
    }

    // _dumpMapping(mapping)

    return mapping
}

function createMappingC4ToScaleTonic(allowedNotes, jamTriggerOctave, soundAnchorOctave, scaleTonic, numLhTriggers, scaleLength, options) {
    // Allocate the allowedNotes across a mapping of trigger note -> allowed
    // note beginning with firstJamTriggerNote. First entry in allowedNotes will
    // be the firstJamSound. Don't start allocating allowedNotes till we have an
    // allowed note in the correct rhJamSoundOctave.

    // console.log('allowedNotes', allowedNotes)

    function _doZip(mapping, allowedNotes, i, scaleTonic, options) {
        const preserveCtoScaleTonic = options.preserveOctaves
        let lastGoodNote = ''
        for (let realNote in mapping) {
            const scaleNoteObj = Tonal.Note.get(allowedNotes[i]);
            const triggerNoteObj = Tonal.Note.get(realNote);
            if (preserveCtoScaleTonic && scaleNoteObj.pc == scaleTonic && !(triggerNoteObj.letter == 'C')) {
                if (options.padWithLastGoodNote)
                    mapping[realNote] = lastGoodNote
                continue
            }
            mapping[realNote] = allowedNotes[i++];
            lastGoodNote = mapping[realNote]
        }
    }

    let mapping = _whiteTriggerNoteMapping(jamTriggerOctave, numLhTriggers, options.backfill)

    if (options.autoDropOctave && ['F#', 'G', 'G#', 'A', 'A#', 'B'].includes(scaleTonic))
        soundAnchorOctave--

    // scan forward through allowed notes till we find the first one we want
    let i = 0;
    let startNote = `${scaleTonic}${soundAnchorOctave}`
    while (i < allowedNotes.length) {
        if (allowedNotes[i] != startNote)
            i++
        else
            break
    }
    // scan backwards again allowing the backfill
    i = _scanBackwards(scaleLength, i, numLhTriggers, options.backfill, options.preserveOctaves);

    _doZip(mapping, allowedNotes, i, scaleTonic, options)
    return mapping;
}

function createMappingC4ToC4(allowedNotes, jamTriggerOctave, soundAnchorOctave, numLhTriggers, scaleLength, options) {
    // Allocate the allowedNotes across a mapping of trigger note -> allowed
    // note beginning with firstJamTriggerNote. First allowedNote allocated must
    // be C4 or closest note possible to C4. The idea of 'closest' could have
    // been tricky to ascertain but luckily its easy as the first allowed note
    // of every octave is the closest note to C anyway.

    function _doZip(mapping, allowedNotes, i, options) {
        let lastGoodNote = ''
        for (let realNote in mapping) {
            if (options.preserveOctaves && Tonal.Note.get(realNote).oct != Tonal.Note.get(allowedNotes[i]).oct) {
                if (options.padWithLastGoodNote)
                    mapping[realNote] = lastGoodNote
                continue
            }
            mapping[realNote] = allowedNotes[i++];
            lastGoodNote = mapping[realNote]
        }
    }

    let mapping = _whiteTriggerNoteMapping(jamTriggerOctave, numLhTriggers, options.backfill)

    // scan forward through allowed notes till we find the first one we want
    let i = 0;
    while (i < allowedNotes.length) {
        if (Tonal.Note.get(allowedNotes[i]).oct < soundAnchorOctave)
            i++
        else
            break
    }

    // scan backwards again allowing the backfill
    i = _scanBackwards(scaleLength, i, numLhTriggers, options.backfill, options.preserveOctaves);

    _doZip(mapping, allowedNotes, i, options)
    return mapping;
}

function createMappingPure(allowedNotes, jamTriggerOctave) {
    // Allocate the allowedNotes across a mapping of trigger note -> allowed
    // note beginning with firstJamTriggerNote. First entry in allowedNotes will
    // be the firstJamSound. This is a pure 'zip' of the dictionary with the
    // array.
    function _doZip(mapping, allowedNotes, i) {
        for (let realNote in mapping) {
            mapping[realNote] = allowedNotes[i++];
        }
    }
    const firstJamTriggerNote = `C${jamTriggerOctave}`
    let mapping = _generateWhiteJamTriggerNotes(firstJamTriggerNote);
    let i = 0;
    _doZip(mapping, allowedNotes, i)
    return mapping;
}

// ╦ ╦┌┬┐┬┬  
// ║ ║ │ ││  
// ╚═╝ ┴ ┴┴─┘

export function _calcJamOctave(numLhTriggers, lhTriggerOctave) {
    // Calculates the floating jam octave based on the number of LhTriggers notes used up
    let lowestChordTriggerNote = `C${lhTriggerOctave}`

    // how to do it using Tonaljs? Intervals of just white notes? Let's do it ourselves.
    const triggerNotes = Object.keys(_generateWhiteJamTriggerNotes(lowestChordTriggerNote))
    const highestTriggerNote = triggerNotes[numLhTriggers - 1]
    const highestTriggerOctave = Tonal.Note.get(highestTriggerNote).oct

    return highestTriggerOctave + 1  // use next octave for jamming
}

function _makeRepeatingScale(rhNotesScale) {
    /*
        Allocate the rhNotesScale notes as a repeating array containing
        _C where octave crossings occur, and - to separate the scale repetitions.
        @param {Array} rhNotesScale - the scale notes
        @result {object} - { strategy, allowedNotes }
        
        The returned field 'allowedNotes' is the repeating array e.g. [
        'C', 'D', 'E', 'F', 'G', 'A', '-', 'C', 'D', 'E', 'F', 'G',
        'A', '-', 'C', 'D', 'E', 'F', 'G', 'A', '-', 'C', 'D', 'E',
        'F', 'G', 'A', '-', 'C', 'D', 'E', 'F', 'G', 'A', '-', 'C',
        'D', 'E', 'F', 'G', 'A', '-', 'C', 'D', 'E', 'F', 'G', 'A',
        '-', 'C', 'D', 'E', 'F', 'G', 'A', '-', 'C', 'D', 'E', 'F',
        'G', 'A', '-', 'C', 'D', 'E', 'F', 'G', 'A', '-', 'C', 'D',
        'E', 'F', 'G', 'A', '-', 'C', 'D', 'E', 'F', 'G', 'A', '-',
        'C', 'D', 'E', 'F', 'G', 'A', '-', 'C', 'D', 'E', 'F', 'G',
        'A', '-', 'C', 'D',
        ... 600 more items
        ]

    */
    let { strategy, allowedNotes } = _addUnderscore(rhNotesScale)
    allowedNotes.push('-')  // used to indicate the end of the scale
    allowedNotes = new Array(100).fill(allowedNotes).flat()  // repeat the array 100 times
    return { strategy, allowedNotes }
}

/**
 * Adjust the index into the 'allowedNotes' scale array backwards to accomodate backfilling.
 * @param {number} scaleLength length of the scale being allocated
 * @param {number} i current offset into the 'allowedNotes' scale array, indicating which scale notes to begin allocating from
 * @param {number} numLhTriggers number of lh chord trigger notes
 * @param {boolean} backfill whether to backfill into the previous lh trigger octave, up until the highest lh chord trigger note
 * @param {boolean} preserveOctaves whether to keep the scale tonic on every C (in the case of CtoScaleTonic strategy) or
 *                                  whether to do something similar (in the case of CtoC strategy).
 * @returns {number} new offset into the 'allowedNotes' scale array
 */
function _scanBackwards(scaleLength, i, numLhTriggers, backfill, preserveOctaves) {
    if (backfill) {
        const rewindAmount = preserveOctaves ? scaleLength : 7;
        i -= (rewindAmount - numLhTriggers % 7); // scaleLength (usually 7) minus num triggers // HACK 7 white notes per octave 
        if (i < 0) {
            console.error(`Not enough allowedNotes provided to do a backfill, out by ${i}`);
            i = 0; // emergency repair
        }
    }
    return i;
}

/**
 * Generate an empty mappings object, filled with trigger note keys.
 * @param {boolean} backfill causes the generation of extra keys in the mapping which are below the main jam trigger note
 * @param {number} jamTriggerOctave which octave to start the mapping dictionary keys e.g. 4 means 'C4' wil be first key
 * @param {number} numLhTriggers number of lh chord trigger notes - used when 'backfill' is true
 * @returns {object} : {triggerNoteInclOct: string, toNoteInclOct: string} - all values are '' 
 */
function _whiteTriggerNoteMapping(jamTriggerOctave, numLhTriggers, backfill) {
    if (backfill)
        jamTriggerOctave--; // generate an extra octave of jam notes

    const firstJamTriggerNote = `C${jamTriggerOctave}`;
    let mapping = _generateWhiteJamTriggerNotes(firstJamTriggerNote);

    if (backfill) {
        // delete the jam notes taken up by lh trigger notes
        const keys = Object.keys(mapping);
        for (let i = 0; i < numLhTriggers % 7; i++) {  // HACK 7 white notes per octave 
            const key = keys[i];
            delete mapping[key];
        }
    }
    return mapping
}

function _injectOctaves(allowedNotes, strategy, allowedOctave) {
    // Inject the octave numbers into the 'allowedNotes' array beginning with 'allowedOctave'
    allowedNotes = allowedNotes.map(function (allowedNote) {
        if (allowedOctave >= maxOctave) {
            return 'X';
        }
        if (allowedNote === '-') {
            if (strategy == 1)
                allowedOctave += 1;
            return allowedNote;
        }
        // take into account the fact that the allowed note is in the next octave
        let octaveJump = allowedNote[0] === '_';
        if (octaveJump) {
            if (strategy != 2)
                throw new Error('octaveJump means strategy should be 2');
            allowedOctave++;
        }
        allowedNote = octaveJump ? allowedNote.slice(1) : allowedNote;
        let newNote = `${allowedNote}${allowedOctave}`;
        return newNote;
    });
    allowedNotes = allowedNotes.filter(note => (note != '-' && note !== 'X'));
    return allowedNotes;
}

// Debug helper, called manually (see the commented-out call above).
// eslint-disable-next-line no-unused-vars
function _dumpMapping(mappingToAllowed) {
    console.log('mappingToAllowed')
    for (const key in mappingToAllowed) {
        console.log(`  ${key}: ${mappingToAllowed[key]}`);
    }
}

/**
 * Adds a leading underscore to any C note in 'rhNotes' that is in the next octave
 * as compared to the octave of the first note in 'rhNotes'.
 * 
 * @param {Array} rhNotes the scale notes
 * @returns {object} - which is {strategy, allowedNotes} 
        - 'strategy' is 1 or 2 (1 means no underscore was added, 2 means an underscore was added). 
        - 'allowedNotes' is a copy 'rhNotes' with possibly a leading underscore added.
 */
export function _addUnderscore(rhNotes) {
    let allowedNotes = []
    let strategy  // The value 2 whenever there is a octave boundary crossing indicated by a note with a leading '_'
    let lastNote = undefined
    let encounteredUnderscore = false
    for (let note of rhNotes) {
        if (note[0] === '_') {
            // throw new Error('underscore in rhNotes, users should not need to specify underscores anymore')
            console.warn('underscore in rhNotes, users should not need to specify underscores anymore - repaired', rhNotes)
            note = note.slice(1)
        }

        // webmidijs doesn't like these type of references, so correct them
        if (note == 'Cb')
            note = 'B'
        if (note == 'Fb')
            note = 'E'

        if (lastNote && isInNextOctave(lastNote, note)) {
            note = `_${note}`
            encounteredUnderscore = true
        }

        allowedNotes.push(note)
        lastNote = note
    }
    strategy = encounteredUnderscore ? 2 : 1
    return { strategy, allowedNotes }
}

export const maxRealNoteName = 'C7'  // max trigger note - based on my Novation 61SL

/**
 * Generates an empty mapping (no values yet) beginning with `firstJamTriggerNote` up to `maxRealNoteName`
 * @param {string} firstJamNote - the first trigger note for jamming
 * @returns {string} mapping from real playedNote to note sound (all values are currently '')
 * 
 * Return mapping example:
 * {
 *   'C4': '',  // <-- firstJamTriggerNote
 *   'D4': '',
 *   'E4': '',
 *   'F4': '',
 *   'G4': '',
 *   'A4': '',
 *   'B4': '',
 *   'C5': '',
 * }
 * 
 * Stop allocating when we reach `maxRealNoteName`, typically `C7`.
 * 
 * In future may want to allocate to the left of firstJamTriggerNote to backfill the mapping
 * where there empty lh trigger notes (lh trigger notes didn't fill up the entire previous octave).
 */
export function _generateWhiteJamTriggerNotes(firstJamTriggerNote) {
    let mapping = {}
    let skip = true
    var range = max => Array.from(new Array(max), (_, i) => i)
    for (let octave of range(maxOctave)) {
        for (let note of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
            let noteName = `${note}${octave}`
            if (noteName == firstJamTriggerNote)
                skip = false  // start allocating
            if (noteName == maxRealNoteName)
                skip = true  // stop allocating again
            if (skip) continue
            mapping[`${note}${octave}`] = ''
        }
    }
    return mapping
}
