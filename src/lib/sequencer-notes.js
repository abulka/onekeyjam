// @ts-check

/**
 * @module lib/sequencer-notes
 * @desc Pure conversions between the recorder's take notes and the
 * webaudio-pianoroll widget's note events.
 *
 * Two different tick systems are involved:
 * - the take uses PPQ (ticks per quarter note, 480 in this app);
 * - the widget's `timebase` is ticks per whole note (1920 when matching 480 PPQ).
 *
 * A whole note is four quarter notes, so the scale between them is
 * `timebase / (ppq * 4)`.
 */

/**
 * @param {number} takeTick
 * @param {number} ppq
 * @param {number} panelTimebase
 * @returns {number}
 */
export function takeTicksToPanel(takeTick, ppq, panelTimebase) {
    return takeTick * panelTimebase / (ppq * 4)
}

/**
 * @param {number} panelTick
 * @param {number} ppq
 * @param {number} panelTimebase
 * @returns {number}
 */
export function panelTicksToTake(panelTick, ppq, panelTimebase) {
    return panelTick * (ppq * 4) / panelTimebase
}

/**
 * One take note as a widget event.
 * @typedef {object} PanelNote
 * @property {number} t start tick (widget timebase)
 * @property {number} n MIDI note
 * @property {number} g duration ticks (widget timebase)
 * @property {number} v velocity 0..127
 * @property {number} f selected flag
 * @property {number} [playedMidi] the key that was pressed
 * @property {'chords'|'jam'} [_track] which take track the note came from
 */

/**
 * Convert a recorded take into widget notes.
 * @param {{ chords?: Array<object>, jam?: Array<object> }} take
 * @param {{ ppq?: number, panelTimebase?: number, tracks?: Array<'chords'|'jam'> }} [options]
 * @returns {PanelNote[]}
 */
export function takeToPanelNotes(take, { ppq = 480, panelTimebase = 1920, tracks = ['chords', 'jam'] } = {}) {
    /** @type {PanelNote[]} */
    const notes = []

    /**
     * @param {Array<object>} list
     * @param {'chords'|'jam'} track
     */
    function add(list, track) {
        for (const note of list || []) {
            /** @type {PanelNote} */
            const panelNote = {
                t: Math.round(takeTicksToPanel(note.startTick, ppq, panelTimebase)),
                n: note.midi,
                g: Math.max(1, Math.round(takeTicksToPanel(note.durationTicks, ppq, panelTimebase))),
                v: Math.round((typeof note.velocity === 'number' ? note.velocity : 0.8) * 127),
                f: 0,
                _track: track,
            }
            if (typeof note.playedMidi === 'number')
                panelNote.playedMidi = note.playedMidi
            notes.push(panelNote)
        }
    }

    if (tracks.includes('chords'))
        add(take.chords || [], 'chords')
    if (tracks.includes('jam'))
        add(take.jam || [], 'jam')
    return notes
}

/**
 * Convert widget notes back into take notes.
 * @param {PanelNote[]} panelNotes
 * @param {{ ppq?: number, panelTimebase?: number }} [options]
 * @returns {Array<{ midi: number, startTick: number, durationTicks: number, velocity: number, playedMidi?: number }>}
 */
export function panelNotesToTakeNotes(panelNotes, { ppq = 480, panelTimebase = 1920 } = {}) {
    return panelNotes.map(note => {
        /** @type {{ midi: number, startTick: number, durationTicks: number, velocity: number, playedMidi?: number }} */
        const takeNote = {
            midi: note.n,
            startTick: Math.round(panelTicksToTake(note.t, ppq, panelTimebase)),
            durationTicks: Math.max(1, Math.round(panelTicksToTake(note.g, ppq, panelTimebase))),
            velocity: Math.min(1, Math.max(0, (typeof note.v === 'number' ? note.v : 100) / 127)),
        }
        // Keep the originally pressed key where we have it; otherwise the note
        // itself is the sensible default so the "played" view stays meaningful.
        const playedMidi = typeof note.playedMidi === 'number' ? note.playedMidi : note.n
        takeNote.playedMidi = playedMidi
        return takeNote
    })
}

/**
 * Choose a y-offset and range that frame the given notes nicely. In the widget
 * `yoffset` is the bottom-most visible note and the visible range runs upwards
 * from it, so the offset must sit just below the lowest note.
 * @param {PanelNote[]} notes
 * @returns {{ yoffset: number, yrange: number }}
 */
