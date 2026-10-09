// @ts-check
import * as Tonal from '@tonaljs/tonal';
import { rankedKeysFromChords, rankedKeysFromNotes } from './keyFromChords.js';
import { normalizeKey, projectKeyName } from './projectKey.js';

/**
 * @module lib/keyGroupDetection
 * @desc Experimental key signature group detection. Scores a sliding window of
 * the arranged chords to find where a tune changes key, so the Key Detection
 * panel can suggest groups to accept. This is a heuristic: it only tests major
 * and natural minor keys, and it works best on tunes with clear key centres.
 * Automatic application stays off; the user accepts suggestions by hand.
 * See doco/MULTI-KEY.md and doco/SCALE-POLICIES.md (Phase 5).
 */

/** @typedef {import("./typedefs").Project} Project */
/** @typedef {import("./typedefs").ChordConfig} ChordConfig */

const WINDOW_SIZE = 4;
const DETECT_OPTIONS = { useHitWeight: true, usePenalty: true };

/**
 * The full ranked major/minor keys for a window of chords. Chord symbols are
 * preferred; the sounding notes are the fallback.
 * @param {ChordConfig[]} chords
 */
function rankWindow(chords) {
    const symbols = chords
        .map((chord) => chord.chord)
        .filter((symbol) => symbol && !Tonal.Chord.get(symbol).empty);
    let stats = symbols.length > 0 ? rankedKeysFromChords(symbols, DETECT_OPTIONS) : [];
    if (stats.length === 0) {
        const chordsAsNotes = chords
            .map((chord) => chord.chordNotes)
            .filter((notes) => Array.isArray(notes) && notes.length > 0)
            .map((notes) => notes.map((note) => Tonal.Note.get(note).pc));
        stats = chordsAsNotes.length > 0 ? rankedKeysFromNotes(chordsAsNotes, DETECT_OPTIONS) : [];
    }
    return stats;
}

/** @param {string} scaleName best-first key name e.g. "C major" */
function splitKeyName(scaleName) {
    const [tonic, ...typeParts] = scaleName.split(' ');
    return normalizeKey({ tonic, type: typeParts.join(' ') });
}

/** @param {string|undefined} note */
function chroma(note) {
    return note ? Tonal.Note.chroma(note) : Number.NaN;
}

/** The pitch class of each chord's root, from its symbol or its first note. */
function windowRootChromas(chords) {
    return chords.map((chord) => {
        const symbolRoot = chord.chord ? Tonal.Chord.get(chord.chord).tonic : undefined;
        const noteRoot = Array.isArray(chord.chordNotes) ? chord.chordNotes[0] : undefined;
        return chroma(symbolRoot || noteRoot);
    }).filter((value) => !Number.isNaN(value));
}

/**
 * Pick the best key from a window's ranked candidates. Major and its relative
 * minor often tie; prefer the candidate whose tonic matches the window's first
 * chord root, then any root, so a section that starts on its tonic is labelled
 * with the major/minor key the player expects.
 * @param {Array<{scaleName: string, score: number}>} stats
 * @param {ChordConfig[]} chords
 */
function chooseWindowKey(stats, chords, projectKey) {
    if (stats.length === 0 || stats[0].score <= 0)
        return null;
    const topScore = stats[0].score;
    const tied = stats.filter((stat) => stat.score === topScore);
    const roots = windowRootChromas(chords);
    const firstRoot = roots[0];
    const preferred = (projectKey ? tied.find((stat) => stat.scaleName === projectKey) : undefined)
        ?? tied.find((stat) => chroma(splitKeyName(stat.scaleName)?.tonic) === firstRoot)
        ?? tied.find((stat) => stat.scaleName.endsWith(' major'))
        ?? tied[0];
    const runnerUp = stats.find((stat) => stat.scaleName !== preferred.scaleName)?.score ?? 0;
    return { keyName: preferred.scaleName, margin: topScore - runnerUp };
}

/**
 * Suggest key signature groups for the arranged chords. Returns one entry per
 * run of chords that share a locally detected key, with a confidence based on
 * the margin over the runner-up key. Returns an empty array when fewer than two
 * distinct keys are found, so a single-key tune is never "suggested" anything.
 * @param {Project} [project]
 * @param {ChordConfig[]} [chordConfigs] arranged chords, in order
 * @param {{windowSize?: number}} [options]
 * @returns {Array<{keyName: string, key: import("./typedefs").ProjectKey|undefined, chords: ChordConfig[], confidence: number}>}
 */
export function suggestKeyGroups(project, chordConfigs, options = {}) {
    const chords = Array.isArray(chordConfigs) ? chordConfigs : [];
    const n = chords.length;
    if (n < WINDOW_SIZE)
        return [];
    const windowSize = Math.max(2, Math.min(options.windowSize ?? WINDOW_SIZE, n));
    const declaredKey = normalizeKey(project && project.options && project.options.key);
    const declaredKeyName = declaredKey ? `${declaredKey.tonic} ${declaredKey.type}` : '';

    // Score non-overlapping windows. Coarser than a per-chord window, but far
    // more stable: a passing chord cannot invent a one-chord key group.
    /** @type {Array<{keyName: string, chords: ChordConfig[], margins: number[]}>} */
    const runs = [];
    for (let start = 0; start < n; start += windowSize) {
        const windowChords = chords.slice(start, start + windowSize);
        const chosen = chooseWindowKey(rankWindow(windowChords), windowChords, declaredKeyName);
        const keyName = chosen ? chosen.keyName : '';
        const last = runs[runs.length - 1];
        if (last && last.keyName === keyName) {
            last.chords.push(...windowChords);
            if (chosen)
                last.margins.push(chosen.margin);
        }
        else {
            runs.push({ keyName, chords: [...windowChords], margins: chosen ? [chosen.margin] : [] });
        }
    }

    const named = runs.filter((run) => run.keyName);
    if (new Set(named.map((run) => run.keyName)).size < 2)
        return [];

    return runs.map((run) => ({
        keyName: run.keyName,
        key: run.keyName ? splitKeyName(run.keyName) : undefined,
        chords: run.chords,
        confidence: run.margins.length > 0
            ? run.margins.reduce((sum, margin) => sum + margin, 0) / run.margins.length
            : 0,
    }));
}

/** Was this suggestion's key the project key? Used to leave those chords as fallback. */
export function suggestionMatchesProjectKey(project, suggestion) {
    const projectName = projectKeyName(
        project && project.options && project.options.key
            ? normalizeKey(project.options.key)
            : undefined,
    );
    return !!projectName && suggestion.keyName === projectName;
}
