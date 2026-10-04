// @ts-check
import { join } from 'node:path'
import { findScaleProblems, findOutOfKeyScales, findSymbolVoicingMismatches, listProjectFiles, loadJson } from './project-scale-utils.mjs'

const strict = process.argv.includes('--strict')
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
    .map((file) => file.endsWith('.json') ? file : `${file}.json`)

const all = listProjectFiles()
const targets = requested.length > 0
    ? all.filter(({ file }) => requested.includes(file))
    : all

let failures = 0
let keyWarnings = 0
for (const { dir, file } of targets) {
    const project = loadJson(join(dir, file))
    const problems = findScaleProblems(project)
    const mismatches = findSymbolVoicingMismatches(project)
    const outOfKey = findOutOfKeyScales(project)
    if (problems.length === 0 && mismatches.length === 0 && outOfKey.length === 0)
        continue
    if (problems.length > 0 || mismatches.length > 0) {
        failures++
        console.error(`${strict ? '✗' : '⚠'} ${file}`)
    }
    else {
        keyWarnings++
        console.error(`ℹ ${file}`)
    }
    for (const mismatch of mismatches)
        console.error(`    ${mismatch.chord.name ?? mismatch.chord.chord}: "${mismatch.symbol}" does not contain the voiced notes; the voicing is used instead`)
    for (const problem of problems)
        console.error(`    ${problem.chord.name ?? problem.chord.chord}: "${problem.scale}" - ${problem.reasons.join('; ')}`)
    for (const warning of outOfKey)
        console.error(`    ${warning.chord.name ?? warning.chord.chord}: "${warning.scale}" uses out-of-key colour ${warning.outOfKey.join(', ')}`)
}

if (failures > 0) {
    console.warn(`\n${failures} of ${targets.length} projects have questionable chord scales.`)
    console.warn('Run bin/regenerate-project-scales.mjs --write to fix the flagged chords.')
    if (strict)
        process.exit(1)
}
else {
    console.log(`Checked ${targets.length} projects - all chord scales contain their guide tones.`)
}
if (keyWarnings > 0)
    console.log(`${keyWarnings} projects use deliberate out-of-key colour notes (reported above).`)
