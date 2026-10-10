// @ts-check
import * as Tonal from '@tonaljs/tonal';
import { rankedKeysFromChords, rankedKeysFromNotes } from './keyFromChords.js';
import { normalizeKey } from './projectKey.js';

/**
 * @module lib/keyGroupDetection
 * @desc Experimental key signature group detection. Scores contiguous runs of
 * the arranged chords and searches for the partition (dynamic programming)
 * that best explains the music as a few key groups, so the Key Detection panel
 * can suggest groups to accept. The scoring combines pitch coverage with
 * function cues: a run that starts on its tonic or contains a V-I cadence is a
 * stronger reading than a run that merely shares the pitch content. Relative
 * keys tie on coverage, so each suggested group carries alternatives and the
 * user always picks the reading. Existing per-chord keys are anchors: detection
 * never crosses them. See doco/MULTI-KEY.md.
 */

/** @typedef {import("./typedefs").Project} Project */
/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").ProjectKey} ProjectKey */

const DETECT_OPTIONS = { useHitWeight: true, usePenalty: true };

/** A run that starts on its own tonic is a strong key signal. */
const START_TONIC_BONUS = 1.0;
/** A run that ends on its tonic is a little stronger too. */
const END_TONIC_BONUS = 0.6;
/** A V-I cadence inside the run is strong evidence for that key. */
const CADENCE_BONUS = 1.2;
/** Splitting a V-I resolution across two groups is a mistake, so discourage it. */
const SPLIT_CADENCE_PENALTY = 1.0;
/**
 * Two adjacent runs with the same shape (the same chord qualities and root
 * motions) are a sequence: parallel i-VI phrases in A minor and E minor, say.
 * A sequence is strong evidence that the second run is its own key.
 */
const SEQUENCE_BONUS = 1.2;
/**
 * Each extra group must earn its keep. Set above the per-pair tonic bonus so a
 * plain ii-V pair cannot invent a key on its own; a real modulation clears it
 * through coverage, a cadence or a sequence.
 */
const DEFAULT_SEGMENT_PENALTY = 2.8;
/** How many alternatives to carry per group. */
const TOP_ALTERNATIVES = 3;
/** Alternatives within this margin are reported as ambiguous. */
const AMBIGUITY_MARGIN = 0.5;
/** A single chord cannot be split, but detection still runs over short runs. */
const MIN_SEGMENT = 2;

/**
 * The full ranked major/minor keys for a run of chords. Chord symbols are
 * preferred; the sounding notes are the fallback.
 * @param {ChordConfig[]} chords
 */
