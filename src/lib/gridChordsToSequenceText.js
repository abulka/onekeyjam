// @ts-check
import * as Tonal from "@tonaljs/tonal";
import { globals } from "./globals.js";
import { numericId, resolveGridChords } from "./triggerMaps.js";

/**
 * @module lib/gridChordsToSequenceText
 * @desc Build chord-sequence text from the chords currently on the grid,
 * so the Create Chord Sequence box can start from what is already arranged.
 */

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").Project} Project */

/**
 * The grid chords in trigger order (top to bottom on the grid).
 * This follows `songs.default.ids`, falling back to pool order when the
 * arrangement is empty, matching the trigger map in `triggerMaps.js`.
 * @param {Project} [project]
 * @returns {Array<ChordConfig>}
 */
export function orderedGridChordConfigs(project = globals.project) {
    const chords = Array.isArray(project?.chords) ? project.chords : []
    if (chords.length === 0)
        return []
    const rawIds = project?.songs?.default?.ids
    const ids = Array.isArray(rawIds) ? rawIds : []
    // Pass the pool size so the full arrangement is returned, not just the
    // visible trigger window.
    return resolveGridChords(chords, ids, chords.length)
}

/**
 * Whether two pitch spellings sound the same pitch class, e.g. "C#" and
 * "Db", ignoring any octave. Returns false when either is not a note.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function isSamePitchClass(a, b) {
    if (!a || !b)
        return false
    const noteA = Tonal.Note.get(a)
    const noteB = Tonal.Note.get(b)
    if (noteA.empty || noteB.empty)
        return false
    if (typeof noteA.chroma !== "number" || typeof noteB.chroma !== "number")
        return false
    return noteA.chroma === noteB.chroma
}

/**
 * Whether the bass pitch is one of the chord's own tones (any inversion),
 * compared by sounding pitch class so enharmonics match. Used to tell an
 * automatic inversion bass apart from a true outside slash bass.
 * @param {string} chord chord symbol without bass, e.g. "Dm"
 * @param {string} bass bass pitch class, e.g. "A"
 * @returns {boolean}
 */
function isChordTone(chord, bass) {
    const chordObj = Tonal.Chord.get(chord)
    if (chordObj.empty || !Array.isArray(chordObj.notes))
        return false
    return chordObj.notes.some((tone) => isSamePitchClass(tone, bass))
}

/**
 * The sequence-ready symbol for one grid chord, e.g. "Dm" or "C/D".
 * A slash bass that is part of the chord is omitted, because the stored
 * `bass` is often just the automatic lowest note of a smooth inversion
 * rather than an explicitly chosen slash chord. A bass outside the chord
 * is kept, e.g. "C/D".
 * @param {ChordConfig} config
 * @returns {string} "" when the config has no chord name
 */
export function gridChordSymbol(config) {
    const chord = typeof config?.chord === "string" ? config.chord.trim() : ""
    if (!chord)
        return ""
    const bass = typeof config?.bass === "string" ? config.bass.trim() : ""
    if (!bass)
        return chord
    const bassNote = Tonal.Note.get(bass)
    if (bassNote.empty)
        return `${chord}/${bass}`
    const chordObj = Tonal.Chord.get(chord)
    if (chordObj.empty || !chordObj.tonic)
        return `${chord}/${bass}`
    if (isSamePitchClass(chordObj.tonic, bass))
        return chord
    if (isChordTone(chord, bass))
        return chord
    return `${chord}/${bass}`
}

/**
 * Sort trigger notes such as "C3" and "D3" into ascending sounding order
 * without mutating the input.
 * @param {Array<string>} triggers
 * @returns {Array<string>}
 */
function sortedTriggerNotes(triggers) {
    return [...triggers].sort((a, b) => {
        const midiA = Tonal.Note.midi(a)
        const midiB = Tonal.Note.midi(b)
        if (typeof midiA === "number" && typeof midiB === "number")
            return midiA - midiB
        return String(a).localeCompare(String(b))
    })
}

/**
 * Resolve the live trigger map to configs in trigger order. Used only as a
 * fallback when the project has no stored arrangement.
 * @param {Record<string, ChordConfig>} liveMap
 * @returns {Array<ChordConfig>}
 */
function liveMapInTriggerOrder(liveMap) {
    if (!liveMap || typeof liveMap !== "object")
        return []
    return sortedTriggerNotes(Object.keys(liveMap))
        .map((trigger) => liveMap[trigger])
        .filter(Boolean)
}

/**
 * The grid chords as currently sounded, in trigger order (top to bottom on
 * the grid). For each arranged id the live transposed trigger-map config is
 * preferred when present, falling back to the stored pool config. This keeps
 * hidden arrangement tails and works before the trigger map is built.
 * @param {Project} [project]
 * @param {Record<string, ChordConfig>} [liveMap]
 * @returns {Array<ChordConfig>}
 */
export function orderedLiveGridChordConfigs(project = globals.project, liveMap) {
    const chords = Array.isArray(project?.chords) ? project.chords : []
    if (chords.length === 0)
        return []
    const effectiveLiveMap = liveMap !== undefined
        ? liveMap
        : (project === globals.project ? globals.chordTriggerMap : undefined)
    const rawIds = project?.songs?.default?.ids
    const ids = Array.isArray(rawIds) ? rawIds : []
    if (ids.length === 0) {
        const live = liveMapInTriggerOrder(/** @type {any} */(effectiveLiveMap))
        if (live.length > 0)
            return live
        return [...chords]
    }
    /** @type {Map<number|string, ChordConfig>} */
    const liveById = new Map()
    if (effectiveLiveMap && typeof effectiveLiveMap === "object") {
        for (const config of Object.values(effectiveLiveMap)) {
            if (!config)
                continue
            liveById.set(numericId(/** @type {any} */(config).id), /** @type {ChordConfig} */(config))
        }
    }
    /** @type {Map<number|string, ChordConfig>} */
    const poolById = new Map()
    for (const config of chords)
        poolById.set(numericId(/** @type {any} */(config).id), /** @type {ChordConfig} */(config))
    /** @type {Array<ChordConfig>} */
    const result = []
    for (const rawId of ids) {
        const id = numericId(rawId)
        const config = liveById.get(id) ?? poolById.get(id)
        if (config)
            result.push(config)
    }
    return result
}

/**
 * Space-separated chord names from the grid in trigger order, e.g.
 * "Dsus4 Dmaj7 C#m11". Uses the live sounded chords when available so the
 * text matches the grid after a transposition, and omits a slash bass that
 * is part of the chord (an automatic inversion). Returns "" when the grid
 * has no named chords.
 * @param {Project} [project]
 * @param {Record<string, ChordConfig>} [liveMap]
 * @returns {string}
 */
export function buildChordSequenceTextFromGrid(project = globals.project, liveMap) {
    return orderedLiveGridChordConfigs(project, liveMap).map(gridChordSymbol).filter(Boolean).join(" ")
}
