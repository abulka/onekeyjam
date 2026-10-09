// @ts-check

/*
 * Demo chord playback patterns for the generated static libraries (classic,
 * rock, progressions). Each song gets one or more named looping patterns that
 * follow its real harmony rhythm, so opening a project gives something to
 * practise with straight away.
 *
 * A song can store several sequences: the short excerpt it has always had, a
 * middle section, and the full form. Repeats share a grid row, so a long form
 * only grows the grid by the distinct chords it introduces, never by bar count.
 *
 * Trigger positions are white-note order, not musical intervals: trigger 1 is
 * the first unique chord in the definition, trigger 2 the second, and so on
 * into higher octaves after seven. Repeats point back at the earlier row, so
 * Blue Moon plays triggers 1-2-3-4-1-2-3-4 on four grid rows. This matches how
 * the grid arrangement (`songs.default.ids`) maps chords to trigger notes in
 * order, and how the sequencer maps widget rows back to trigger notes.
 *
 * MML rows are widget rows relative to C4 (60) with the sequencer's
 * `octadj = -1`, so `o4c` is row 60 (the first trigger), `o4b` is row 71 (the
 * seventh) and `o5c` is row 72 (the eighth). The tempo prefix is applied to the
 * global BPM when the project loads, but playback always follows that BPM.
 */

/** Ticks per whole note in the pattern panel; one 4/4 bar is one whole note. */
export const DEMO_PATTERN_TIMEBASE = 16

/** Neutral stored tempo; playback follows the global BPM. */
export const DEMO_PATTERN_TEMPO = 120

/** Minimum trigger rows shown; smaller songs still offer seven rows to grow into. */
export const DEMO_PATTERN_MIN_ROWS = 7

const WHITE_MML_NOTES = ['c', 'd', 'e', 'f', 'g', 'a', 'b']

/**
 * One step of a demo loop: which trigger to play and for how long.
 * @typedef {object} DemoTrigger
 * @property {number} index 0-based white-note trigger position
 * @property {number} bars length in bars (1 is one bar, 0.5 a half bar, 2 a two-bar hold)
 */

/**
 * One step of a hand-authored song sequence, naming the chord by symbol. An
 * optional `key` starts a new key signature group from this step on, until a
 * later step changes it again. Steps without a key inherit the current key.
 * @typedef {object} DemoSequenceStep
 * @property {string} chord chord symbol, matching an entry of the definition's chord list
 * @property {number} bars length in bars
 * @property {{tonic:string, type:string}} [key] key in force from this step
 */

/**
 * One grid row for a keyed song: a chord symbol plus the key it belongs to.
 * The same symbol under two keys becomes two rows, so a modulation that
 * returns to the same chord can keep the right scales in each group.
 * @typedef {object} DemoRow
 * @property {string} symbol chord symbol
 * @property {{tonic:string, type:string}} [key] the row's section key, if any
 * @property {string} keyName normalised key signature, '' when unkeyed
 */

/**
 * A generated library entry. `chords` lists the grid rows; repeats are folded,
 * so Blue Moon's eight bars use four rows. Optional `sequence` (single) or
 * `sequences` (named) describe the demo loops as chord symbols with bar
 * lengths; without either, every chord gets one bar in definition order with
 * back to back repeats merged into holds.
 *
 * For a multi-key song, `chords` entries and sequence steps may carry a `key`,
 * which starts a new key signature group from that point on.
 * @typedef {object} DemoDefinition
 * @property {Array<string|{chord:string, key?:{tonic:string, type:string}}>} [chords] chord symbols for the grid, in row order
 * @property {DemoSequenceStep[]} [sequence] legacy single demo loop (becomes `default`)
 * @property {Object.<string, DemoSequenceStep[]>} [sequences] named demo loops
 * @property {Object.<string, string>} [sequenceLabels] display labels per sequence name
 * @property {number} [tempo] stored tempo, applied to the global BPM on load
 * @property {{tonic:string, type:string}} [key] the song's default key
 */

/** Human labels for the conventional sequence names. */
const SEQUENCE_LABELS = {
    default: 'Excerpt',
    short: 'Excerpt',
    excerpt: 'Excerpt',
    medium: 'Middle section',
    full: 'Full form',
}

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
 * The named sequences a definition provides. `sequence` is treated as the
 * legacy spelling of `sequences.default`.
 * @param {DemoDefinition} definition
 * @returns {Object.<string, DemoSequenceStep[]>} authored sequences, possibly empty
 */
export function normalizeSequences(definition) {
    /** @type {Object.<string, DemoSequenceStep[]>} */
    const authored = {}
    if (definition && definition.sequences && typeof definition.sequences === 'object') {
        for (const [name, steps] of Object.entries(definition.sequences)) {
            if (Array.isArray(steps))
                authored[name] = steps
        }
    }
    if (definition && Array.isArray(definition.sequence) && !authored.default)
        authored.default = definition.sequence
    return authored
}

/**
 * Plan the demo loops for a song definition: the unique grid rows and, for
 * each named sequence, the trigger steps that play them. The chord-order
 * excerpt is always offered as `default` unless one is authored, so a
 * definition can add a `medium` or `full` form without repeating the excerpt.
 * The grid is the union of the definition's chords and every sequence's
 * chords, so a full form only adds its distinct chords.
 * @param {DemoDefinition} definition
 * @returns {{ uniqueSymbols: string[], rows: DemoRow[], sequences: Object.<string, DemoTrigger[]>, missing: string[] }}
 */
export function planDemoSequences(definition) {
    const { rows, sequences, missing } = planKeyedDemoSequences(definition)
    return { uniqueSymbols: rows.map((row) => row.symbol), rows, sequences, missing }
}

