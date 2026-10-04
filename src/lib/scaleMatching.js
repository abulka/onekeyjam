// @ts-check
import { chordScaleNamesFor } from './chordScaleEngine.js';

/**
 * @typedef {object} ChordInfo
 * @property {string} [symbol] an explicit chord symbol, when trusted
 * @property {Array<string>} [notes] the chord voicing, used to infer the chord
 * @property {string} [bass] the bass note, used as a root hint
 * @property {string} [name] the chord config name, used as a root hint
 */

/** @param {Array<string>} names */
function padToThree(names) {
    return [names[0] ?? '', names[1] ?? '', names[2] ?? ''];
}

/**
 * Find the scales that fit with this chord.
 *
 * Candidate scales are generated and ranked by `chordScaleEngine.js`; see
 * doco/MUSIC-THEORY.md for the theory. This wrapper keeps the historical API.
 *
 * @param {Array<string>} detectedChordSymbols custom or Tonal symbols.
 * @param {boolean} [simple=true] if true, only the first chord symbol is used.
 * @param {ChordInfo} [chordInfo] extra hints, used when the symbols are empty
 *   or not valid Tonal symbols.
 * @param {{tonic?:string, type?:string, colour?:string}|string} [key] optional project key context.
 * @returns {Array<string>} array of scale names viz. [scale1, scale2, scale3] incl tonic
 */
export function findTop3MatchingScales(detectedChordSymbols, simple = true, chordInfo = {}, key) {
    const symbols = (detectedChordSymbols ?? []).filter((symbol) => symbol);

    if (symbols.length === 0)
        return padToThree(chordScaleNamesFor(chordInfo, 3, key));

    if (simple || symbols.length === 1)
        return padToThree(chordScaleNamesFor({ ...chordInfo, symbol: symbols[0] }, 3, key));

    if (symbols.length === 2) {
        const scale1 = chordScaleNamesFor({ ...chordInfo, symbol: symbols[0] }, 1, key)[0] ?? '';
        const [scale2, scale3] = chordScaleNamesFor({ ...chordInfo, symbol: symbols[1] }, 2, key);
        return [scale1, scale2 ?? '', scale3 ?? ''];
    }

    return symbols.slice(0, 3).map((symbol) => chordScaleNamesFor({ ...chordInfo, symbol }, 1, key)[0] ?? '');
}

/**
 * Fill in any blank scale1/scale2/scale3 entries on a chord config, taking the
 * best ranked scales that are not already in the config.
 * @param {*} chordConfig
 * @param {ChordInfo} [chordInfo]
 * @param {{tonic?:string, type?:string, colour?:string}|string} [key] optional project key context
 */
export function fillMissingScales(chordConfig, chordInfo = {}, key) {
    const input = {
        ...chordInfo,
        symbol: chordConfig.chord ?? chordInfo.symbol,
        notes: chordConfig.chordNotes,
        bass: chordConfig.bass ?? chordConfig.bassNote,
        name: chordConfig.name,
    };
    const ranked = chordScaleNamesFor(input, 6, key);
    const taken = new Set(['scale1', 'scale2', 'scale3']
        .map((key) => chordConfig[key])
        .filter(Boolean)
        .map((name) => name.toLowerCase()));
    let next = 0;
    for (const key of ['scale1', 'scale2', 'scale3']) {
        if (chordConfig[key])
            continue;
        while (next < ranked.length && taken.has(ranked[next].toLowerCase()))
            next++;
        chordConfig[key] = ranked[next] ?? '';
        if (chordConfig[key])
            taken.add(chordConfig[key].toLowerCase());
        next++;
    }
    return chordConfig;
}