function rankRun(chords) {
    const symbols = chords
        .map((chord) => chord.chord)
        .filter((symbol) => symbol && !parseSymbol(symbol).empty);
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

// Parse each distinct chord symbol once; the partition search revisits chords
// across many overlapping runs.
const parsedSymbolCache = new Map();

/** @param {string} symbol */
function parseSymbol(symbol) {
    if (!parsedSymbolCache.has(symbol))
        parsedSymbolCache.set(symbol, Tonal.Chord.get(symbol));
    return parsedSymbolCache.get(symbol);
}

/** The root pitch class and chord quality, or undefined when unresolvable. */
function chordInfoOf(chord) {
    if (!chord)
        return undefined;
    const symbol = chord.chord;
    if (symbol) {
        const parsed = parseSymbol(symbol);
        if (!parsed.empty && parsed.tonic) {
            return {
                rootChroma: chroma(parsed.tonic),
                quality: parsed.quality,
                intervals: parsed.intervals,
                noteCount: Array.isArray(chord.chordNotes) && chord.chordNotes.length > 0
                    ? chord.chordNotes.length
                    : parsed.notes.length || 4,
            };
        }
    }
    const notes = Array.isArray(chord.chordNotes) ? chord.chordNotes : [];
    if (notes.length > 0) {
        const root = Tonal.Chord.detect(notes)[0];
        const parsed = root ? Tonal.Chord.get(root) : undefined;
        return {
            rootChroma: chroma(notes[0]),
            quality: parsed && !parsed.empty ? parsed.quality : 'Unknown',
            intervals: parsed && !parsed.empty ? parsed.intervals : [],
            noteCount: notes.length,
        };
    }
    return undefined;
}

/** Is this chord the tonic of the key, with a matching major/minor quality? */
function isTonicChord(chord, key) {
    const info = chordInfoOf(chord);
    if (!info || Number.isNaN(info.rootChroma))
        return false;
    if (chroma(key.tonic) !== info.rootChroma)
        return false;
    if (key.type === 'minor')
        return info.quality === 'Minor';
    return info.quality === 'Major';
}

/** Is this chord the dominant seventh of the key? */
function isDominantChord(chord, key) {
    const info = chordInfoOf(chord);
    if (!info || Number.isNaN(info.rootChroma) || Number.isNaN(chroma(key.tonic)))
        return false;
    const fifth = (chroma(key.tonic) + 7) % 12;
    return info.rootChroma === fifth
        && info.quality === 'Major'
        && info.intervals.includes('7m');
}

/**
 * The function cues a run gives a candidate key: a tonic start, an ending on
 * the tonic, and any V-I cadence inside the run.
 */
function functionBonus(chords, key) {
    if (chords.length === 0)
        return 0;
    let bonus = 0;
    if (isTonicChord(chords[0], key))
        bonus += START_TONIC_BONUS;
    for (let i = chords.length - 1; i >= 1; i--) {
        if (isDominantChord(chords[i - 1], key) && isTonicChord(chords[i], key)) {
            bonus += CADENCE_BONUS;
            break;
        }
    }
    if (isTonicChord(chords[chords.length - 1], key))
        bonus += END_TONIC_BONUS;
    return bonus;
}

/** Break coverage ties: first-chord root first, then major over minor. */
function candidateTieBreak(a, b, chords) {
    const firstChroma = chords.length > 0 ? (chordInfoOf(chords[0])?.rootChroma ?? Number.NaN) : Number.NaN;
    const aFirst = Number.isNaN(firstChroma) ? 1 : (chroma(a.key.tonic) === firstChroma ? 0 : 1);
    const bFirst = Number.isNaN(firstChroma) ? 1 : (chroma(b.key.tonic) === firstChroma ? 0 : 1);
    if (aFirst !== bFirst)
        return aFirst - bFirst;
    const aMajor = a.key.type === 'major' ? 0 : 1;
    const bMajor = b.key.type === 'major' ? 0 : 1;
    return aMajor - bMajor;
}

/**
 * The candidate keys for a run, best first. Coverage is normalised per chord
 * tone so runs of different lengths can be compared, then the function cues are
 * added.
 * @param {ChordConfig[]} chords
 * @returns {Array<{keyName: string, key: ProjectKey, score: number}>}
 */
function candidatesForRun(chords) {
    const stats = rankRun(chords);
    if (stats.length === 0)
        return [];
    const noteCount = chords.reduce((sum, chord) => sum + (chordInfoOf(chord)?.noteCount ?? 4), 0) || chords.length * 4;
    const candidates = [];
    for (const stat of stats) {
        if (stat.score <= 0)
            continue;
        const key = splitKeyName(stat.scaleName);
        if (!key)
            continue;
        candidates.push({
            keyName: stat.scaleName,
            key,
            score: stat.score / noteCount + functionBonus(chords, key),
        });
    }
    candidates.sort((a, b) => (b.score - a.score) || candidateTieBreak(a, b, chords));
    return candidates;
}

/**
 * Adjust the score when a boundary falls between two groups. Splitting a
 * dominant from its tonic is discouraged, because a V-I resolution is exactly
 * the evidence that the two chords belong to the same key.
 */
function boundaryAdjustment(previousKey, nextKey, previousChord, nextChord) {
    if (!previousKey || previousKey.keyName === nextKey.keyName)
        return 0;
    if (isDominantChord(previousChord, nextKey) && isTonicChord(nextChord, nextKey))
        return -SPLIT_CADENCE_PENALTY;
    return 0;
}

/**
 * The shape of a run: each chord's quality plus the root motion from the
 * previous chord. Two runs with the same shape are a harmonic sequence. The
 * first chord's quality is part of the shape, so runs that differ only in
 * their opening chord do not match.
 */
function segmentShape(chords) {
    if (chords.length < 2)
        return null;
    const shape = [];
    let previousRoot = null;
    for (const chord of chords) {
        const info = chordInfoOf(chord);
        if (!info || Number.isNaN(info.rootChroma))
            return null;
        shape.push({
            quality: info.quality,
            gap: previousRoot === null ? null : (info.rootChroma - previousRoot + 12) % 12,
        });
        previousRoot = info.rootChroma;
    }
    return shape;
}

/** @param {ReturnType<typeof segmentShape>} a @param {ReturnType<typeof segmentShape>} b */
function shapesMatch(a, b) {
    if (!a || !b || a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].quality !== b[i].quality || a[i].gap !== b[i].gap)
            return false;
    }
    return true;
}

/** Build the reported group for one chosen segment. */
function makeGroup(candidate, chords, candidates) {
    const alternatives = candidates.slice(0, TOP_ALTERNATIVES).map((entry) => ({
        keyName: entry.keyName,
        key: entry.key,
        score: entry.score,
    }));
    const ambiguous = alternatives.length > 1
        && (alternatives[0].score - alternatives[1].score) < AMBIGUITY_MARGIN;
    return {
        keyName: candidate.keyName,
        key: candidate.key,
        chords,
        alternatives,
        ambiguous,
        score: candidate.score,
    };
}

