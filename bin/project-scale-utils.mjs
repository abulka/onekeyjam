// @ts-check
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as chordDb from '../src/lib/config.js'
import { checkScaleAgainstChord, chordSymbolVoicingMismatch } from '../src/lib/chordScaleEngine.js'

export const root = fileURLToPath(new URL('..', import.meta.url))
export const projectsDir = join(root, 'public/projects')

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
        const input = chordInfoFor(chord)
        for (const key of ['scale1', 'scale2', 'scale3']) {
            const scaleName = chord[key]
            if (!scaleName || scaleName === 'notes of chord')
                continue
            const result = checkScaleAgainstChord(input, scaleName)
            if (!result.ok)
                problems.push({ chord, key, scale: scaleName, reasons: result.reasons })
        }
    }
    return problems
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
