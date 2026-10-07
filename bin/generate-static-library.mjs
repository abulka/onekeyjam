// @ts-check
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as Tonal from '@tonaljs/tonal'
import { chordScaleNamesFor } from '../src/lib/chordScaleEngine.js'
import { sanitizeFilename } from '../src/lib/filename.js'
import {
    DEMO_PATTERN_TEMPO,
    defaultSequenceLabel,
    demoEntryForTriggers,
    normalizeSequences,
    planDemoSequences,
} from '../src/lib/demo-pattern.js'

/*
 * Shared helper for the generated static project libraries (classic,
 * progressions, rock). Each progression becomes a project with standard
 * voicings (via the chord symbol, which the app expands on load), an explicit
 * project key and colour, key-aware engine-chosen scale1/2/3, and one or more
 * demo chord playback patterns following the song's harmony rhythm. Repeats
 * share a grid row, so a pattern points back at earlier triggers and a long
 * form only adds the distinct chords it introduces.
 */

/**
 * A generated library entry. `chords` lists the grid rows; repeats are
 * folded, so Blue Moon's eight bars use four rows. Optional `sequence` (a
 * single loop, treated as `sequences.default`) or `sequences` (named loops)
 * describe the demo loops as chord symbols with bar lengths; without either,
 * every chord gets one bar in definition order with back to back repeats
 * merged into holds. `sequenceLabels` overrides the picker labels and
 * `sequenceTempos` overrides the stored tempo per sequence.
 * @typedef {object} StaticLibraryDefinition
 * @property {string} name display name
 * @property {string[]} chords chord symbols for the grid, in row order
 * @property {Array<{chord: string, bars: number}>} [sequence] legacy single demo loop
 * @property {Object.<string, Array<{chord: string, bars: number}>>} [sequences] named demo loops
 * @property {Object.<string, string>} [sequenceLabels] display labels per sequence name
 * @property {Object.<string, number>} [sequenceTempos] tempo per sequence name
 * @property {number} [tempo] default demo loop tempo, applied to the global BPM on load
 * @property {{tonic:string, type:string, source:string}} [key] declared key
 * @property {string} [colour] scale colour for the engine
 * @property {string} [scaleStyle] default Scale changes style for the song;
 *   without one the colour decides it (diatonic follows safe, otherwise follows)
 */

export const root = fileURLToPath(new URL('..', import.meta.url))

/** @param {number|undefined} tempo @param {number} fallback */
function clampTempo(tempo, fallback) {
    if (!Number.isFinite(tempo))
        return fallback
    return Math.min(240, Math.max(40, Math.round(tempo)))
}

/**
 * The default Scale changes style for a song colour. The style colour always
 * equals the song colour, so applying it on load rewrites no scales.
 * @param {string} colour
 */
function defaultScaleStyle(colour) {
    if (colour === 'diatonic')
        return 'follow-safe'
    if (colour === 'adventurous')
        return 'adventurous'
    return 'follow'
}

/**
 * Generate a static library folder from definitions. Stale JSON files that no
 * longer match a definition are removed, so moving entries between libraries
 * shrinks the old folder. Manifest files are left alone.
 * @param {StaticLibraryDefinition[]} definitions
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
        const colour = definition.colour ?? 'jazz'
        const scaleStyle = definition.scaleStyle ?? defaultScaleStyle(colour)
        let ok = true
        // Repeats share a grid row, so the rows are the union of the definition
        // chords and every named sequence's chords, in first-appearance order.
        const { uniqueSymbols, sequences, missing } = planDemoSequences(definition)
        const authored = normalizeSequences(definition)
        for (const [name, steps] of Object.entries(authored)) {
            for (const step of steps) {
                if (typeof step.bars !== 'number' || !(step.bars > 0)) {
                    problems.push(`${definition.name}: sequence "${name}" step for "${step.chord}" needs a positive bars value`)
                    ok = false
                }
            }
        }
        for (const symbol of missing)
            problems.push(`${definition.name}: sequence chord "${symbol}" is not a Tonal chord symbol`)
        if (missing.length > 0)
            ok = false
        const chords = []
        for (let i = 0; i < uniqueSymbols.length; i++) {
            const symbol = uniqueSymbols[i]
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
        // Every trigger must land on an assigned row; definitions without a
        // hand-authored sequence always satisfy this by construction.
        for (const [name, triggers] of Object.entries(sequences)) {
            for (const trigger of triggers) {
                if (!(trigger.index >= 0 && trigger.index < chords.length)) {
                    problems.push(`${definition.name}: sequence "${name}" points at missing trigger ${trigger.index + 1}`)
                    ok = false
                }
            }
        }
        const sequenceNames = Object.keys(sequences).filter((name) => sequences[name].length > 0)
        if (!ok || sequenceNames.length === 0)
            continue

        // Stored tempos stay inside the app's 40-240 BPM range; without one
        // the neutral default applies and the global BPM is left alone.
        const defaultTempo = clampTempo(definition.tempo, DEMO_PATTERN_TEMPO)
        /** @type {Object.<string, object>} */
        const chordSequences = {}
        for (const name of sequenceNames) {
            const tempo = clampTempo(definition.sequenceTempos ? definition.sequenceTempos[name] : undefined, defaultTempo)
            const entry = demoEntryForTriggers(sequences[name], tempo)
            const custom = definition.sequenceLabels ? definition.sequenceLabels[name] : undefined
            entry.label = custom || defaultSequenceLabel(name, entry.markend)
            chordSequences[name] = entry
        }

        const ids = chords.map((chord) => chord.id)
        const project = {
            name: definition.name,
            chords,
            options: definition.key ? { key: definition.key, colour, scaleStyle } : {},
            meta: {
                type: 'onekeyjam',
                version: 2,
                source: 'https://onekeyjam.netlify.app',
            },
            songs: {
                default: { ids, favourites: ids, blacklist: [] },
            },
            chordSequences,
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