/**
 * Partition one anchor-free run of chords into key groups. Dynamic programming
 * over segment boundaries; the state records the last group's key and start, so
 * the transition can reward a sequence (two adjacent groups with the same
 * shape) and discourage cutting a cadence.
 * @param {ChordConfig[]} chords
 * @param {{minSegment?: number, segmentPenalty?: number}} options
 */
function detectRun(chords, options = {}) {
    const n = chords.length;
    if (n === 0)
        return [];
    const minSegment = Math.max(2, Math.min(options.minSegment ?? MIN_SEGMENT, n));
    const penalty = options.segmentPenalty ?? DEFAULT_SEGMENT_PENALTY;

    const candidateCache = new Map();
    /** @param {number} i @param {number} j */
    function candidatesBetween(i, j) {
        const id = `${i}|${j}`;
        if (!candidateCache.has(id))
            candidateCache.set(id, candidatesForRun(chords.slice(i, j)));
        return candidateCache.get(id);
    }

    /**
     * dp[j] maps `keyName|segmentStart` to the best state for chords [0, j).
     * @typedef {{score: number, id: string, start: number, prevId: string|null, prevStart: number, candidate: any}} SegmentState
     * @type {Array<Map<string, SegmentState>>}
     */
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++)
        dp[j] = new Map();

    for (let j = minSegment; j <= n; j++) {
        for (const candidate of candidatesBetween(0, j)) {
            const id = `${candidate.keyName}|0`;
            const score = candidate.score - penalty;
            const existing = dp[j].get(id);
            if (!existing || score > existing.score + 1e-9)
                dp[j].set(id, { score, id, start: 0, prevId: null, prevStart: 0, candidate });
        }
    }

    for (let j = minSegment; j <= n; j++) {
        for (let i = minSegment; i <= j - minSegment; i++) {
            if (dp[i].size === 0)
                continue;
            const candidates = candidatesBetween(i, j);
            if (candidates.length === 0)
                continue;
            const currentShape = segmentShape(chords.slice(i, j));
            for (const previous of dp[i].values()) {
                const previousShape = segmentShape(chords.slice(previous.start, i));
                for (const candidate of candidates) {
                    const adjustment = boundaryAdjustment(
                        previous.candidate.key,
                        candidate.key,
                        chords[i - 1],
                        chords[i],
                    );
                    const sequence = shapesMatch(previousShape, currentShape) ? SEQUENCE_BONUS : 0;
                    const score = previous.score + candidate.score - penalty + adjustment + sequence;
                    const id = `${candidate.keyName}|${i}`;
                    const existing = dp[j].get(id);
                    if (!existing || score > existing.score + 1e-9)
                        dp[j].set(id, { score, id, start: i, prevId: previous.id, prevStart: previous.start, candidate });
                }
            }
        }
    }

    // A run shorter than the minimum segment length still gets one group.
    if (dp[n].size === 0) {
        const candidates = candidatesBetween(0, n);
        if (candidates.length === 0)
            return [];
        return [makeGroup(candidates[0], chords, candidates)];
    }

    let best = null;
    for (const state of dp[n].values()) {
        if (!best || state.score > best.score + 1e-9)
            best = state;
    }

    const groups = [];
    let j = n;
    let state = best;
    while (state) {
        groups.unshift(makeGroup(state.candidate, chords.slice(state.start, j), candidatesBetween(state.start, j)));
        if (state.prevId == null)
            break;
        const previous = dp[state.start].get(state.prevId);
        j = state.start;
        state = previous;
    }
    return groups;
}

/** Does this chord carry its own section key? Those are detection anchors. */
function hasOwnKey(chord) {
    return !!normalizeKey(chord && chord.key);
}

/**
 * Suggest key signature groups for the arranged chords. Chords with an
 * explicit key are anchors and are never crossed; each anchor-free run is
 * partitioned independently, and every group carries alternatives so the user
 * can pick the reading. A single group means no key change was detected.
 * @param {Project} [project]
 * @param {ChordConfig[]} [chordConfigs] arranged chords, in order
 * @param {{minSegment?: number, segmentPenalty?: number}} [options]
 * @returns {Array<{keyName: string, key: ProjectKey|undefined, chords: ChordConfig[], alternatives: Array<{keyName: string, key: ProjectKey, score: number}>, ambiguous: boolean, score: number}>}
 */
export function suggestKeyGroups(project, chordConfigs, options = {}) {
    void project;
    const chords = Array.isArray(chordConfigs) ? chordConfigs : [];
    const groups = [];
    let run = [];
    const flush = () => {
        if (run.length > 0)
            groups.push(...detectRun(run, options));
        run = [];
    };
    for (const chord of chords) {
        if (hasOwnKey(chord)) {
            flush();
        }
        else {
            run.push(chord);
        }
    }
    flush();
    return groups;
}
