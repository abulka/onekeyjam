// @ts-check
import { globals } from './globals.js';
import { applyChordKeySettings, applyProjectKeySettings } from './projectScaleSettings.js';
import { isChordKeyLocked, projectKeyName, resolveProjectKey } from './projectKey.js';

/**
 * @module lib/keyGroupApply
 * @desc Writing detected key groups onto the project. Extracted from the Key
 * Detection component so the manual Apply buttons and the automatic mode use
 * one code path. Locked chords are always skipped. See doco/MULTI-KEY.md.
 */

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").ProjectKey} ProjectKey */

/**
 * The readings offered for a group, best first. Older groups without carried
 * alternatives fall back to the group's own key.
 * @param {{keyName?: string, key?: ProjectKey, alternatives?: Array<{keyName:string, key:ProjectKey}>}} group
 * @returns {Array<{keyName:string, key:ProjectKey}>}
 */
export function alternativesFor(group) {
    if (Array.isArray(group.alternatives) && group.alternatives.length > 0)
        return group.alternatives;
    return group.key ? [{ keyName: group.keyName, key: group.key }] : [];
}

/**
 * The reading the user has chosen for a group, or the top one.
 * @param {{keyName?: string, key?: ProjectKey, selectedKeyName?: string, alternatives?: Array<{keyName:string, key:ProjectKey}>}} group
 */
export function selectedAlternative(group) {
    const alternatives = alternativesFor(group);
    return alternatives.find((alternative) => alternative.keyName === group.selectedKeyName) ?? alternatives[0];
}

/**
 * Write a group's chosen key onto its unlocked chords. When the reading matches
 * the project key the chords' own keys are cleared so they use the fallback.
 * @param {{keyName?: string, key?: ProjectKey, selectedKeyName?: string, chords:ChordConfig[], alternatives?: Array<{keyName:string, key:ProjectKey}>}} group
 * @param {string} [projectKeyNameOverride]
 * @returns {boolean} whether anything was written
 */
export function applyGroupKey(group, projectKeyNameOverride) {
    const alternative = selectedAlternative(group);
    if (!alternative || !alternative.key)
        return false;
    const projectKey = projectKeyNameOverride ?? projectKeyName(resolveProjectKey(globals.project));
    const unlocked = group.chords.filter((chordConfig) => !isChordKeyLocked(chordConfig));
    if (unlocked.length === 0)
        return false;
    const key = alternative.keyName === projectKey
        ? null
        : { tonic: alternative.key.tonic, type: alternative.key.type };
    applyChordKeySettings(unlocked, key, 'detected');
    return true;
}

/**
 * Apply every group at once, the automatic-mode action. The first group becomes
 * the project key (saved as source 'detected') and its unlocked chords fall
 * back to it; later groups become section keys against that new project key.
 * Locked chords are left alone.
 * @param {Array<{keyName?: string, key?: ProjectKey, selectedKeyName?: string, chords:ChordConfig[], alternatives?: Array<{keyName:string, key:ProjectKey}>}>} groups
 * @returns {{applied: boolean, projectKey?: {tonic:string, type:string}}}
 */
export function applyDetectedGroups(groups) {
    if (!Array.isArray(groups) || groups.length === 0)
        return { applied: false };
    const firstAlternative = selectedAlternative(groups[0]);
    if (!firstAlternative || !firstAlternative.key)
        return { applied: false };
    const newProjectKeyName = firstAlternative.keyName;

    // Later groups are written against the new project key, so a group that
    // reads as the project key clears its chords' own keys.
    for (const group of groups.slice(1))
        applyGroupKey(group, newProjectKeyName);

    // The first group becomes the fallback, so clear its unlocked chords' keys.
    const firstUnlocked = groups[0].chords.filter((chordConfig) => !isChordKeyLocked(chordConfig));
    if (firstUnlocked.length > 0)
        applyChordKeySettings(firstUnlocked, null, 'detected');

    applyProjectKeySettings({
        tonic: firstAlternative.key.tonic,
        type: firstAlternative.key.type,
        source: 'detected',
    });
    return { applied: true, projectKey: { tonic: firstAlternative.key.tonic, type: firstAlternative.key.type } };
}
