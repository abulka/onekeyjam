// @ts-check
import { chordSymbolToScaleName } from './chord-to-scale.js';

/**
 * Find the scales that fit with this chord.
 *
 * This lives in its own module (rather than `findMatchingScales.js`) so that
 * both `expandChordConfig.js` and `findMatchingScales.js` can use it without
 * importing each other, which previously formed an import cycle.
 *
 * @param {Array<string>} detectedChordSymbols custom or Tonal symbols.
 * @param {boolean} [simple=true] if true, only the first chord symbol is used.
 * @returns {Array<string>} array of scale names viz. [scale1, scale2, scale3] incl tonic
 *
 * Re `simple` If true (default), only the first chord symbol is used, trying to
 * keep all scales based on the same tonic as the chord. if false, spreads the
 * scale allocations across all the chord symbols detected e.g. ['CM', 'Em#5/C']
 * will give 'C lydian', 'E harmonic minor', 'E phrygian' which confuses the UI.
 *
 * Re `detectedChordSymbols` e.g. `['Am#5', 'FM/A']`. Each chord symbol can be:
 * - custom string scale name found in config.js e.g. `"CmScaleBlues"`
 * - string scale name known by Tonal e.g. `"c major pentatonic"`
 *
 * @example
 * const [scale1, scale2, scale3] = findTop3MatchingScales([chordSymbolInclRoot])
 * // ['G lydian', 'G major', 'G major pentatonic']
 */
export function findTop3MatchingScales(detectedChordSymbols, simple = true) {
    let scale1, scale2, scale3 = undefined;

    if (simple) // remove all the other elements from the array except the first one
        detectedChordSymbols = [detectedChordSymbols[0]];

    if (detectedChordSymbols.length == 1) {
        scale1 = chordSymbolToScaleName(detectedChordSymbols[0], 1); // first chord symbol, variation 1
        scale2 = chordSymbolToScaleName(detectedChordSymbols[0], 2); // first chord symbol, variation 2
        scale3 = chordSymbolToScaleName(detectedChordSymbols[0], 3); // first chord symbol, variation 3
    }
    else if (detectedChordSymbols.length == 2) {
        scale1 = chordSymbolToScaleName(detectedChordSymbols[0], 1); // first chord symbol, variation 1
        scale2 = chordSymbolToScaleName(detectedChordSymbols[1], 1); // second chord symbol, variation 1
        scale3 = chordSymbolToScaleName(detectedChordSymbols[1], 2); // second chord symbol, variation 2
    }
    else if (detectedChordSymbols.length >= 3) {
        scale1 = chordSymbolToScaleName(detectedChordSymbols[0], 1); // first chord symbol, variation 1
        scale2 = chordSymbolToScaleName(detectedChordSymbols[1], 1); // second chord symbol, variation 1
        scale3 = chordSymbolToScaleName(detectedChordSymbols[2], 1); // third chord symbol, variation 1
    }
    else {
        scale1 = ''
        scale2 = ''
        scale3 = ''
    }
    return [scale1, scale2, scale3];
}
