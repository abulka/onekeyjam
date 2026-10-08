// @ts-check
import { globals } from "./globals.js";
import { resolveGridChords } from "./triggerMaps.js";

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
 * The sequence-ready symbol for one grid chord, e.g. "Dm7" or "E7/D".
 * @param {ChordConfig} config
 * @returns {string} "" when the config has no chord name
 */
export function gridChordSymbol(config) {
    const chord = typeof config?.chord === "string" ? config.chord.trim() : ""
    if (!chord)
        return ""
    const bass = typeof config?.bass === "string" ? config.bass.trim() : ""
    return bass ? `${chord}/${bass}` : chord
}

/**
 * Space-separated chord names from the grid in trigger order, e.g.
 * "Dsus4 Dmaj7 C#m11". Returns "" when the grid has no named chords.
 * @param {Project} [project]
 * @returns {string}
 */
export function buildChordSequenceTextFromGrid(project = globals.project) {
    return orderedGridChordConfigs(project).map(gridChordSymbol).filter(Boolean).join(" ")
}
