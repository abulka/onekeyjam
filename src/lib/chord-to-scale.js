// @ts-check
import { chordScaleNameFor, compatibleScaleTypesFor } from './chordScaleEngine.js';

/*
 * Chord to scale lookups.
 *
 * The ranking lives in chordScaleEngine.js; see doco/MUSIC-THEORY.md.
 */

/** @param {string|Array<string>} chordSymbol */
function firstSymbol(chordSymbol) {
    return Array.isArray(chordSymbol) ? chordSymbol[0] : chordSymbol;
}

/**
 * All scale types compatible with the chord, best first.
 * @param {string|Array<string>} chordSymbol
 * @returns {Array<string>} scale type names e.g. ['dorian', 'aeolian', 'minor pentatonic']
 */
export function chordSymbolToScaleNames(chordSymbol) {
    return compatibleScaleTypesFor(firstSymbol(chordSymbol));
}

/**
 * The nth best scale name for the chord, including the tonic.
 * @param {string|Array<string>} chordSymbol
 * @param {number} [variation=1] 1-based
 * @returns {string} e.g. 'C dorian'
 */
export function chordSymbolToScaleName(chordSymbol, variation = 1) {
    return chordScaleNameFor(firstSymbol(chordSymbol), variation);
}
