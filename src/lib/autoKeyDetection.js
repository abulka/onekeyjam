// @ts-check
import { globals } from './globals.js';
import { keyDetection } from './keyDetection.js';
import { suggestKeyGroups } from './keyGroupDetection.js';
import { applyDetectedGroups } from './keyGroupApply.js';
import { getProjectChordsTriggers } from './project-chord-triggers.js';
import { projectKeyName } from './projectKey.js';

/**
 * @module lib/autoKeyDetection
 * @desc Automatic key and multi-key detection. In auto mode the project key and
 * the per-chord section keys follow the grid: every edit re-detects the key
 * groups and writes them onto the project. A freshly loaded song is left as
 * authored until the first edit, and a toast warns when detection changes keys
 * so the user can switch to manual. See doco/MULTI-KEY.md.
 */

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */

/**
 * The chords currently on the grid, in trigger order, the same list the Key
 * Detection panel shows.
 * @returns {ChordConfig[]}
 */
function gridChords() {
    return getProjectChordsTriggers()
        .map((note) => globals.chordTriggerMap?.[note])
        .filter(Boolean);
}

/** @param {ChordConfig|undefined} chordConfig */
function chordKeyName(chordConfig) {
    return chordConfig && chordConfig.key ? `${chordConfig.key.tonic} ${chordConfig.key.type}` : '';
}

/** A snapshot of the project's keys, for detecting whether auto changed them. */
function snapshotKeys() {
    const declared = globals.project?.options?.key;
    const chords = Array.isArray(globals.project?.chords) ? globals.project.chords : [];
    return {
        projectKey: declared ? `${declared.tonic} ${declared.type}` : '',
        chordKeys: chords.map((chordConfig) => `${chordConfig.id}:${chordKeyName(chordConfig)}`).join('|'),
    };
}

/** @param {ReturnType<typeof snapshotKeys>} before @param {ReturnType<typeof snapshotKeys>} after */
function keysChanged(before, after) {
    return before.projectKey !== after.projectKey || before.chordKeys !== after.chordKeys;
}

function warnAutoKeysChanged() {
    if (typeof $ === 'undefined')
        return;
    try {
        $('body').toast({
            message: 'Auto key detection changed the keys. Switch Key Detection to Manual if you want to set keys by hand.',
            displayTime: 5000,
            class: 'brown',
        });
    }
    catch (error) {
        // A missing jQuery toast must never break key detection.
    }
}

/**
 * The Auto-mode badge. Auto detection owns the keys, so the manual
 * declared-versus-detected comparison does not apply; instead this describes
 * the auto status. The project key is shown by the panel itself, and the group
 * whose key matches it is tagged in the summary.
 * @param {Array<{keyName?: string, key?: import("./typedefs").ProjectKey, chords: Array<unknown>}>} [groups] effective key groups in grid order
 * @param {import("./typedefs").ProjectKey} [projectKey] the resolved project key
 * @returns {{label: string, title: string}}
 */
export function describeAutoKey(groups, projectKey) {
    const areas = Array.isArray(groups) ? groups.length : 0;
    if (areas === 0)
        return {
            label: 'auto',
            title: 'Auto key detection is on. Add chords and the project key will be detected.',
        };
    const label = `auto · ${areas} key area${areas === 1 ? '' : 's'}`;
    const name = projectKeyName(projectKey);
    const title = name
        ? `Auto key detection: the project key is ${name}. The key areas shown follow the grid; editing it re-detects them. Switch to Manual to set keys by hand.`
        : 'Auto key detection: the key areas follow the grid; editing it re-detects them. Switch to Manual to set keys by hand.';
    return { label, title };
}

/**
 * Refresh the Key Detection panel for a freshly loaded song. Auto mode leaves
 * the authored keys alone until the first grid edit.
 */
export function detectKeysForLoad() {
    return keyDetection();
}

/**
 * Refresh the panel after a grid edit. In auto mode the key groups are
 * re-detected and applied; in manual mode this is the same as keyDetection().
 */
export function detectKeysAfterEdit() {
    const before = snapshotKeys();
    const result = keyDetection();
    if (!globals.isProjectLoaded || globals.keyDetectionMode !== 'auto')
        return result;
    const groups = suggestKeyGroups(globals.project, gridChords(), { sensitivity: globals.keyDetectionSensitivity });
    if (groups.length === 0)
        return result;
    const applied = applyDetectedGroups(groups);
    if (applied.applied && keysChanged(before, snapshotKeys()))
        warnAutoKeysChanged();
    return result;
}
