// @ts-check
import { globals } from './globals.js';
import { setProjectKey, setProjectColour, resolveProjectKey } from './projectKey.js';
import { findMatchingScalesForAllProjectChords } from './findMatchingScales.js';
import { applyKeyScale, changeScaleFilter } from './change-scale.js';

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
    if (settings.tonic && settings.type)
        setProjectKey(globals.project, { tonic: settings.tonic, type: settings.type }, settings.source ?? 'user');
    if (settings.colour)
        setProjectColour(globals.project, settings.colour);

    globals.projectKey = resolveProjectKey(globals.project) ?? null;
    if (!globals.projectKey)
        return false;

    findMatchingScalesForAllProjectChords(globals.project);

    // Keep the sounding scale in step with the new settings. Frozen/override
    // states are respected by changeScaleFilter().
    if (globals.soloMode === 'key')
        applyKeyScale();
    else
        changeScaleFilter();
    return true;
}
