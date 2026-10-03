// @ts-check
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chordScaleNamesFor } from '../src/lib/chordScaleEngine.js'
import { findScaleProblems, findSymbolVoicingMismatches, chordInfoFor, projectsDir } from './project-scale-utils.mjs'

const write = process.argv.includes('--write')
const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
    .map((file) => file.endsWith('.json') ? file : `${file}.json`)

/*
 * Projects where the scales are deliberately shared across chords or used as
 * teaching examples, so chord-by-chord regeneration would destroy the intent.
 */
const SKIP_FILES = new Set([
    'Em Am+9 CM9 Bm+11.json',
    'Misc chords 2.json',
    'Em i VII v - fretboard 2 - Em D Bm.json',
    'How to Solo 01 - youtube.json',
    'Misc chords - initial project.json',
    'Fmaj7 Dm6 Em7 C6.json',
    'Adam Neely crazy chord.json',
])

const targets = files.length > 0
    ? files
    : readdirSync(projectsDir).filter((file) => file.endsWith('.json') && !file.endsWith('-manifest.json')).sort()

/**
 * Replace the scale values in the original JSON text by occurrence index, so
 * unchanged whitespace and key order are preserved. Returns the new text.
 * @param {string} text
 * @param {Array<*>} chords
 * @param {Map<*, Map<string, {before: string, after: string}>>} changesByChord
 */
function applyChangesPreservingFormat(text, chords, changesByChord) {
    let result = text
    for (const key of ['scale1', 'scale2', 'scale3']) {
        const targetByOccurrence = new Map()
        let occurrence = 0
        for (const chord of chords) {
            if (chord[key] === undefined)
                continue
            const change = changesByChord.get(chord)?.get(key)
            if (change)
                targetByOccurrence.set(occurrence, change)
            occurrence++
        }
        if (targetByOccurrence.size === 0)
            continue
        let index = 0
        const pattern = new RegExp(`("${key}"\\s*:\\s*)"([^"]*)"`, 'g')
        result = result.replace(pattern, (match, prefix, value) => {
            const target = targetByOccurrence.get(index++)
            if (target && target.before === value)
                return `${prefix}"${target.after}"`
            return match
        })
    }
    return result
}

let changedFiles = 0
let changedChords = 0
let skipped = 0

for (const file of targets) {
    if (SKIP_FILES.has(file)) {
        skipped++
        continue
    }
    const filePath = join(projectsDir, file)
    const originalText = readFileSync(filePath, 'utf8')
    const project = JSON.parse(originalText)
    const problems = findScaleProblems(project)
    if (problems.length === 0)
        continue

    const flagged = new Map()
    for (const problem of problems) {
        if (!flagged.has(problem.chord))
            flagged.set(problem.chord, new Set())
        flagged.get(problem.chord).add(problem.key)
    }
    // A symbol/voicing mismatch means the stored scales may have been chosen
    // for the wrong chord, so regenerate all three slots for that chord.
    for (const mismatch of findSymbolVoicingMismatches(project))
        flagged.set(mismatch.chord, new Set(['scale1', 'scale2', 'scale3']))

    const changesByChord = new Map()
    for (const chord of project.chords ?? []) {
        const flaggedKeys = flagged.get(chord)
        if (!flaggedKeys)
            continue
        const info = chordInfoFor(chord)
        if (!info.symbol && (!info.notes || info.notes.length === 0))
            continue

        const ranked = chordScaleNamesFor(info, 8)
        const assigned = new Map()
        const changes = new Map()

        for (const key of ['scale1', 'scale2', 'scale3']) {
            const before = chord[key]
            if (before === 'notes of chord') {
                assigned.set(key, before)
                continue
            }
            if (flaggedKeys.has(key)) {
                const replacement = ranked.find((name) => ![...assigned.values()].some((used) => used.toLowerCase() === name.toLowerCase()))
                if (replacement)
                    assigned.set(key, replacement)
            }
            else if (before && [...assigned.values()].some((used) => used.toLowerCase() === before.toLowerCase())) {
                const replacement = ranked.find((name) => ![...assigned.values()].some((used) => used.toLowerCase() === name.toLowerCase()))
                assigned.set(key, replacement ?? before)
            }
            else {
                assigned.set(key, before)
            }
            const after = assigned.get(key)
            if (after !== undefined && after !== before && before !== undefined)
                changes.set(key, { before, after })
        }

        if (changes.size > 0) {
            changesByChord.set(chord, changes)
            const before = [chord.scale1, chord.scale2, chord.scale3]
            const after = ['scale1', 'scale2', 'scale3'].map((key) => assigned.get(key) ?? '')
            console.log(`  ${file} :: ${chord.name ?? chord.chord}`)
            console.log(`    before: ${before.join(' | ') || '(blank)'}`)
            console.log(`    after:  ${after.join(' | ')}`)
            changedChords++
        }
    }

    if (changesByChord.size > 0) {
        changedFiles++
        if (write)
            writeFileSync(filePath, applyChangesPreservingFormat(originalText, project.chords ?? [], changesByChord))
    }
}

const mode = write ? 'Wrote' : 'Would write'
console.log(`\n${mode} ${changedChords} chord scale sets across ${changedFiles} projects.`)
if (skipped > 0)
    console.log(`Skipped ${skipped} projects with deliberately shared scales.`)
if (!write && changedChords > 0)
    console.log('Re-run with --write to apply.')