/**
 * Plan the grid rows and demo loops for a song definition that may change key.
 * Rows are keyed by symbol *and* key, so the same chord can appear once per
 * group. Sequence steps inherit the current key until a step supplies a new
 * one; `chords` entries work the same way, so a plain string keeps the previous
 * group and an object with a `key` starts a new one.
 *
 * For definitions with no keys this returns exactly the rows and triggers that
 * `planDemoSequences` always produced.
 * @param {DemoDefinition} definition
 * @returns {{ rows: DemoRow[], sequences: Object.<string, DemoTrigger[]>, missing: string[] }}
 */
export function planKeyedDemoSequences(definition) {
    const authored = normalizeSequences(definition)
    const chordsInput = definition && Array.isArray(definition.chords) ? definition.chords : []
    /** @type {DemoRow[]} */
    const rows = []
    /** @type {Map<string, number>} */
    const rowIndexByDescriptor = new Map()

    /** @param {string} symbol @param {{tonic:string, type:string}|undefined} key */
    function rowFor(symbol, key) {
        const keyName = key ? `${key.tonic} ${key.type}` : ''
        const descriptor = `${symbol}|${keyName}`
        const existing = rowIndexByDescriptor.get(descriptor)
        if (existing !== undefined)
            return existing
        const index = rows.length
        rows.push({ symbol, key: key || undefined, keyName })
        rowIndexByDescriptor.set(descriptor, index)
        return index
    }

    // Definition chords first, in order, inheriting the running key.
    let chordsKey = definition && definition.key ? definition.key : undefined
    /** @type {Array<{index:number, bars:number}>} */
    const chordSteps = []
    for (const entry of chordsInput) {
        if (!entry)
            continue
        let symbol
        if (typeof entry === 'string') {
            symbol = entry
        }
        else {
            symbol = entry.chord
            if (entry.key)
                chordsKey = entry.key
        }
        if (!symbol)
            continue
        chordSteps.push({ index: rowFor(symbol, chordsKey), bars: 1 })
    }

    const names = Object.keys(authored)
    /** @type {Object.<string, DemoTrigger[]>} */
    const sequences = {}

    // The excerpt is derived from the chord order unless the definition
    // authors its own `default`.
    if (!authored.default && chordSteps.length > 0)
        sequences.default = mergeConsecutiveHolds(chordSteps)

    for (const name of names) {
        let sequenceKey = definition && definition.key ? definition.key : undefined
        /** @type {DemoTrigger[]} */
        const triggers = []
        for (const step of authored[name]) {
            if (step.key)
                sequenceKey = step.key
            if (!step.chord)
                continue
            triggers.push({ index: rowFor(step.chord, sequenceKey), bars: step.bars })
        }
        sequences[name] = triggers
    }

    return { rows, sequences, missing: [] }
}

/**
 * Plan the single primary demo loop for a definition. Kept for callers that
 * only care about the default sequence; `planDemoSequences` is preferred.
 * @param {DemoDefinition} definition
 * @returns {{ uniqueSymbols: string[], triggers: DemoTrigger[], missing: string[] }}
 */
export function planDemoPattern(definition) {
    const { uniqueSymbols, sequences, missing } = planDemoSequences(definition)
    const names = Object.keys(sequences)
    const triggers = sequences.default ?? (names.length > 0 ? sequences[names[0]] : [])
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
 * @param {number} [tempo] MML tempo prefix; playback always follows the global BPM
 * @returns {string} MML string
 */
export function demoSequenceMml(entries, tempo = DEMO_PATTERN_TEMPO) {
    if (!entries || entries.length === 0)
        return ''
    const prefix = Number.isFinite(tempo) ? Math.round(tempo) : DEMO_PATTERN_TEMPO
    let mml = `t${prefix}o4`
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
 * Build the stored `chordSequences.<name>` entry for a trigger sequence.
 * @param {DemoTrigger[]} entries trigger steps in loop order
 * @param {number} [tempo] stored tempo, applied to the global BPM on load
 * @param {string} [label] display label for the sequence picker
 * @returns {{ mml: string, markstart: number, markend: number, tempo: number, enabled: boolean, loopManual: boolean, label?: string }}
 */
export function demoEntryForTriggers(entries, tempo = DEMO_PATTERN_TEMPO, label) {
    const list = Array.isArray(entries) ? entries : []
    const storedTempo = Number.isFinite(tempo) ? Math.round(tempo) : DEMO_PATTERN_TEMPO
    const totalTicks = list.reduce((sum, entry) => sum + Math.max(1, Math.round(entry.bars * DEMO_PATTERN_TIMEBASE)), 0)
    /** @type {{ mml: string, markstart: number, markend: number, tempo: number, enabled: boolean, loopManual: boolean, label?: string }} */
    const entry = {
        mml: demoSequenceMml(list, storedTempo),
        markstart: 0,
        markend: totalTicks,
        tempo: storedTempo,
        enabled: false,
        loopManual: false,
    }
    if (label)
        entry.label = label
    return entry
}

/**
 * Default display label for a named sequence, including its length in bars.
 * @param {string} name sequence key, e.g. `default`, `medium`, `full`
 * @param {number} ticks loop length in panel ticks
 * @returns {string} e.g. `Full form (32 bars)`
 */
export function defaultSequenceLabel(name, ticks) {
    const base = SEQUENCE_LABELS[name] || name
    const bars = Math.round(Math.max(0, ticks) / DEMO_PATTERN_TIMEBASE)
    return bars > 0 ? `${base} (${bars} bars)` : base
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
