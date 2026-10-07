// @ts-check

/*
 * Demo chord playback patterns for the generated static libraries (classic,
 * rock, progressions). Each song gets a looping pattern that follows its real
 * harmony rhythm, so opening a project gives something to practise with
 * straight away.
 *
 * Trigger positions are white-note order, not musical intervals: trigger 1 is
 * the first unique chord in the definition, trigger 2 the second, and so on
 * into higher octaves after seven. Repeats point back at the earlier row, so
 * Blue Moon plays triggers 1-2-3-4-1-2-3-4 on four grid rows. This matches how
 * `candidatesToTriggerMapSmart` allocates favourites in order, and how the
 * sequencer maps widget rows back to trigger notes.
 *
 * MML rows are widget rows relative to C4 (60) with the sequencer's
 * `octadj = -1`, so `o4c` is row 60 (the first trigger), `o4b` is row 71 (the
 * seventh) and `o5c` is row 72 (the eighth). The tempo prefix is neutral: the
 * panel always plays with the app global BPM.
 */

/** Ticks per whole note in the pattern panel; one 4/4 bar is one whole note. */
export const DEMO_PATTERN_TIMEBASE = 16

/** Neutral stored tempo; playback follows the global BPM. */
export const DEMO_PATTERN_TEMPO = 120

/** Minimum trigger rows shown; smaller songs still offer seven rows to grow into. */
export const DEMO_PATTERN_MIN_ROWS = 7

const WHITE_MML_NOTES = ['c', 'd', 'e', 'f', 'g', 'a', 'b']

/**
 * Build the MML for a demo loop with one bar per trigger position.
 * @param {number} chordCount how many chords (bars) the loop holds
 * @returns {string} MML string, e.g. `t120o4c1d1e1` for three chords
 */
export function demoPatternMml(chordCount) {
    const count = Math.max(0, Math.floor(chordCount))
    if (count <= 0)
        return ''
    let mml = `t${DEMO_PATTERN_TEMPO}o4`
    let currentOctave = 4
    for (let i = 0; i < count; i++) {
        const octave = 4 + Math.floor(i / WHITE_MML_NOTES.length)
        if (octave !== currentOctave) {
            mml += `o${octave}`
            currentOctave = octave
        }
        mml += `${WHITE_MML_NOTES[i % WHITE_MML_NOTES.length]}1`
    }
    return mml
}

/**
 * Build the stored `chordSequences.default` entry for a generated song.
 * @param {number} chordCount how many chords (bars) the loop holds
 * @returns {{ mml: string, markstart: number, markend: number, tempo: number, enabled: boolean, loopManual: boolean }}
 */
export function demoPatternForChordCount(chordCount) {
    const count = Math.max(0, Math.floor(chordCount))
    return {
        mml: demoPatternMml(count),
        markstart: 0,
        markend: count * DEMO_PATTERN_TIMEBASE,
        tempo: DEMO_PATTERN_TEMPO,
        enabled: false,
        loopManual: false,
    }
}

/**
 * One step of a demo loop: which trigger to play and for how long.
 * @typedef {object} DemoTrigger
 * @property {number} index 0-based white-note trigger position
 * @property {number} bars length in bars (1 is one bar, 0.5 a half bar, 2 a two-bar hold)
 */

/**
 * One step of a hand-authored song sequence, naming the chord by symbol.
 * @typedef {object} DemoSequenceStep
 * @property {string} chord chord symbol, matching an entry of the definition's chord list
 * @property {number} bars length in bars
 */

/**
 * Unique chord symbols in first-appearance order. Grid rows follow this
 * order, so repeats share a row instead of taking new ones.
 * @param {string[]} symbols chord symbols, possibly with repeats
 * @returns {string[]} unique symbols in first-appearance order
 */
export function dedupeSymbols(symbols) {
    const seen = new Set()
    const unique = []
    for (const symbol of symbols || []) {
        if (!seen.has(symbol)) {
            seen.add(symbol)
            unique.push(symbol)
        }
    }
    return unique
}

/**
 * Fold consecutive steps on the same trigger into a single longer hold, so a
 * chord held for several bars sounds once instead of retriggering each bar.
 * @param {DemoTrigger[]} entries trigger steps in loop order
 * @returns {DemoTrigger[]} entries with runs merged
 */
export function mergeConsecutiveHolds(entries) {
    /** @type {DemoTrigger[]} */
    const merged = []
    for (const entry of entries || []) {
        const last = merged[merged.length - 1]
        if (last && last.index === entry.index)
            last.bars += entry.bars
        else
            merged.push({ index: entry.index, bars: entry.bars })
    }
    return merged
}

