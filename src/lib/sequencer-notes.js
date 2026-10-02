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
