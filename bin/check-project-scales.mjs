// @ts-check
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { findScaleProblems, findSymbolVoicingMismatches, loadJson, projectsDir } from './project-scale-utils.mjs'

const strict = process.argv.includes('--strict')
const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
    .map((file) => file.endsWith('.json') ? file : `${file}.json`)

const targets = files.length > 0
    ? files
    : readdirSync(projectsDir).filter((file) => file.endsWith('.json') && !file.endsWith('-manifest.json')).sort()

let failures = 0
for (const file of targets) {
    const project = loadJson(join(projectsDir, file))
    const problems = findScaleProblems(project)
    const mismatches = findSymbolVoicingMismatches(project)
    if (problems.length === 0 && mismatches.length === 0)
        continue
    failures++
    console.error(`${strict ? '✗' : '⚠'} ${file}`)
    for (const mismatch of mismatches)
        console.error(`    ${mismatch.chord.name ?? mismatch.chord.chord}: "${mismatch.symbol}" does not contain the voiced notes; the voicing is used instead`)
    for (const problem of problems)
        console.error(`    ${problem.chord.name ?? problem.chord.chord}: "${problem.scale}" - ${problem.reasons.join('; ')}`)
}

if (failures > 0) {
    console.warn(`\n${failures} of ${targets.length} projects have questionable chord scales.`)
    console.warn('Run bin/regenerate-project-scales.mjs --write to fix the flagged chords.')
    if (strict)
        process.exit(1)
}
else {
    console.log(`Checked ${targets.length} projects - all chord scales look consistent.`)
}
