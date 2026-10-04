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
 * @param {{tonic?:string,type?:string}|string} [key] optional project key context
 * @returns {Array<string>} scale type names e.g. ['dorian', 'aeolian', 'minor pentatonic']
 */
export function chordSymbolToScaleNames(chordSymbol, key) {
    return compatibleScaleTypesFor(firstSymbol(chordSymbol), key);
}

/**
 * The nth best scale name for the chord, including the tonic.
 * @param {string|Array<string>} chordSymbol
 * @param {number} [variation=1] 1-based
 * @param {{tonic?:string,type?:string}|string} [key] optional project key context
 * @returns {string} e.g. 'C dorian'
 */
export function chordSymbolToScaleName(chordSymbol, variation = 1, key) {
    return chordScaleNameFor(firstSymbol(chordSymbol), variation, key);
}
