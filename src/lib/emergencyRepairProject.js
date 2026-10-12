// @ts-check
import * as Tonal from '@tonaljs/tonal';
import { createDefaultSongs } from './song';
import { createDefaultMetaProjectConfig } from './projectConfig';
import { expandChordConfig } from './expandChordConfig.js';
import { numericId, uniqueNumericIds } from './id.js';
import { maxChordConfigs as maxChordConfigsDefault } from './globals-config.js';
import { normalizeKey } from './projectKey.js';
import { normaliseNoteName, createChordSymbol } from './note-tools.js';
import { removeBassSlash } from './removeBassSlash.js';

/** @typedef {import("../../src/lib/typedefs").Project} Project */

/**
 * Repair a project object so that it has all the properties it should. In place repair.
 * This normalises ids to numbers and makes sure the grid arrangement
 * (`songs.default.ids`) is a valid, ordered subset of the pool, so a load can
 * never reshuffle or lose the chords the user arranged.
 * @param {Project} project 
 * @returns Nothing
 */
export function emergencyRepairProject(project) {
    if (!project.meta)
        project.meta = createDefaultMetaProjectConfig()

    if (!project.name)
        project.name = "";

    if (!project.options)
        project.options = {}

    if (!Array.isArray(project.chords))
        project.chords = [];

    if (project.songs === undefined || project.songs === null)
        project.songs = createDefaultSongs()

    normaliseChordIds(project);
    normaliseChordKeys(project);
    normaliseChordSpellings(project);
    expandProjectChordConfigs(project); // in place
    repairArrangement(project);
}

/**
 * Fold theoretical or double accidentals (E#, B#, Cb, Fb, F##, ...) into the
 * twelve sharp spellings the app uses, so a stored E#m reads and ranks as Fm.
 * Custom names Tonal cannot parse are left untouched, and a chord whose root is
 * already a normal spelling is not rewritten at all.
 */
function normaliseChordSpellings(project) {
    for (const chord of project.chords) {
        if (!chord)
            continue
        if (chord.chord)
            chord.chord = normaliseChordSymbol(chord.chord)
        if (typeof chord.symbols === 'string' && chord.symbols.length > 0)
            chord.symbols = chord.symbols
                .split(',')
                .map(alias => normaliseChordSymbol(alias.trim()))
                .filter(Boolean)
                .join(',')
        if (chord.bass)
            chord.bass = normaliseNoteName(chord.bass)
        if (chord.bassNote)
            chord.bassNote = simplifyKeep(chord.bassNote)
        if (Array.isArray(chord.chordNotes))
            chord.chordNotes = chord.chordNotes.map(simplifyKeep)
    }
}

/** Simplify a note name, keeping the original if it does not parse. */
function simplifyKeep(note) {
    const simplified = Tonal.Note.simplify(note)
    return simplified || note
}

/**
 * Normalise the root and any slash bass of a stored chord symbol. Unparseable
 * or custom symbols are returned unchanged.
 * @param {string} symbol
 * @returns {string}
 */
function normaliseChordSymbol(symbol) {
    const [name, bass] = removeBassSlash(symbol)
    const chordObj = Tonal.Chord.get(name)
    if (chordObj.empty || !chordObj.tonic)
        return symbol
    const root = normaliseNoteName(chordObj.tonic)
    const newName = root === chordObj.tonic
        ? name
        : createChordSymbol(root, chordObj.aliases[0] || 'M')
    return bass ? `${newName}/${normaliseNoteName(bass)}` : newName
}

/**
 * Keep only valid optional section keys on chords. An invalid or partial key is
 * dropped, so the chord falls back to the project key rather than failing. The
 * optional key lock is normalised to a boolean too.
 */
function normaliseChordKeys(project) {
    for (const chord of project.chords) {
        if (!chord)
            continue;
        if (chord.key) {
            const normalized = normalizeKey(chord.key);
            if (normalized)
                chord.key = normalized;
            else
                delete chord.key;
        }
        if (chord.keyLocked !== true)
            delete chord.keyLocked;
    }
}

/**
 * Give every chord a unique numeric id. Numeric strings are coerced, gaps are
 * filled sequentially, and duplicates are reallocated. No random ids.
 */
function normaliseChordIds(project) {
    const used = new Set()
    // First pass: keep the first valid numeric id for each chord.
    for (const chord of project.chords) {
        const id = numericId(chord.id)
        if (typeof id === 'number' && !used.has(id)) {
            chord.id = id
            used.add(id)
        }
        else {
            chord.id = undefined
        }
    }
    // Second pass: allocate fresh sequential ids where none survives.
    let next = 1
    for (const chord of project.chords) {
        if (chord.id === undefined) {
            while (used.has(next))
                next++
            chord.id = next
            used.add(next)
        }
    }
}

function expandProjectChordConfigs(project) {
    for (const chordConfig of project.chords)
        expandChordConfig(chordConfig) // in place
}

/**
 * Make sure the grid arrangement exists and only names chords still in the
 * pool. When a file predates the arrangement (for example a MIDI import that
 * never re-dealt), seed a stable hand: favourites first, then the next pool
 * chords up to the grid size. This is deterministic, never random.
 */
function repairArrangement(project) {
    if (!project.songs)
        project.songs = createDefaultSongs()
    if (!project.songs.default)
        project.songs.default = { ids: [], favourites: [], blacklist: [] }
    const song = project.songs.default

    const poolIds = project.chords.map(chord => chord.id)
    const poolSet = new Set(poolIds)

    song.favourites = uniqueNumericIds(song.favourites).filter(id => poolSet.has(id))
    song.blacklist = uniqueNumericIds(song.blacklist).filter(id => poolSet.has(id))

    const arrangement = uniqueNumericIds(song.ids).filter(id => poolSet.has(id))
    if (arrangement.length > 0) {
        song.ids = arrangement
        return
    }

    // No usable arrangement stored: build a stable starting hand.
    const gridRows = Math.max(maxChordConfigsDefault, song.favourites.length)
    const seeded = [...song.favourites]
    for (const id of poolIds) {
        if (seeded.length >= gridRows)
            break
        if (!seeded.includes(id))
            seeded.push(id)
    }
    song.ids = seeded
}
