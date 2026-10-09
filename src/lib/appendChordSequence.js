// @ts-check
import * as Tonal from "@tonaljs/tonal";
import { globals } from "./globals.js";
import { numericId } from "./triggerMaps.js";
import { appendChordConfigsToGrid } from "./gridArrangement.js";
import { fillInChordConfig2 } from "./fillInChordConfig.js";
import { keyDetection } from "./keyDetection.js";
import { resolveProjectKey } from "./projectKey.js";

/**
 * @module lib/appendChordSequence
 * @desc Append voiced chord-sequence entries to the project and trigger map.
 */

/**
 * @typedef {import("./voiceChordSequence.js").VoicedChord} VoicedChord
 */

/**
 * Append already-voiced chords to the end of the project chord grid.
 * Uses the same chord-config shape as the Add Chord button, so scales,
 * trigger notes and key detection all stay consistent.
 * @param {Array<VoicedChord>} voicedEntries
 * @returns {{addedIds: Array<number>, addedCount: number}}
 */
export function appendChordSequence(voicedEntries) {
    if (!voicedEntries || voicedEntries.length === 0)
        return { addedIds: [], addedCount: 0 }

    ensureSongStructure()

    /** @type {Array<number>} */
    const addedIds = []
    /** @type {Array<import("./typedefs").ChordConfig>} */
    const newConfigs = []
    for (const entry of voicedEntries) {
        if (!entry.chordNotes || entry.chordNotes.length === 0)
            continue
        /** @type {import("./typedefs").ChordConfig} */
        const chordConfig = {
            id: 0,
            name: "",
            chord: "",
            chordNotes: [],
            bass: "",
            scale1: "",
            scale2: "",
            scale3: "",
        }
        const detected = Tonal.Chord.detect(entry.chordNotes)
        const symbols = detected.length > 0 ? detected : [entry.chord]
        fillInChordConfig2(chordConfig, entry.chord, symbols, entry.chordNotes, entry.bass)

        chordConfig.id = allocatedNextId([...globals.project.chords, ...newConfigs])
        newConfigs.push(chordConfig)
        addedIds.push(chordConfig.id)
    }

    // Add them all at once, building the trigger map once at the end.
    appendChordConfigsToGrid(newConfigs)

    globals.projectKey = resolveProjectKey(globals.project) ?? globals.projectKey ?? null
    keyDetection()

    return { addedIds, addedCount: addedIds.length }
}

/**
 * Chord notes of the last grid chord, used to anchor the next sequence so
 * the first new voicing joins smoothly onto what the grid shows. Prefers the
 * last arranged id and falls back to pool order when there is no arrangement.
 * @returns {Array<string>}
 */
export function lastProjectChordNotes() {
    const chords = globals.project?.chords
    if (!Array.isArray(chords) || chords.length === 0)
        return []
    const rawIds = globals.project?.songs?.default?.ids
    if (Array.isArray(rawIds) && rawIds.length > 0) {
        const lastId = numericId(rawIds[rawIds.length - 1])
        const match = chords.find((config) => numericId(config.id) === lastId)
        if (match && Array.isArray(match.chordNotes))
            return [...match.chordNotes]
    }
    const last = chords[chords.length - 1]
    return Array.isArray(last.chordNotes) ? [...last.chordNotes] : []
}

function ensureSongStructure() {
    if (!globals.project)
        throw new Error("No project loaded")
    if (!Array.isArray(globals.project.chords))
        globals.project.chords = []
    if (!globals.project.songs)
        globals.project.songs = { default: { ids: [], favourites: [], blacklist: [] } }
    if (!globals.project.songs.default)
        globals.project.songs.default = { ids: [], favourites: [], blacklist: [] }
    if (!Array.isArray(globals.project.songs.default.ids))
        globals.project.songs.default.ids = []
    if (!globals.chordTriggerMap)
        globals.chordTriggerMap = {}
    if (typeof globals.maxChordConfigs !== "number")
        globals.maxChordConfigs = Object.keys(globals.chordTriggerMap).length
}

function allocatedNextId(chordConfigs) {
    if (chordConfigs.length === 0)
        return 1
    const ids = chordConfigs.map(config => config.id != undefined ? config.id : -1)
    return Math.max(...ids) + 1
}
