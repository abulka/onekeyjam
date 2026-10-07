// @ts-check
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as Tonal from '@tonaljs/tonal'
import { chordScaleNamesFor } from '../src/lib/chordScaleEngine.js'
import { sanitizeFilename } from '../src/lib/filename.js'

/*
 * Shared helper for the generated static project libraries (classic,
 * progressions, rock). Each progression becomes a project with standard
 * voicings (via the chord symbol, which the app expands on load), an explicit
 * project key and colour, and key-aware engine-chosen scale1/2/3.
 */

export const root = fileURLToPath(new URL('..', import.meta.url))

/**
 * Generate a static library folder from definitions. Stale JSON files that no
 * longer match a definition are removed, so moving entries between libraries
 * shrinks the old folder. Manifest files are left alone.
 * @param {Array<{name: string, chords: string[], key?: {tonic:string, type:string, source:string}, colour?: string}>} definitions
 * @param {string} outDirName folder under public/projects, e.g. 'classic'
 * @param {string} label human label for logging, e.g. 'classic'
 */
export function generateStaticLibrary(definitions, outDirName, label) {
    const outDir = join(root, 'public', 'projects', outDirName)
    mkdirSync(outDir, { recursive: true })

    let written = 0
    const problems = []
    const expectedFiles = new Set()

    for (const definition of definitions) {
        const chords = []
        const colour = definition.colour ?? 'jazz'
        let ok = true
        for (let i = 0; i < definition.chords.length; i++) {
            const symbol = definition.chords[i]
            const chord = Tonal.Chord.get(symbol)
            if (chord.empty) {
                problems.push(`${definition.name}: "${symbol}" is not a Tonal chord symbol`)
                ok = false
                continue
            }
            const scaleNames = chordScaleNamesFor(symbol, 3, { ...definition.key, colour })
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
            options: definition.key ? { key: definition.key, colour } : {},
            meta: {
                type: 'onekeyjam',
                version: 2,
                source: 'https://onekeyjam.netlify.app',
            },
            songs: {
                default: { ids, favourites: ids, blacklist: [] },
            },
        }
        // The project keeps its pretty display name; only the filename is
        // sanitised so Netlify can deploy it.
        const file = `${sanitizeFilename(definition.name)}.json`
        expectedFiles.add(file)
        writeFileSync(join(outDir, file), `${JSON.stringify(project, null, 2)}\n`)
        written++
    }

    // Remove stale projects, e.g. progressions that moved out of classic.
    for (const file of readdirSync(outDir)) {
        if (!file.endsWith('.json') || file.endsWith('-manifest.json'))
            continue
        if (!expectedFiles.has(file))
            rmSync(join(outDir, file))
    }

    if (problems.length > 0) {
        console.warn('Skipped some chords:')
        for (const problem of problems)
            console.warn(`  ${problem}`)
    }

    console.log(`Generated ${written} ${label} projects in public/projects/${outDirName}.`)
    return written
}
