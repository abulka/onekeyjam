// @ts-check
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as chordDb from '../src/lib/config.js'
import { checkScaleAgainstChord, chordSymbolVoicingMismatch } from '../src/lib/chordScaleEngine.js'
import { declaredProjectKey, normalizeKey, projectColour } from '../src/lib/projectKey.js'

/** The declared key plus the project's colour, for key-aware checking. */
export function projectKeyContext(project) {
    const key = declaredProjectKey(project)
    return key ? { ...key, colour: projectColour(project) } : undefined
}

/**
 * The key that governs a chord for checking: the chord's own section key when
 * it has one, else the declared project key. Unlike resolveChordKey this does
 * not fall back to detection, so key-free projects are checked without a key
 * exactly as before.
 * @param {*} project
 * @param {*} chord
 */
export function chordKeyContext(project, chord) {
    const key = normalizeKey(chord && chord.key) ?? declaredProjectKey(project)
    return key ? { ...key, colour: projectColour(project) } : undefined
}

export const root = fileURLToPath(new URL('..', import.meta.url))
export const projectDirs = [
    join(root, 'public/projects/featured'),
    join(root, 'public/projects/classic'),
    join(root, 'public/projects/progressions'),
    join(root, 'public/projects/rock'),
    join(root, 'public/projects/multi-key'),
]

/** List every project file across the static libraries. */
export function listProjectFiles() {
    const files = []
    for (const dir of projectDirs) {
        let names = []
        try {
            names = readdirSync(dir)
        } catch (e) {
            continue
        }
        for (const file of names) {
            if (file.endsWith('.json') && !file.endsWith('-manifest.json'))
                files.push({ dir, file })
        }
    }
    return files.sort((a, b) => a.file.localeCompare(b.file))
}

/** @param {string} path */
export function loadJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'))
}

/** @param {*} chord */
export function chordInfoFor(chord) {
    const notes = chord.chordNotes && chord.chordNotes.length > 0
        ? chord.chordNotes
        : (chord.chord ? chordDb[chord.chord] : undefined)
    return {
        symbol: chord.chord,
        notes,
        bass: chord.bass ?? chord.bassNote,
        name: chord.name,
    }
}

/** @param {*} project */
export function findScaleProblems(project) {
    const problems = []
    for (const chord of project.chords ?? []) {
        const key = chordKeyContext(project, chord)
        const input = chordInfoFor(chord)
        for (const scaleKey of ['scale1', 'scale2', 'scale3']) {
            const scaleName = chord[scaleKey]
            if (!scaleName || scaleName === 'notes of chord')
                continue
            const result = checkScaleAgainstChord(input, scaleName, key)
            if (!result.ok)
                problems.push({ chord, key: scaleKey, scale: scaleName, reasons: result.reasons })
        }
    }
    return problems
}

/**
 * Scales whose colour notes fall outside the declared project key, without
 * counting as failures. These are reported as warnings because chromatic
 * colour is often deliberate. Chords governed by no key (a key-free project)
 * are skipped.
 * @param {*} project
 */
export function findOutOfKeyScales(project) {
    const warnings = []
    for (const chord of project.chords ?? []) {
        const key = chordKeyContext(project, chord)
        if (!key)
            continue
        const input = chordInfoFor(chord)
        for (const scaleKey of ['scale1', 'scale2', 'scale3']) {
            const scaleName = chord[scaleKey]
            if (!scaleName || scaleName === 'notes of chord')
                continue
            const result = checkScaleAgainstChord(input, scaleName, key)
            if (result.ok && result.outOfKey.length > 0)
                warnings.push({ chord, key: scaleKey, scale: scaleName, outOfKey: result.outOfKey })
        }
    }
    return warnings
}

/** @param {*} project */
export function findSymbolVoicingMismatches(project) {
    const mismatches = []
    for (const chord of project.chords ?? []) {
        const input = chordInfoFor(chord)
        if (!input.notes || input.notes.length === 0)
            continue
        const mismatch = chordSymbolVoicingMismatch(input)
        if (mismatch)
            mismatches.push({ chord, ...mismatch })
    }
    return mismatches
}