export function fitRange(notes) {
    if (!notes || notes.length === 0)
        return { yoffset: 60, yrange: 16 }

    let min = Infinity
    let max = -Infinity
    for (const note of notes) {
        min = Math.min(min, note.n)
        max = Math.max(max, note.n)
    }
    const pad = 3
    return {
        yoffset: Math.max(0, min - pad),
        yrange: Math.max(6, (max - min) + pad * 2),
    }
}

/**
 * Repeat a looping pattern's notes from `loopStart` up to `totalTicks`.
 * Notes that do not fall inside the loop are ignored; notes are not clipped at
 * the loop end (the repeated note at the boundary simply belongs to the next
 * repeat). Used to merge a looped pattern into a recording.
 * @param {PanelNote[]} notes
 * @param {number} loopStart
 * @param {number} loopEnd
 * @param {number} totalTicks
 * @returns {PanelNote[]}
 */
export function renderLoopToTicks(notes, loopStart, loopEnd, totalTicks) {
    const loopLength = loopEnd - loopStart
    if (loopLength <= 0 || totalTicks <= 0)
        return []

    /** @type {PanelNote[]} */
    const out = []
    for (let base = loopStart; base < totalTicks; base += loopLength) {
        for (const note of notes || []) {
            if (note.t < loopStart || note.t >= loopEnd)
                continue
            const t = base + (note.t - loopStart)
            if (t >= totalTicks)
                continue
            out.push({ ...note, t })
        }
    }
    return out
}

/**
 * Turn a looping pattern into take notes that fill a recording.
 *
 * The pattern is repeated for as many whole loops as it takes to reach the
 * take's length, note durations are clipped at the loop end to match how the
 * widget clips them during playback, and each widget row is mapped to its
 * sounding MIDI note via `rowToMidi`.
 *
 * @param {PanelNote[]} patternNotes widget notes (in the panel's timebase)
 * @param {object} options
 * @param {number} [options.ppq] take ticks per quarter note
 * @param {number} [options.panelTimebase] panel ticks per whole note
 * @param {number} [options.loopStart] loop start, panel ticks
 * @param {number} [options.loopEnd] loop end, panel ticks
 * @param {number} [options.totalTakeTicks] how long the take is, take ticks
 * @param {(row: number) => Array<{ midi: number, playedMidi?: number }>} [options.rowToNotes] expand a row into the notes it sounds
 * @returns {Array<{ midi: number, startTick: number, durationTicks: number, velocity: number, playedMidi: number }>}
 */
export function patternToTakeNotes(patternNotes, {
    ppq = 480,
    panelTimebase = 16,
    loopStart = 0,
    loopEnd = 0,
    totalTakeTicks = 0,
    rowToNotes = undefined,
} = {}) {
    if (typeof rowToNotes !== 'function' || totalTakeTicks <= 0 || loopEnd <= loopStart)
        return []

    const loopLength = loopEnd - loopStart
    const totalPanelTicks = Math.max(1, Math.round(totalTakeTicks * panelTimebase / (ppq * 4)))
    // Round up to whole loops so the last repeat is not cut off mid-bar.
    const loops = Math.max(1, Math.ceil((totalPanelTicks - loopStart) / loopLength))
    const renderedTotal = loopStart + loops * loopLength

    const clipped = []
    for (const note of patternNotes || []) {
        if (note.t < loopStart || note.t >= loopEnd)
            continue
        const maxDuration = loopEnd - note.t
        clipped.push({ ...note, g: Math.max(1, Math.min(note.g, maxDuration)) })
    }

    const rendered = renderLoopToTicks(clipped, loopStart, loopEnd, renderedTotal)
    const out = []
    for (const note of rendered) {
        const expansions = rowToNotes(note.n)
        if (!Array.isArray(expansions) || expansions.length === 0)
            continue
        const startTick = Math.round(panelTicksToTake(note.t, ppq, panelTimebase))
        const durationTicks = Math.max(1, Math.round(panelTicksToTake(note.g, ppq, panelTimebase)))
        const velocity = Math.min(1, Math.max(0, (typeof note.v === 'number' ? note.v : 100) / 127))
        for (const expansion of expansions) {
            if (!expansion || typeof expansion.midi !== 'number')
                continue
            out.push({
                midi: expansion.midi,
                startTick,
                durationTicks,
                velocity,
                playedMidi: typeof expansion.playedMidi === 'number' ? expansion.playedMidi : expansion.midi,
            })
        }
    }
    return out
}
