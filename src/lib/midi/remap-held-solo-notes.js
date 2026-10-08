// @ts-check
import { globals } from "../globals.js"
import { playGmNote, stopGmNote } from "../audio/general-midi.js"
import { detectChordsBeingPlayed } from "../detectChordsBeingPlayed.js"

/**
 * @module lib/midi/remap-held-solo-notes
 * @desc Keep held right-hand solo notes in step with the current scale.
 *
 * A solo note is filtered through globals.scaleTriggerMap at the instant its
 * event arrives. When a left-hand chord trigger arrives a few milliseconds
 * later it rebuilds that map, but the already-sounding note keeps the old
 * mapping. This module recomputes held notes against the new map and swaps the
 * sound when it changed, so both event orders settle on the new scale.
 *
 * Only notes still inside a short grace window are corrected. The soundfont
 * attack is about 10ms, so re-playing a note this soon is a barely audible
 * re-articulation rather than a double note. Long deliberate holds are left
 * alone. Nothing is corrected while recording, to keep the take clean.
 */

const DEFAULT_GRACE_MS = 40

function nowMs() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/**
 * @param {number|null|undefined} value
 * @returns {number} the grace window in milliseconds, possibly Infinity
 */
function graceWindow(value) {
    if (value === Infinity)
        return Infinity
    if (!Number.isFinite(value))
        return DEFAULT_GRACE_MS
    return Math.max(0, /** @type {number} */ (value))
}

/**
 * Recompute held solo notes against globals.scaleTriggerMap and correct any
 * that changed and are still inside the grace window.
 * @param {{ now?: number, windowMs?: number }} [options] now is injectable for tests; windowMs overrides the repair setting (for example a transpose moves every held note).
 * @returns {number} how many held notes were corrected or stopped
 */
export function remapHeldSoloNotes(options = {}) {
    const repair = globals.heldNoteRepair
    if (repair && repair.enabled === false)
        return 0
    if (globals.recording && globals.recording.isRecording)
        return 0
    if (!globals.scaleFilteringEnabled)
        return 0
    const map = globals.scaleTriggerMap
    if (!map || Object.keys(map).length === 0)
        return 0

    const now = options.now ?? nowMs()
    const window = graceWindow(options.windowMs ?? (repair && repair.windowMs))
    let corrected = 0

    for (const realKey of Object.keys(globals.pendingNoteOffs)) {
        const info = globals.pendingNoteOffs[realKey]
        if (!info)
            continue
        const next = map[realKey]
        if (next === info.allowedNote)
            continue
        if (typeof info.startedAt === 'number' && now - info.startedAt > window)
            continue

        stopSoloNote(info)

        if (next === undefined || next === '' || next === 'X') {
            delete globals.pendingNoteOffs[realKey]
            corrected++
            continue
        }

        info.allowedNote = next
        info.startedAt = now
        info.envelope = undefined
        info.pitch = undefined
        playSoloNote(info)

        if (globals.currentJamNote && globals.currentJamNote.real === realKey)
            globals.currentJamNote.mapped = next
        corrected++
    }

    if (corrected > 0)
        detectChordsBeingPlayed()

    return corrected
}

/**
 * @param {{ allowedNote: string, envelope?: any }} info
 */
function stopSoloNote(info) {
    if (globals.GM) {
        if (info.envelope)
            stopGmNote(info)
    }
    else if (globals.channel) {
        globals.channel.stopNote(info.allowedNote)
    }
}

/**
 * @param {{ allowedNote: string, velocity?: number }} info
 */
function playSoloNote(info) {
    const velocity = Number.isFinite(info.velocity) ? /** @type {number} */ (info.velocity) : 0.5
    if (globals.GM)
        playGmNote(info.allowedNote, info, { velocity })
    else if (globals.channel)
        globals.channel.playNote(info.allowedNote, { attack: velocity })
}
