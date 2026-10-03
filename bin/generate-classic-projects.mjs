// @ts-check
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as Tonal from '@tonaljs/tonal'
import { chordScaleNamesFor } from '../src/lib/chordScaleEngine.js'
import { DEFINITIONS } from './classic-project-definitions.mjs'

/*
 * Generates the classic project library in public/projects/classic. Each
 * progression becomes a project with standard voicings (via the chord symbol,
 * which the app expands on load) and engine-chosen scale1/2/3.
 *
 * Run: node bin/generate-classic-projects.mjs
 */

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(root, 'public', 'projects', 'classic')
mkdirSync(outDir, { recursive: true })

let written = 0
const problems = []

for (const definition of DEFINITIONS) {
    const chords = []
    let ok = true
    for (let i = 0; i < definition.chords.length; i++) {
        const symbol = definition.chords[i]
        const chord = Tonal.Chord.get(symbol)
        if (chord.empty) {
            problems.push(`${definition.name}: "${symbol}" is not a Tonal chord symbol`)
            ok = false
            continue
        }
        const scaleNames = chordScaleNamesFor(symbol, 3)
        chords.push({
            id: i + 1,
            name: symbol,
            chord: symbol,
            bass: `${chord.tonic}2`,
            scale1: scaleNames[0] ?? '',
            scale2: scaleNames[1] ?? '',
            scale3: scaleNames[2] ?? '',
        })
    }
    if (!ok)
        continue

    const ids = chords.map((chord) => chord.id)
    const project = {
        name: definition.name,
        chords,
        options: {},
        meta: {
            type: 'onekeyjam',
            version: 2,
            source: 'https://onekeyjam.netlify.app',
        },
        songs: {
            default: { ids, favourites: ids, blacklist: [] },
        },
    }
    writeFileSync(join(outDir, `${definition.name}.json`), `${JSON.stringify(project, null, 2)}\n`)
    written++
}

if (problems.length > 0) {
    console.warn('Skipped some chords:')
    for (const problem of problems)
        console.warn(`  ${problem}`)
}

console.log(`Generated ${written} classic projects in public/projects/classic.`)