/**
 * Plan the demo loop for a song definition: the unique grid rows and the
 * trigger steps that play them. Without a hand-authored sequence every chord
 * gets one bar in definition order, repeats reuse their first row, and back
 * to back repeats merge into holds.
 * @param {{ chords: string[], sequence?: DemoSequenceStep[] }} definition
 * @returns {{ uniqueSymbols: string[], triggers: DemoTrigger[], missing: string[] }}
 */
export function planDemoPattern(definition) {
    const symbols = Array.isArray(definition.chords) ? definition.chords : []
    const authored = Array.isArray(definition.sequence) ? definition.sequence : null
    const sequenceSymbols = authored ? authored.map((step) => step.chord) : []
    const uniqueSymbols = dedupeSymbols([...symbols, ...sequenceSymbols])
    /** @type {string[]} */
    const missing = []
    /** @type {DemoTrigger[]} */
    let triggers
    if (authored) {
        triggers = []
        for (const step of authored) {
            const index = uniqueSymbols.indexOf(step.chord)
            if (index < 0) {
                if (!missing.includes(step.chord))
                    missing.push(step.chord)
                continue
            }
            triggers.push({ index, bars: step.bars })
        }
    }
    else {
        triggers = mergeConsecutiveHolds(
            symbols.map((symbol) => ({ index: uniqueSymbols.indexOf(symbol), bars: 1 })),
        )
    }
    return { uniqueSymbols, triggers, missing }
}

// MML note lengths in panel ticks: 1 is a whole note (one bar), 2 a half note
// (half a bar), and so on down to 16ths (one tick).
/** @type {Array<[number, string]>} */
const MML_LENGTHS = [
    [16, '1'],
    [8, '2'],
    [4, '4'],
    [2, '8'],
    [1, '16'],
]

/**
 * Split a tick count into MML length suffixes, largest first.
 * @param {number} ticks duration in panel ticks
 * @returns {string[]} length suffixes that sum to the duration
 */
function ticksToLengthSuffixes(ticks) {
    let remaining = Math.max(1, Math.round(ticks))
    /** @type {string[]} */
    const suffixes = []
    for (const [unit, suffix] of MML_LENGTHS) {
        while (remaining >= unit) {
            suffixes.push(suffix)
            remaining -= unit
        }
    }
    return suffixes
}

/**
 * Build the MML for a trigger sequence with varied bar lengths. Multi-bar
 * holds are tied (`c1&c1`), half bars use half notes (`d2`), and triggers
 * past seven continue in higher octaves (`o5c`).
 * @param {DemoTrigger[]} entries trigger steps in loop order
 * @returns {string} MML string
 */
export function demoSequenceMml(entries) {
    if (!entries || entries.length === 0)
        return ''
    let mml = `t${DEMO_PATTERN_TEMPO}o4`
    let currentOctave = 4
    for (const entry of entries) {
        const index = Math.max(0, Math.floor(entry.index))
        const octave = 4 + Math.floor(index / WHITE_MML_NOTES.length)
        const letter = WHITE_MML_NOTES[((index % WHITE_MML_NOTES.length) + WHITE_MML_NOTES.length) % WHITE_MML_NOTES.length]
        if (octave !== currentOctave) {
            mml += `o${octave}`
            currentOctave = octave
        }
        const suffixes = ticksToLengthSuffixes(entry.bars * DEMO_PATTERN_TIMEBASE)
        mml += `${letter}${suffixes[0]}`
        for (const suffix of suffixes.slice(1))
            mml += `&${letter}${suffix}`
    }
    return mml
}

/**
 * Build the stored `chordSequences.default` entry for a trigger sequence.
 * @param {DemoTrigger[]} entries trigger steps in loop order
 * @returns {{ mml: string, markstart: number, markend: number, tempo: number, enabled: boolean, loopManual: boolean }}
 */
export function demoEntryForTriggers(entries) {
    const list = Array.isArray(entries) ? entries : []
    const totalTicks = list.reduce((sum, entry) => sum + Math.max(1, Math.round(entry.bars * DEMO_PATTERN_TIMEBASE)), 0)
    return {
        mml: demoSequenceMml(list),
        markstart: 0,
        markend: totalTicks,
        tempo: DEMO_PATTERN_TEMPO,
        enabled: false,
        loopManual: false,
    }
}

/**
 * How many trigger rows the sequencer should offer for an allocated map.
 * Small songs keep seven rows so there is room to grow; larger songs extend
 * into higher octaves rather than dropping chords.
 * @param {number} allocatedCount chords currently assigned to triggers
 * @returns {number} trigger rows to expose
 */
export function triggerRowCountFor(allocatedCount) {
    const count = Math.max(0, Math.floor(allocatedCount))
    return Math.max(DEMO_PATTERN_MIN_ROWS, count)
}
