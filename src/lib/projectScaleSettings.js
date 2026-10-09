// @ts-check
import { globals } from './globals.js';
import { setProjectKey, setProjectColour, resolveProjectKey, setChordKey, clearChordKey } from './projectKey.js';
import { findMatchingScalesForAllProjectChords, reRankChordScales } from './findMatchingScales.js';
import { applyKeyScale, changeScaleFilter } from './change-scale.js';
import { clearScaleRankingCache } from './autoScale.js';
import { resetTranspositionsEtc } from './resetState.js';

/**
 * @module lib/projectScaleSettings
 * @desc Applies a change to the project key and/or colour and re-ranks every
 * chord scale in place. Used by the Key Detection section and the colour
 * selector. See doco/MUSIC-THEORY.md.
 */

/**
 * Set the project key and/or colour, then re-rank all chord scales with the
 * new context and refresh the active right-hand scale.
 * @param {{tonic?:string, type?:string, colour?:string, source?:'user'|'detected'}} [settings]
 * @returns {boolean} whether a key could be resolved
 */
export function applyProjectKeySettings(settings = {}) {
    // A live transposition has moved the sounding chords away from the written
    // project, so bring them back before re-ranking; otherwise the new key or
    // colour would be applied to transposed notes.
    if (globals.transpositionSemitones)
        resetTranspositionsEtc();

    if (settings.tonic && settings.type)
        setProjectKey(globals.project, { tonic: settings.tonic, type: settings.type }, settings.source ?? 'user');
    if (settings.colour)
        setProjectColour(globals.project, settings.colour);

    globals.projectKey = resolveProjectKey(globals.project) ?? null;
    if (!globals.projectKey)
        return false;

    findMatchingScalesForAllProjectChords(globals.project);
    clearScaleRankingCache();

    // Keep the sounding scale in step with the new settings. Frozen/override
    // states are respected by changeScaleFilter().
    if (globals.soloMode === 'key')
        applyKeyScale();
    else
        changeScaleFilter();
    return true;
}

/**
 * Set or clear the section key on one or more chords, re-ranking only those
 * chords' scales in the new key. Passing no key clears the override so the
 * chords follow the project key again. Used by the key group editor.
 * @param {import("./typedefs").ChordConfig|Array<import("./typedefs").ChordConfig>} chordConfigs
 * @param {{tonic:string, type:string}|null} [key]
 * @param {'user'|'detected'} [source]
 * @returns {boolean} whether the change was applied
 */
export function applyChordKeySettings(chordConfigs, key, source = 'user') {
    if (!globals.project || !chordConfigs)
        return false;

    // A live transposition has moved the sounding chords away from the written
    // project, so bring them back before re-ranking.
    if (globals.transpositionSemitones)
        resetTranspositionsEtc();

    const list = Array.isArray(chordConfigs) ? chordConfigs : [chordConfigs];
    for (const chordConfig of list) {
        if (!chordConfig)
            continue;
        if (key)
            setChordKey(chordConfig, key, source);
        else
            clearChordKey(chordConfig);
        reRankChordScales(globals.project, chordConfig);
    }

    clearScaleRankingCache();

    // Move the sounding scale with the change. If the active chord is one of
    // the edited ones, its scale has just been re-ranked; refresh it.
    if (globals.soloMode === 'key')
        applyKeyScale();
    else
        changeScaleFilter();
    return true;
}
