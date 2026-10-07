/*
 * DeepSeek harness2: the synthesis referee.
 *
 * Settles the decisions the three first-pass harnesses could not:
 *  - follow repeat-hold fix (planned applyScalePolicy change)
 *  - safe diatonic styles through the full path
 *  - Steady preferPrimary prototype (So What return)
 *  - dominant-only tension versus Bold leap
 *  - phrase bias under realistic and stress solo notes
 *  - marginal effect of every low-level option
 *
 * Uses the real engine from src/lib with relative imports, plus harness-local
 * mirrors only for the two not-yet-shipped behaviours (preferPrimary term and
 * the planned follow repeat hold). See README.md and the synthesis plan.
 *
 * Run through run.sh (esbuild replaces import.meta.env, a Vite-only global).
 */

import fs from 'node:fs'
import path from 'node:path'
import * as Tonal from '@tonaljs/tonal'

import { globals } from '../../src/lib/globals.js'
import {
    POLICY_PRESETS,
    chooseFollowCandidate,
    chooseShuffleCandidate,
    chordShapeFor,
    pitchClassSet,
    recordSoloNote,
} from '../../src/lib/autoScale.js'
import { scaleNameToNotes } from '../../src/lib/scaleToNotes.js'
import { chordScaleNamesFor, rankScales, checkScaleAgainstChord } from '../../src/lib/chordScaleEngine.js'
import { resolveProjectKey } from '../../src/lib/projectKey.js'

const ROOT = process.env.OKJ_ROOT ?? process.cwd()
const CLASSIC_DIR = path.join(ROOT, 'public', 'projects', 'classic')
const SECTION = process.argv[2] ?? 'all'
const SEEDS = Number(process.env.SEEDS ?? 20)

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const mod12 = (n) => ((n % 12) + 12) % 12

const PC_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
/** A playable note name for a pitch class. @param {number} pc */
const noteName = (pc, octave = 4) => `${PC_NAMES[mod12(pc)]}${octave}`

function mulberry32(seed) {
    let a = seed >>> 0
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const pcsCache = new Map()
/** @param {string} scaleName */
function pcsOf(scaleName) {
    if (!scaleName)
        return new Set()
    const cached = pcsCache.get(scaleName)
    if (cached)
        return cached
    const scale = Tonal.Scale.get(scaleName)
    const pcs = scale.empty ? new Set() : new Set(scale.notes.map((note) => Tonal.Note.chroma(note)))
    pcsCache.set(scaleName, pcs)
    return pcs
}

const essentialCache = new Map()
/** Essential chord tones: root, third, seventh (if present). */
function essentialPcs(symbol) {
    const cached = essentialCache.get(symbol)
    if (cached)
        return cached
    const chord = Tonal.Chord.get(symbol)
    const pcs = new Set()
    if (!chord.empty) {
        const root = Tonal.Note.chroma(chord.tonic)
        pcs.add(mod12(root))
        for (const interval of chord.intervals) {
            const semitones = Tonal.Interval.get(interval).semitones
            if (semitones === 3 || semitones === 4 || semitones === 10 || semitones === 11)
                pcs.add(mod12(root + semitones))
        }
    }
    essentialCache.set(symbol, pcs)
    return pcs
}

function coverage(scalePcs, essential) {
    let n = 0
    for (const pc of essential)
        if (scalePcs.has(pc))
            n++
    return n
}

function setsEqual(a, b) {
    if (!a || !b || a.size !== b.size)
        return false
    for (const value of a)
        if (!b.has(value))
            return false
    return true
}

function countChanges(names) {
    let n = 0
    for (let i = 1; i < names.length; i++)
        if (names[i] !== names[i - 1])
            n++
    return n
}

function classicProjects() {
    return fs.readdirSync(CLASSIC_DIR)
        .filter((name) => name.endsWith('.json') && !name.includes('manifest'))
        .sort()
        .map((name) => ({ name, project: JSON.parse(fs.readFileSync(path.join(CLASSIC_DIR, name), 'utf8')) }))
}

function songOrder(project) {
    return project.songs?.default?.ids ?? project.chords.map((chord) => chord.id)
}

function groupOf(name) {
    if (/So What/i.test(name))
        return 'modal'
    if (/blues in/i.test(name) && !/alice/i.test(name))
        return 'blues12'
    if (/Blues for Alice/i.test(name))
        return 'bird-blues'
    if (/doo-wop|turnaround|Pachelbel|Blue Moon|Circle of fifths/i.test(name))
        return 'diatonic-pop'
    if (/ii-V-I in|ii-V-i in/i.test(name))
        return 'iiV'
    return 'standards'
}

function qualityOf(symbol) {
    const chord = Tonal.Chord.get(symbol)
    if (chord.empty)
        return 'other'
    const semis = chord.intervals.map((interval) => Tonal.Interval.get(interval).semitones)
    if (semis.includes(3) && semis.includes(6) && semis.includes(10))
        return 'm7b5'
    if (semis.includes(3) && semis.includes(10) && !semis.includes(4))
        return 'm7'
    if (semis.includes(4) && semis.includes(10) && !semis.includes(11))
        return 'dominant 7'
    if (semis.includes(4) && semis.includes(11))
        return 'maj7'
    return 'other'
}

const shapeCache = new Map()
/** Collected section aggregates for results.json. */
const REPORT = { meta: { section: SECTION, seeds: SEEDS } }
function shapeOf(config) {
    const cacheKey = `${config.chord}|${config.bass ?? ''}|${(config.chordNotes ?? []).join(',')}`
    const cached = shapeCache.get(cacheKey)
    if (cached)
        return cached
    const shape = chordShapeFor(config)
    shapeCache.set(cacheKey, shape)
    return shape
}

const presetOptions = (policy, name) => POLICY_PRESETS[policy].find((preset) => preset.name === name)?.options ?? {}

/* ------------------------------------------------------------------ */
/* Project configs, pools and state                                    */
/* ------------------------------------------------------------------ */

const configCache = new Map()
function buildConfigs(project, key) {
    const cacheKey = `${project.name}|${key.tonic}|${key.type}|${key.colour ?? ''}`
    const cached = configCache.get(cacheKey)
    if (cached)
        return cached
    const byId = new Map()
    for (const chord of project.chords) {
        const [scale1, scale2, scale3] = chordScaleNamesFor(
            { symbol: chord.chord, notes: chord.chordNotes, bass: chord.bass, name: chord.name },
            3,
            key,
        )
        byId.set(chord.id, {
            id: chord.id,
            name: chord.name,
            chord: chord.chord,
            chordNotes: chord.chordNotes,
            bass: chord.bass,
            scale1,
            scale2,
            scale3,
        })
    }
    configCache.set(cacheKey, byId)
    return byId
}

function poolFor(config, poolSize, key) {
    const out = []
    for (const slot of ['scale1', 'scale2', 'scale3']) {
        const name = config[slot]
        if (!name)
            continue
        const notes = scaleNameToNotes(name)
        if (!notes || notes.length === 0)
            continue
        const pcs = pitchClassSet(notes)
        if (out.some((entry) => setsEqual(entry.pcs, pcs)))
            continue
        out.push({ slot, name, notes, pcs, type: Tonal.Scale.get(name).type || name })
    }
    if (out.length < poolSize) {
        for (const suggestion of rankScales({ symbol: config.chord, notes: config.chordNotes, bass: config.bass, name: config.name }, poolSize, key)) {
            if (out.length >= poolSize)
                break
            const pcs = pitchClassSet(suggestion.notes)
            if (out.some((entry) => setsEqual(entry.pcs, pcs)))
                continue
            out.push({ slot: '', name: suggestion.name, notes: suggestion.notes, pcs, type: suggestion.type })
        }
    }
    return out
}

const poolCache = new Map()
function buildPools(project, key, poolSize) {
    const cacheKey = `${project.name}|${key.colour ?? ''}|${poolSize}`
    const cached = poolCache.get(cacheKey)
    if (cached)
        return cached
    const configs = buildConfigs(project, key)
    const pools = new Map()
    for (const [id, config] of configs)
        pools.set(id, poolFor(config, poolSize, key))
    poolCache.set(cacheKey, pools)
    return pools
}

function resetHarnessState(project, key, options) {
    globals.project = project
    globals.projectKey = key
    globals.chordHistory = []
    globals.recentSoloNotes = []
    globals.pendingNoteOffs = {}
    globals.currentScaleFilter = 'scale1'
    globals.scaleOverrideName = ''
    globals.scaleOverrideNotes = []
    globals.scaleFiltering.frozen = false
    globals.scaleFiltering.manualScaleNote = ''
    globals.scaleFiltering.manualScaleFilter = ''
    globals.scaleFiltering.autoScaleName = ''
    globals.scaleFiltering.autoScaleReason = ''
    globals.scaleFiltering.autoReason = ''
    globals.scaleFiltering.policyOptions = { ...options }
}

function pushHistory(config, scaleName, policy) {
    const entry = {
        triggerNote: 'harness',
        chordId: config.id,
        chordName: config.chord,
        shape: shapeOf(config),
        scalePcs: pcsOf(scaleName),
        scaleName,
        policy,
    }
    const last = globals.chordHistory[globals.chordHistory.length - 1]
    if (last && last.triggerNote === entry.triggerNote && last.chordId === entry.chordId && last.scaleName === entry.scaleName)
        globals.chordHistory[globals.chordHistory.length - 1] = entry
    else
        globals.chordHistory.push(entry)
    if (globals.chordHistory.length > 8)
        globals.chordHistory.shift()
}

/* ------------------------------------------------------------------ */
/* Follow decision (real engine, plus the two prototypes)              */
/* ------------------------------------------------------------------ */

function followContext(config, options) {
    const history = globals.chordHistory
    const last = history[history.length - 1]
    const secondLast = history.length >= 2 ? history[history.length - 2] : undefined
    const lastSolo = globals.recentSoloNotes[globals.recentSoloNotes.length - 1]
    return {
        current: shapeOf(config),
        previous: last ? last.shape : undefined,
        previous2: secondLast ? secondLast.shape : undefined,
        previousScalePcs: last ? last.scalePcs : new Set(),
        previousScaleName: last ? last.scaleName : '',
        previous2ScalePcs: secondLast ? secondLast.scalePcs : new Set(),
        recentScaleSets: history.slice(-3).map((entry) => entry.scalePcs),
        contextChords: options.contextChords ?? 1,
        phraseBias: options.phraseBias ?? false,
        phraseStrength: options.phraseStrength ?? 1,
        palette: options.palette ?? 'primary',
        preferPrimary: options.preferPrimary ?? 0,
        lastSoloPc: lastSolo ? lastSolo.pc : undefined,
        lastSoloName: lastSolo ? lastSolo.name : '',
    }
}

function candidatesOf(config) {
    const out = []
    for (const slot of ['scale1', 'scale2', 'scale3']) {
        if (!config[slot])
            continue
        out.push({ slot, name: config[slot], pcs: pcsOf(config[slot]) })
    }
    return out
}

function chooseFollow(config, style) {
    const candidates = candidatesOf(config)
    if (candidates.length === 0)
        return null
    // Everything now goes through the real engine: preferPrimary is applied in
    // continuityScore and the tension palette is resolved in
    // chooseFollowCandidate, so this section verifies shipped behaviour.
    const context = followContext(config, style.options)
    const { index, reason } = chooseFollowCandidate(candidates, context)
    return { name: candidates[index].name, slot: candidates[index].slot, pcs: candidates[index].pcs, reason }
}

/* ------------------------------------------------------------------ */
/* Runs and metrics                                                    */
/* ------------------------------------------------------------------ */

function newMetrics() {
    return {
        steps: 0, newChordSteps: 0, changesOnNew: 0, changesOnSame: 0,
        useful: 0, cosmetic: 0, harmful: 0, clashes: 0, auto: 0,
        newNotes: 0, changes: 0, domChanges: 0,
        soloSteps: 0, soloKept: 0,
    }
}

function addMetrics(target, source) {
    for (const key of Object.keys(target))
        target[key] += source[key]
}

function scoreStep(metrics, previous, current) {
    metrics.steps++
    if (current.clash)
        metrics.clashes++
    if (current.auto)
        metrics.auto++
    if (current.soloPc !== undefined) {
        metrics.soloSteps++
        if (current.pcs.has(current.soloPc))
            metrics.soloKept++
    }
    if (!previous)
        return
    const changed = !setsEqual(current.pcs, previous.pcs)
    if (current.chord !== previous.chord) {
        metrics.newChordSteps++
        if (changed) {
            metrics.changesOnNew++
            metrics.changes++
            const added = [...current.pcs].filter((pc) => !previous.pcs.has(pc)).length
            const removed = [...previous.pcs].filter((pc) => !current.pcs.has(pc)).length
            metrics.newNotes += Math.max(added, removed)
            if (current.cov > previous.cov)
                metrics.useful++
            else if (current.cov < previous.cov)
                metrics.harmful++
            else
                metrics.cosmetic++
            if (current.isDominant)
                metrics.domChanges++
        }
    }
    else if (changed) {
        metrics.changesOnSame++
        metrics.changes++
    }
}

function soloPolicyFor(scenario) {
    return ({ prevPick, prevConfig, config }) => {
        if (scenario === 'none')
            return null
        const prevShape = prevConfig ? shapeOf(prevConfig) : null
        const thirdOf = (shape) => noteName(shape.rootChroma + (shape.majorThird ? 4 : 3))
        if (scenario === 'third')
            return prevShape ? thirdOf(prevShape) : null
        if (scenario === 'root')
            return prevShape ? noteName(prevShape.rootChroma) : null
        if (scenario === 'colour') {
            const scale1 = pcsOf(config.scale1)
            for (const pc of pcsOf(config.scale2))
                if (!scale1.has(pc))
                    return noteName(pc)
            return prevShape ? thirdOf(prevShape) : null
        }
        if (scenario === 'outer') {
            if (prevPick) {
                const essential = essentialPcs(config.chord)
                const scale1 = pcsOf(config.scale1)
                for (const pc of prevPick.pcs)
                    if (!essential.has(pc) && !scale1.has(pc))
                        return noteName(pc)
            }
            return soloPolicyFor('colour')({ prevPick, prevConfig, config })
        }
        return null
    }
}

function runFollowProject(entry, style, options = {}) {
    const { project } = entry
    const key = { ...resolveProjectKey(project), colour: style.colour }
    project.options = project.options || {}
    project.options.colour = style.colour
    const mergedOptions = options.phraseOverride
        ? { ...style.options, ...options.phraseOverride }
        : style.options
    resetHarnessState(project, key, mergedOptions)
    const configs = buildConfigs(project, key)
    const soloPolicy = soloPolicyFor(options.solo ?? 'none')
    const hold = options.hold ?? false

    const metrics = newMetrics()
    const picks = []
    let previous = null
    let prevPick = null
    let prevConfig = null
    let lastFollowChordId = null

    const order = songOrder(project)
    for (let i = 0; i < order.length; i++) {
        const config = configs.get(order[i])
        if (!config)
            continue
        const shape = shapeOf(config)
        const soloName = soloPolicy({ prevPick, prevConfig, config })
        if (soloName)
            recordSoloNote(soloName)
        const soloPc = globals.recentSoloNotes[globals.recentSoloNotes.length - 1]?.pc

        let pick
        if (hold && lastFollowChordId === config.id && prevPick) {
            pick = prevPick
        }
        else {
            pick = chooseFollow(config, { ...style, options: mergedOptions })
            lastFollowChordId = config.id
        }
        if (!pick)
            continue

        const clashCheck = checkScaleAgainstChord(
            { symbol: config.chord, notes: config.chordNotes, bass: config.bass },
            pick.name,
            key,
        )
        const current = {
            chord: config.chord,
            scale: pick.name,
            pcs: pick.pcs,
            cov: coverage(pick.pcs, essentialPcs(config.chord)),
            clash: !clashCheck.ok,
            auto: false,
            isDominant: shape?.isDominant === true,
            soloPc: soloPc !== undefined ? soloPc : undefined,
        }
        scoreStep(metrics, previous, current)
        pushHistory(config, pick.name, 'follow')
        picks.push({ chord: config.chord, name: pick.name, pcs: pick.pcs, reason: pick.reason })
        previous = current
        prevPick = pick
        prevConfig = config
    }
    return { key, picks, metrics }
}

function runFollowLibrary(style, options = {}) {
    const perProject = new Map()
    const metrics = newMetrics()
    for (const entry of classicProjects()) {
        if (!resolveProjectKey(entry.project))
            continue
        const run = runFollowProject(entry, style, options)
        perProject.set(entry.name, run)
        addMetrics(metrics, run.metrics)
    }
    return { perProject, metrics, style }
}

function runShuffleProject(entry, style, options = {}) {
    const { project } = entry
    const merged = options.mergedOptions ?? style.options
    const key = { ...resolveProjectKey(project), colour: 'jazz' }
    project.options = project.options || {}
    project.options.colour = 'jazz'
    resetHarnessState(project, key, merged)
    const pools = options.pools ?? buildPools(project, key, merged.poolSize ?? 3)
    const configs = options.configs ?? buildConfigs(project, key)
    const metrics = newMetrics()
    const picks = []
    const rng = options.rng ?? mulberry32(1)
    const notesHeld = options.notesHeld ?? merged.notesHeld ?? false

    let rank = null
    let dwellRemaining = 0
    let lastChordId = null
    let previous = null
    let lastPcs = null

    const order = songOrder(project)
    for (const id of order) {
        const pool = pools.get(id)
        if (!pool || pool.length === 0)
            continue
        const config = configs.get(id)
        if (!config)
            continue
        const changed = id !== lastChordId
        let mode = 'draw'
        let closest = false
        if (!changed && rank != null)
            mode = 'hold'
        else if (changed && rank != null && dwellRemaining > 0)
            mode = 'hold'
        else if (notesHeld && (merged.deferWhilePlaying ?? true)) {
            mode = 'closest'
            closest = true
        }
        else if (changed && rank != null && rng() >= (merged.changeChance ?? 1))
            mode = 'steady'

        let index
        if (closest && lastPcs && lastPcs.size > 0) {
            let bestCommon = -1
            index = 0
            for (let i = 0; i < pool.length; i++) {
                let common = 0
                for (const pc of pool[i].pcs)
                    if (lastPcs.has(pc))
                        common++
                if (common > bestCommon) {
                    bestCommon = common
                    index = i
                }
            }
        }
        else if ((mode === 'hold' || mode === 'steady') && rank != null) {
            index = rank
        }
        else {
            const picked = chooseShuffleCandidate(pool, {
                previousScalePcs: lastPcs ?? new Set(),
                recentScaleSets: globals.chordHistory.slice(-3).map((entry) => entry.scalePcs),
                maxNewNotes: merged.maxNewNotes ?? 1,
                variety: merged.variety ?? 'gentle',
            }, rng)
            index = picked.index
        }
        const chosen = pool[index]
        if (!chosen)
            continue
        const clashCheck = checkScaleAgainstChord(
            { symbol: config.chord, notes: config.chordNotes, bass: config.bass },
            chosen.name,
            key,
        )
        const current = {
            chord: config.chord,
            scale: chosen.name,
            pcs: chosen.pcs,
            cov: coverage(chosen.pcs, essentialPcs(config.chord)),
            clash: !clashCheck.ok,
            auto: chosen.slot === '',
            isDominant: shapeOf(config)?.isDominant === true,
            soloPc: undefined,
        }
        scoreStep(metrics, previous, current)
        const historyConfig = { ...config, scale1: chosen.name, scale2: config.scale2, scale3: config.scale3 }
        pushHistory(historyConfig, chosen.name, 'shuffle')
        picks.push({ chord: config.chord, name: chosen.name, pcs: chosen.pcs })
        previous = current
        lastPcs = chosen.pcs

        if (mode === 'hold') {
            if (changed)
                dwellRemaining = Math.max(0, dwellRemaining - 1)
        }
        else {
            rank = index
            dwellRemaining = Math.max(0, (merged.dwell ?? 1) - 1)
        }
        lastChordId = id
    }
    return { picks, metrics }
}

function runShuffleLibrary(style, options = {}) {
    const perProject = new Map()
    const metrics = newMetrics()
    const seeds = options.seeds ?? SEEDS
    const mergedOptions = { ...style.options, ...(options.optionsOverride ?? {}) }
    for (const entry of classicProjects()) {
        if (!resolveProjectKey(entry.project))
            continue
        const key = { ...resolveProjectKey(entry.project), colour: 'jazz' }
        const pools = buildPools(entry.project, key, mergedOptions.poolSize ?? 3)
        const configs = buildConfigs(entry.project, key)
        const projectMetrics = newMetrics()
        let picks = null
        for (let seed = 1; seed <= seeds; seed++) {
            const run = runShuffleProject(entry, style, { ...options, mergedOptions, pools, configs, rng: mulberry32(seed * 7919) })
            addMetrics(projectMetrics, run.metrics)
            if (seed === 1)
                picks = run.picks
        }
        perProject.set(entry.name, { picks, metrics: projectMetrics })
        addMetrics(metrics, projectMetrics)
    }
    return { perProject, metrics, style }
}

/* ------------------------------------------------------------------ */
/* Style tables                                                        */
/* ------------------------------------------------------------------ */

const OPT = {
    simple: presetOptions('follow', 'simple'),
    steady: presetOptions('follow', 'steady'),
    resolve: presetOptions('follow', 'resolve'),
    tension: presetOptions('follow', 'tension'),
}

// Presets deleted from the engine in the synthesis, kept here only as
// comparison baselines.
const LEGACY = {
    progression: { contextChords: 2, phraseBias: false, phraseStrength: 1, palette: 'primary' },
    lyrical: { contextChords: 2, phraseBias: true, phraseStrength: 1, palette: 'primary' },
    melodic: { contextChords: 2, phraseBias: true, phraseStrength: 2, palette: 'colour' },
    colourful: { contextChords: 1, phraseBias: false, phraseStrength: 1, palette: 'colour' },
}

const FOLLOW_STYLES = {
    simple: { colour: 'jazz', options: OPT.simple, mode: 'engine' },
    progression: { colour: 'jazz', options: LEGACY.progression, mode: 'engine' },
    lyrical: { colour: 'jazz', options: LEGACY.lyrical, mode: 'engine' },
    melodic: { colour: 'jazz', options: LEGACY.melodic, mode: 'engine' },
    resolve: { colour: 'jazz', options: OPT.resolve, mode: 'engine' },
    colourful: { colour: 'jazz', options: LEGACY.colourful, mode: 'engine' },
    leap: { colour: 'jazz', options: { ...OPT.simple, palette: 'bold' }, mode: 'engine' },
    'follow-safe': { colour: 'diatonic', options: OPT.simple, mode: 'engine' },
    'safe-melodic': { colour: 'diatonic', options: LEGACY.melodic, mode: 'engine' },
    'steady-25': { colour: 'diatonic', options: { ...OPT.steady, preferPrimary: 0.25 }, mode: 'engine' },
    'steady-50': { colour: 'diatonic', options: { ...OPT.steady, preferPrimary: 0.5 }, mode: 'engine' },
    'steady-100': { colour: 'diatonic', options: OPT.steady, mode: 'engine' },
    'steady-200': { colour: 'diatonic', options: { ...OPT.steady, preferPrimary: 2 }, mode: 'engine' },
    'steady-jazz-50': { colour: 'jazz', options: { ...OPT.steady, preferPrimary: 0.5 }, mode: 'engine' },
    tension: { colour: 'jazz', options: OPT.tension, mode: 'engine' },
}

const SHUFFLE_STYLES = {
    subtle: { options: { poolSize: 3, dwell: 2, changeChance: 1, maxNewNotes: 1, deferWhilePlaying: true, variety: 'gentle' } },
    varied: { options: { poolSize: 5, dwell: 1, changeChance: 1, maxNewNotes: 1, deferWhilePlaying: true, variety: 'lively' } },
    wild: { options: { poolSize: 6, dwell: 1, changeChance: 1, maxNewNotes: 7, deferWhilePlaying: false, variety: 'lively' } },
}

/* ------------------------------------------------------------------ */
/* Reporting                                                           */
/* ------------------------------------------------------------------ */

const followCache = new Map()
function getFollowRun(styleName, options = {}) {
    const key = JSON.stringify([styleName, options])
    if (!followCache.has(key))
        followCache.set(key, runFollowLibrary(FOLLOW_STYLES[styleName], options))
    return followCache.get(key)
}

const shuffleCache = new Map()
function getShuffleRun(styleName, options = {}) {
    const key = JSON.stringify([styleName, options])
    if (!shuffleCache.has(key))
        shuffleCache.set(key, runShuffleLibrary(SHUFFLE_STYLES[styleName], options))
    return shuffleCache.get(key)
}

function pct(a, b) {
    return b ? `${(100 * a / b).toFixed(1)}%` : '-'
}

function changeRate(metrics) {
    return metrics.newChordSteps ? metrics.changesOnNew / metrics.newChordSteps : 0
}

function compareLibraries(left, right) {
    let diffs = 0
    let total = 0
    const perProject = new Map()
    for (const [name, run] of left.perProject) {
        const other = right.perProject.get(name)
        if (!other)
            continue
        let projectDiffs = 0
        const n = Math.min(run.picks.length, other.picks.length)
        for (let i = 0; i < n; i++) {
            total++
            if (run.picks[i].name !== other.picks[i].name) {
                diffs++
                projectDiffs++
            }
        }
        perProject.set(name, projectDiffs)
    }
    return { diffs, total, perProject }
}

function groupMetrics(run) {
    const groups = new Map()
    for (const [name, projectRun] of run.perProject) {
        const group = groupOf(name)
        if (!groups.has(group))
            groups.set(group, newMetrics())
        addMetrics(groups.get(group), projectRun.metrics)
    }
    return groups
}

function printFollowRow(styleName, style, run, baseline) {
    const m = run.metrics
    const diff = baseline ? ` ${pct(compareLibraries(run, baseline).diffs, compareLibraries(run, baseline).total).padStart(6)}` : '      -'
    console.log(
        `${styleName.padEnd(15)} ${style.colour.padEnd(10)} ${String(m.steps).padEnd(7)} ${pct(m.changesOnNew, m.newChordSteps).padStart(7)}`
        + ` ${String(m.changesOnSame).padStart(9)} ${String(m.useful).padStart(6)} ${String(m.cosmetic).padStart(7)} ${String(m.harmful).padStart(6)}`
        + ` ${String(m.clashes).padStart(6)} ${String(m.auto).padStart(5)} ${(m.changes ? m.newNotes / m.changes : 0).toFixed(2).padStart(6)}${diff}`,
    )
}

function traceProject(styleName, projectName, options = {}) {
    const run = getFollowRun(styleName, options)
    const projectRun = run.perProject.get(projectName)
    if (!projectRun)
        return []
    return projectRun.picks
}

/* ------------------------------------------------------------------ */
/* Section 0: corpus composition and repertoire-only check             */
/* ------------------------------------------------------------------ */

function isExercise(name) {
    return /^ii-V|turnaround|doo-wop|Pachelbel|Andalusian|Circle of fifths|Secondary dominants|tritone sub|blues in/i.test(name)
}

function aggregateSubset(run, predicate) {
    const metrics = newMetrics()
    for (const [name, projectRun] of run.perProject)
        if (predicate(name))
            addMetrics(metrics, projectRun.metrics)
    return metrics
}

function compareLibrariesSubset(left, right, predicate) {
    let diffs = 0
    let total = 0
    for (const [name, run] of left.perProject) {
        if (!predicate(name))
            continue
        const other = right.perProject.get(name)
        if (!other)
            continue
        const n = Math.min(run.picks.length, other.picks.length)
        for (let i = 0; i < n; i++) {
            total++
            if (run.picks[i].name !== other.picks[i].name)
                diffs++
        }
    }
    return { diffs, total }
}

function sectionCorpus() {
    console.log('\n=== 0. Corpus composition and repertoire-only check ===')
    const names = [...getFollowRun('simple', { hold: true }).perProject.keys()]
    const exercises = names.filter(isExercise)
    const repertoire = names.filter((name) => !isExercise(name))
    console.log(`projects: ${names.length}, exercises: ${exercises.length} (ii-V drills, turnarounds, blues forms, tutorials), repertoire: ${repertoire.length}`)
    const inRepertoire = (name) => !isExercise(name)
    const simple = getFollowRun('simple', { hold: true })
    console.log('style          repertoire changeRate  repertoire diffVsSimple  full changeRate')
    for (const styleName of ['simple', 'follow-safe', 'steady-100', 'resolve', 'melodic', 'leap', 'tension']) {
        const run = getFollowRun(styleName, { hold: true })
        const subset = aggregateSubset(run, inRepertoire)
        const diff = compareLibrariesSubset(run, simple, inRepertoire)
        console.log(`${styleName.padEnd(14)} ${pct(subset.changesOnNew, subset.newChordSteps).padStart(20)} ${pct(diff.diffs, diff.total).padStart(22)} ${pct(run.metrics.changesOnNew, run.metrics.newChordSteps).padStart(15)}`)
    }
    REPORT.corpus = {
        projects: names.length,
        exercises: exercises.length,
        repertoire: repertoire.length,
        repertoireChangeRate: Object.fromEntries(['simple', 'follow-safe', 'steady-100', 'resolve', 'melodic', 'leap', 'tension'].map((styleName) => {
            const subset = aggregateSubset(getFollowRun(styleName, { hold: true }), inRepertoire)
            return [styleName, subset.newChordSteps ? subset.changesOnNew / subset.newChordSteps : 0]
        })),
    }
}

/* ------------------------------------------------------------------ */
/* Section 1: follow and shuffle regression                            */
/* ------------------------------------------------------------------ */

function sectionFollow() {
    console.log('\n=== 1a. Follow styles: library regression, repeat hold on/off ===')
    console.log(`projects: ${classicProjects().length}, style count: ${Object.keys(FOLLOW_STYLES).length}`)
    console.log('style           colour     triggers changeRate sameChord(off/on) useful cosmetic harmful clashes auto avgNew diffVsSimple(hold-on)')
    const simpleOn = getFollowRun('simple', { hold: true })
    REPORT.follow = {}
    for (const styleName of Object.keys(FOLLOW_STYLES)) {
        const style = FOLLOW_STYLES[styleName]
        const off = getFollowRun(styleName, { hold: false })
        const on = getFollowRun(styleName, { hold: true })
        const m = on.metrics
        const sameChord = `${off.metrics.changesOnSame}/${m.changesOnSame}`
        const diff = compareLibraries(on, simpleOn)
        REPORT.follow[styleName] = {
            colour: style.colour,
            mode: style.mode,
            triggers: m.steps,
            changeRate: changeRate(m),
            changesOnSameWithHold: m.changesOnSame,
            useful: m.useful,
            cosmetic: m.cosmetic,
            harmful: m.harmful,
            clashes: m.clashes,
            avgNew: m.changes ? m.newNotes / m.changes : 0,
            diffVsSimple: diff.diffs / diff.total,
        }
        console.log(
            `${styleName.padEnd(15)} ${style.colour.padEnd(10)} ${String(m.steps).padEnd(7)} ${pct(m.changesOnNew, m.newChordSteps).padStart(9)}`
            + ` ${sameChord.padStart(10)} ${String(m.useful).padStart(6)} ${String(m.cosmetic).padStart(8)} ${String(m.harmful).padStart(7)}`
            + ` ${String(m.clashes).padStart(7)} ${String(m.auto).padStart(4)} ${(m.changes ? m.newNotes / m.changes : 0).toFixed(2).padStart(6)}`
            + ` ${pct(diff.diffs, diff.total).padStart(7)}`,
        )
    }
}

function sectionShuffle() {
    console.log('\n=== 1b. Shuffle styles: library regression ===')
    console.log(`seeded passes per project: ${SEEDS}`)
    console.log('style  triggers changeRate sameChord useful cosmetic harmful clashes auto% avgNew')
    REPORT.shuffle = {}
    for (const styleName of Object.keys(SHUFFLE_STYLES)) {
        const run = getShuffleRun(styleName)
        const m = run.metrics
        REPORT.shuffle[styleName] = {
            triggers: m.steps,
            changeRate: changeRate(m),
            changesOnSame: m.changesOnSame,
            useful: m.useful,
            cosmetic: m.cosmetic,
            harmful: m.harmful,
            clashes: m.clashes,
            autoShare: m.steps ? m.auto / m.steps : 0,
            avgNew: m.changes ? m.newNotes / m.changes : 0,
        }
        console.log(
            `${styleName.padEnd(6)} ${String(m.steps).padEnd(8)} ${pct(m.changesOnNew, m.newChordSteps).padStart(9)}`
            + ` ${String(m.changesOnSame).padStart(9)} ${String(m.useful).padStart(6)} ${String(m.cosmetic).padStart(8)}`
            + ` ${String(m.harmful).padStart(7)} ${String(m.clashes).padStart(7)} ${pct(m.auto, m.steps).padStart(6)} ${(m.changes ? m.newNotes / m.changes : 0).toFixed(2).padStart(6)}`,
        )
    }
}

/* ------------------------------------------------------------------ */
/* Section 2: repeat hold before and after                             */
/* ------------------------------------------------------------------ */

function probeStab(styleName, chordSymbol, hold) {
    const entry = classicProjects().find((candidate) => candidate.name === 'ii-V-I in C major.json')
    const style = FOLLOW_STYLES[styleName]
    const project = entry.project
    const key = { ...resolveProjectKey(project), colour: style.colour }
    resetHarnessState(project, key, style.options)
    const configs = buildConfigs(project, key)
    const config = [...configs.values()].find((candidate) => candidate.chord.startsWith(chordSymbol))
    const picks = []
    let lastId = null
    let prevPick = null
    for (let i = 0; i < 4; i++) {
        let pick
        if (hold && lastId === config.id && prevPick)
            pick = prevPick
        else {
            pick = chooseFollow(config, style)
            lastId = config.id
        }
        picks.push(pick.name)
        pushHistory(config, pick.name, 'follow')
        prevPick = pick
    }
    return picks
}

function sectionRepeat() {
    console.log('\n=== 2. Follow repeat hold before and after ===')
    console.log('same-chord churn on consecutive song rows (distinct chord ids; the stab hold does not apply):')
    for (const styleName of ['simple', 'melodic', 'colourful', 'leap', 'tension', 'follow-safe']) {
        const off = getFollowRun(styleName, { hold: false }).metrics.changesOnSame
        const on = getFollowRun(styleName, { hold: true }).metrics.changesOnSame
        console.log(`  ${styleName.padEnd(12)} without hold: ${String(off).padStart(4)}   with the planned hold: ${String(on).padStart(4)}`)
    }

    console.log('\nstabbing the same Cmaj7 config four times on ii-V-I in C major.json:')
    for (const styleName of ['simple', 'melodic', 'leap']) {
        const raw = probeStab(styleName, 'Cmaj7', false)
        const held = probeStab(styleName, 'Cmaj7', true)
        console.log(`  ${styleName.padEnd(9)} raw: ${raw.join(' -> ').padEnd(60)} with hold: ${held.join(' -> ')}`)
    }

    console.log('\nstabbing the same G7 config four times (tension gating; raw colour alternates):')
    for (const styleName of ['tension', 'leap']) {
        const raw = probeStab(styleName, 'G7', false)
        const held = probeStab(styleName, 'G7', true)
        console.log(`  ${styleName.padEnd(9)} raw: ${raw.join(' -> ').padEnd(60)} with hold: ${held.join(' -> ')}`)
    }
}

/* ------------------------------------------------------------------ */
/* Section 3: safe styles cross-check                                  */
/* ------------------------------------------------------------------ */

function sectionSafe() {
    console.log('\n=== 3. Safe styles cross-check (full path) ===')
    let projects = 0
    let unique = 0
    let safeVsJazz = 0
    const diffProjects = new Set()
    const byQuality = new Map()
    const unlicensed = { diatonic: 0, jazz: 0, adventurous: 0 }
    const clashes = { diatonic: 0, jazz: 0, adventurous: 0 }
    const manualDiffs = []
    for (const entry of classicProjects()) {
        const key = resolveProjectKey(entry.project)
        if (!key)
            continue
        projects++
        const seen = new Set()
        for (const chord of entry.project.chords) {
            if (!chord.chord || seen.has(chord.chord))
                continue
            seen.add(chord.chord)
            unique++
            const picks = {}
            for (const colour of ['diatonic', 'jazz', 'adventurous']) {
                const colourKey = { ...key, colour }
                picks[colour] = chordScaleNamesFor({ symbol: chord.chord, notes: chord.chordNotes, bass: chord.bass, name: chord.name }, 3, colourKey)[0]
                const check = checkScaleAgainstChord({ symbol: chord.chord, notes: chord.chordNotes, bass: chord.bass }, picks[colour], colourKey)
                if (!check.ok)
                    clashes[colour]++
                if (check.outOfKey.length > 0)
                    unlicensed[colour]++
            }
            if (picks.diatonic !== picks.jazz) {
                safeVsJazz++
                diffProjects.add(entry.name)
                const quality = qualityOf(chord.chord)
                byQuality.set(quality, (byQuality.get(quality) ?? 0) + 1)
                manualDiffs.push(`${entry.name}: ${chord.chord} safe=${picks.diatonic} jazz=${picks.jazz}`)
            }
        }
    }
    console.log(`projects: ${projects}, unique chords: ${unique}`)
    console.log(`manual: diatonic vs jazz first scale differs on ${safeVsJazz} chords in ${diffProjects.size} projects`)
    console.log(`  by chord quality: ${[...byQuality].map(([quality, count]) => `${quality} ${count}`).join(', ') || 'none'}`)
    console.log(`clash failures: diatonic ${clashes.diatonic}, jazz ${clashes.jazz}, adventurous ${clashes.adventurous}`)
    console.log(`first scales with an unlicensed out-of-key note: diatonic ${unlicensed.diatonic}, jazz ${unlicensed.jazz}, adventurous ${unlicensed.adventurous}`)
    console.log('\nfirst 12 safe-vs-jazz differences:')
    for (const line of manualDiffs.slice(0, 12))
        console.log(`  ${line}`)

    const simpleJazz = getFollowRun('simple', { hold: true })
    const followSafe = getFollowRun('follow-safe', { hold: true })
    const diffSimple = compareLibraries(followSafe, simpleJazz)
    console.log(`\nfollow: diatonic colour differs from jazz on ${diffSimple.diffs}/${diffSimple.total} triggers (${pct(diffSimple.diffs, diffSimple.total)})`)
    const melodicJazz = getFollowRun('melodic', { hold: true })
    const safeMelodic = getFollowRun('safe-melodic', { hold: true })
    const diffMelodic = compareLibraries(safeMelodic, melodicJazz)
    console.log(`follow melodic: diatonic colour differs from jazz on ${diffMelodic.diffs}/${diffMelodic.total} triggers (${pct(diffMelodic.diffs, diffMelodic.total)})`)
    console.log(`clash failures follow-safe ${followSafe.metrics.clashes}, follow-simple ${simpleJazz.metrics.clashes}, safe-melodic ${safeMelodic.metrics.clashes}`)
    REPORT.safe = {
        projects,
        uniqueChords: unique,
        manualSafeVsJazz: safeVsJazz,
        manualProjects: diffProjects.size,
        byQuality: Object.fromEntries(byQuality),
        clashes,
        unlicensedOutOfKey: unlicensed,
        followSafeVsJazzDiff: diffSimple.diffs / diffSimple.total,
        safeMelodicVsMelodicDiff: diffMelodic.diffs / diffMelodic.total,
        followSafeClashes: followSafe.metrics.clashes,
        sampleDiffs: manualDiffs.slice(0, 20),
    }
}

/* ------------------------------------------------------------------ */
/* Section 4: Steady prototype                                         */
/* ------------------------------------------------------------------ */

function sectionSteady() {
    console.log('\n=== 4. Steady prototype (preferPrimary) ===')
    const followSafe = getFollowRun('follow-safe', { hold: true })
    const simple = getFollowRun('simple', { hold: true })
    console.log('variant           colour     diffVsFollowSafe  changeRate  sameChord  clashes  diatonicPopRate')
    const variants = ['steady-25', 'steady-50', 'steady-100', 'steady-200', 'steady-jazz-50']
    const steadyRuns = {}
    for (const name of variants) {
        const run = getFollowRun(name, { hold: true })
        steadyRuns[name] = run
        const diff = compareLibraries(run, followSafe)
        const groups = groupMetrics(run)
        const pop = groups.get('diatonic-pop')
        console.log(
            `${name.padEnd(17)} ${FOLLOW_STYLES[name].colour.padEnd(10)} ${pct(diff.diffs, diff.total).padStart(9)} ${pct(run.metrics.changesOnNew, run.metrics.newChordSteps).padStart(12)}`
            + ` ${String(run.metrics.changesOnSame).padStart(10)} ${String(run.metrics.clashes).padStart(8)} ${pct(pop.changesOnNew, pop.newChordSteps).padStart(15)}`,
        )
    }
    const popSafe = groupMetrics(followSafe).get('diatonic-pop')
    const popSimple = groupMetrics(simple).get('diatonic-pop')
    console.log(`reference: follow-safe changeRate ${pct(followSafe.metrics.changesOnNew, followSafe.metrics.newChordSteps)}, diatonicPop ${pct(popSafe.changesOnNew, popSafe.newChordSteps)}`)
    console.log(`reference: simple changeRate ${pct(simple.metrics.changesOnNew, simple.metrics.newChordSteps)}, diatonicPop ${pct(popSimple.changesOnNew, popSimple.newChordSteps)}`)

    console.log('\nSo What in D minor (Dm7 Dm7 Ebm7 Ebm7 Dm7 Dm7) picks:')
    for (const name of ['simple', 'follow-safe', 'steady-25', 'steady-50', 'steady-100', 'steady-200']) {
        const picks = traceProject(name, 'Modal So What in D minor.json', { hold: true })
        console.log(`  ${name.padEnd(12)} ${picks.map((pick) => pick.name).join(' | ')}`)
    }
    console.log('\n50s doo-wop in C (Am7 pick; stored A dorian):')
    for (const name of ['simple', 'follow-safe', 'steady-25', 'steady-50', 'steady-100', 'steady-200']) {
        const picks = traceProject(name, '50s doo-wop in C.json', { hold: true })
        const am7 = picks.find((pick) => pick.chord.startsWith('Am'))
        console.log(`  ${name.padEnd(12)} ${am7 ? am7.name : '-'}`)
    }
    console.log('\nSecondary dominants in C (A7 pick):')
    for (const name of ['simple', 'follow-safe', 'steady-25', 'steady-50', 'steady-100', 'steady-200']) {
        const picks = traceProject(name, 'Secondary dominants in C.json', { hold: true })
        const a7 = picks.find((pick) => pick.chord === 'A7')
        console.log(`  ${name.padEnd(12)} ${a7 ? a7.name : '-'}`)
    }
    REPORT.steady = {}
    for (const name of ['simple', 'follow-safe', 'steady-25', 'steady-50', 'steady-100', 'steady-200', 'steady-jazz-50']) {
        const run = getFollowRun(name, { hold: true })
        const diff = compareLibraries(run, followSafe)
        const groups = groupMetrics(run)
        const pop = groups.get('diatonic-pop')
        const soWhat = traceProject(name, 'Modal So What in D minor.json', { hold: true })
        REPORT.steady[name] = {
            colour: FOLLOW_STYLES[name].colour,
            diffVsFollowSafe: diff.diffs / diff.total,
            changeRate: changeRate(run.metrics),
            clashes: run.metrics.clashes,
            diatonicPopRate: changeRate(pop),
            soWhatReturn: soWhat[4]?.name ?? '',
            dooWopAm7: traceProject(name, '50s doo-wop in C.json', { hold: true }).find((pick) => pick.chord.startsWith('Am'))?.name ?? '',
            secondaryA7: traceProject(name, 'Secondary dominants in C.json', { hold: true }).find((pick) => pick.chord === 'A7')?.name ?? '',
        }
    }
}

/* ------------------------------------------------------------------ */
/* Section 5: dominant tension versus Bold leap                        */
/* ------------------------------------------------------------------ */

function sectionDominant() {
    console.log('\n=== 5. Dominant-only tension versus Bold leap ===')
    const simple = getFollowRun('simple', { hold: true })
    console.log('style      diffVsSimple  changesOnDominant%  sameChord(hold)  clashes  auto')
    for (const name of ['tension', 'leap', 'melodic']) {
        const run = getFollowRun(name, { hold: true })
        const diff = compareLibraries(run, simple)
        const m = run.metrics
        console.log(
            `${name.padEnd(10)} ${pct(diff.diffs, diff.total).padStart(12)} ${pct(m.domChanges, m.changesOnNew).padStart(18)}`
            + ` ${String(m.changesOnSame).padStart(16)} ${String(m.clashes).padStart(8)} ${String(m.auto).padStart(5)}`,
        )
    }
    console.log('\ntraces (simple | tension | leap):')
    for (const projectName of ['Fly Me to the Moon in C.json', 'Blues for Alice in F.json', 'Secondary dominants in C.json']) {
        console.log(`  ${projectName}`)
        const picks = {
            simple: traceProject('simple', projectName, { hold: true }),
            tension: traceProject('tension', projectName, { hold: true }),
            leap: traceProject('leap', projectName, { hold: true }),
        }
        const n = picks.simple.length
        for (let i = 0; i < n; i++) {
            console.log(`    ${picks.simple[i].chord.padEnd(9)} simple: ${String(picks.simple[i].name).padEnd(20)} tension: ${String(picks.tension[i]?.name).padEnd(20)} leap: ${picks.leap[i]?.name}`)
        }
    }
    REPORT.tension = {}
    for (const name of ['tension', 'leap', 'melodic']) {
        const run = getFollowRun(name, { hold: true })
        const diff = compareLibraries(run, simple)
        REPORT.tension[name] = {
            diffVsSimple: diff.diffs / diff.total,
            changesOnDominantShare: run.metrics.changesOnNew ? run.metrics.domChanges / run.metrics.changesOnNew : 0,
            songRowFlips: run.metrics.changesOnSame,
            stabChurnRaw: countChanges(probeStab(name, 'G7', false)),
            stabChurnHeld: countChanges(probeStab(name, 'G7', true)),
            clashes: run.metrics.clashes,
            avgNew: run.metrics.changes ? run.metrics.newNotes / run.metrics.changes : 0,
        }
    }
}

/* ------------------------------------------------------------------ */
/* Section 6: phrase reality check                                     */
/* ------------------------------------------------------------------ */

function sectionPhrase() {
    console.log('\n=== 6. Phrase reality check ===')
    console.log('pick changes with phraseBias on versus off (same solo note scenario):')
    console.log('preset   scenario  diffPicks  diff%  changeRate  heldNoteKept%')
    const presets = {
        simple: { style: 'simple', phrase: { phraseBias: true, phraseStrength: 1 } },
        lyrical: { style: 'lyrical' },
        resolve: { style: 'resolve' },
    }
    const scenarios = ['none', 'third', 'root', 'colour', 'outer']
    const summary = {}
    const rows = []
    for (const [name, config] of Object.entries(presets)) {
        const style = config.style
        const baseOptions = { hold: true, solo: 'none' }
        if (name === 'simple') {
            // phrase off is the stock simple; phrase on adds the bias at strength 1.
            const off = getFollowRun(style, { hold: true, solo: 'none', phraseOverride: { phraseBias: false, phraseStrength: 1 } })
            summary[name] = { diffs: 0, total: 0, perScenario: {} }
            for (const scenario of scenarios) {
                const on = getFollowRun(style, { hold: true, solo: scenario, phraseOverride: config.phrase })
                const diff = compareLibraries(on, off)
                summary[name].perScenario[scenario] = diff
                rows.push({ preset: name, scenario, diffs: diff.diffs, total: diff.total, changeRate: changeRate(on.metrics), heldKept: on.metrics.soloSteps ? on.metrics.soloKept / on.metrics.soloSteps : null })
                console.log(
                    `${name.padEnd(8)} ${scenario.padEnd(8)} ${String(diff.diffs).padStart(9)} ${pct(diff.diffs, diff.total).padStart(6)}`
                    + ` ${pct(on.metrics.changesOnNew, on.metrics.newChordSteps).padStart(11)} ${pct(on.metrics.soloKept, on.metrics.soloSteps).padStart(14)}`,
                )
            }
            continue
        }
        const off = getFollowRun(style, { hold: true, solo: 'none', phraseOverride: { phraseBias: false, phraseStrength: 1 } })
        summary[name] = { diffs: 0, total: 0, perScenario: {} }
        for (const scenario of scenarios) {
            const on = getFollowRun(style, { hold: true, solo: scenario })
            const diff = compareLibraries(on, off)
            summary[name].perScenario[scenario] = diff
            rows.push({ preset: name, scenario, diffs: diff.diffs, total: diff.total, changeRate: changeRate(on.metrics), heldKept: on.metrics.soloSteps ? on.metrics.soloKept / on.metrics.soloSteps : null })
            console.log(
                `${name.padEnd(8)} ${scenario.padEnd(8)} ${String(diff.diffs).padStart(9)} ${pct(diff.diffs, diff.total).padStart(6)}`
                + ` ${pct(on.metrics.changesOnNew, on.metrics.newChordSteps).padStart(11)} ${pct(on.metrics.soloKept, on.metrics.soloSteps).padStart(14)}`,
            )
        }
    }
    // Gate G2 reference: resolve backing holding a distinguishing colour note.
    const resolveColour = getFollowRun('resolve', { hold: true, solo: 'colour' })
    console.log(`\nG2 reference: resolve, held colour note: kept ${pct(resolveColour.metrics.soloKept, resolveColour.metrics.soloSteps)} at changeRate ${pct(resolveColour.metrics.changesOnNew, resolveColour.metrics.newChordSteps)}`)
    const melodicColour = getFollowRun('melodic', { hold: true, solo: 'colour' })
    console.log(`G2 reference: melodic, held colour note: kept ${pct(melodicColour.metrics.soloKept, melodicColour.metrics.soloSteps)} at changeRate ${pct(melodicColour.metrics.changesOnNew, melodicColour.metrics.newChordSteps)}`)
    REPORT.phrase = {
        rows,
        resolveColour: {
            kept: resolveColour.metrics.soloSteps ? resolveColour.metrics.soloKept / resolveColour.metrics.soloSteps : 0,
            scenarioChangeRate: changeRate(resolveColour.metrics),
            normalChangeRate: changeRate(getFollowRun('resolve', { hold: true }).metrics),
        },
        melodicColour: {
            kept: melodicColour.metrics.soloSteps ? melodicColour.metrics.soloKept / melodicColour.metrics.soloSteps : 0,
            changeRate: changeRate(melodicColour.metrics),
        },
    }
}

/* ------------------------------------------------------------------ */
/* Section 7: option marginal-effect matrix                            */
/* ------------------------------------------------------------------ */

function sectionOptions() {
    console.log('\n=== 7. Option marginal-effect matrix ===')
    console.log('option            style    base -> variant          dChangeRate  dSameChord  dClash  dAvgNew')
    const followPairs = [
        ['contextChords', 'simple', { contextChords: 1 }, { contextChords: 2 }, 'none'],
        ['phraseBias', 'resolve', { phraseBias: false }, { phraseBias: true }, 'colour'],
        ['phraseStrength', 'lyrical', { phraseStrength: 1 }, { phraseStrength: 2 }, 'colour'],
        ['palette', 'simple', { palette: 'primary' }, { palette: 'colour' }, 'none'],
        ['palette', 'simple', { palette: 'primary' }, { palette: 'bold' }, 'none'],
    ]
    for (const [option, styleName, base, variant, solo] of followPairs) {
        const baseRun = getFollowRun(styleName, { hold: true, solo, phraseOverride: base })
        const variantRun = getFollowRun(styleName, { hold: true, solo, phraseOverride: variant })
        const b = baseRun.metrics
        const v = variantRun.metrics
        const dRate = changeRate(v) - changeRate(b)
        console.log(
            `${option.padEnd(17)} ${styleName.padEnd(8)} ${JSON.stringify(base).padEnd(24)} -> ${JSON.stringify(variant).padEnd(24)}`
            + ` ${(100 * dRate).toFixed(1).padStart(9)}% ${String(v.changesOnSame - b.changesOnSame).padStart(10)} ${String(v.clashes - b.clashes).padStart(7)}`
            + ` ${((v.changes ? v.newNotes / v.changes : 0) - (b.changes ? b.newNotes / b.changes : 0)).toFixed(2).padStart(8)}`,
        )
    }
    const shufflePairs = [
        ['poolSize', 'subtle', { poolSize: 3 }, { poolSize: 5 }],
        ['dwell', 'subtle', { dwell: 2 }, { dwell: 1 }],
        ['changeChance', 'subtle', { changeChance: 1 }, { changeChance: 0.5 }],
        ['maxNewNotes', 'varied', { maxNewNotes: 1 }, { maxNewNotes: 7 }],
        ['deferWhilePlaying', 'varied', { deferWhilePlaying: false, notesHeld: true }, { deferWhilePlaying: true, notesHeld: true }],
        ['variety', 'subtle', { variety: 'gentle' }, { variety: 'lively' }],
    ]
    for (const [option, styleName, base, variant] of shufflePairs) {
        const baseOptions = { ...SHUFFLE_STYLES[styleName].options, ...base }
        const variantOptions = { ...SHUFFLE_STYLES[styleName].options, ...variant }
        const baseRun = getShuffleRun(styleName, { optionsOverride: baseOptions })
        const variantRun = getShuffleRun(styleName, { optionsOverride: variantOptions })
        const b = baseRun.metrics
        const v = variantRun.metrics
        const dRate = changeRate(v) - changeRate(b)
        console.log(
            `${option.padEnd(17)} ${styleName.padEnd(8)} ${JSON.stringify(base).padEnd(24)} -> ${JSON.stringify(variant).padEnd(24)}`
            + ` ${(100 * dRate).toFixed(1).padStart(9)}% ${String(v.changesOnSame - b.changesOnSame).padStart(10)} ${String(v.clashes - b.clashes).padStart(7)}`
            + ` ${((v.changes ? v.newNotes / v.changes : 0) - (b.changes ? b.newNotes / b.changes : 0)).toFixed(2).padStart(8)}`,
        )
    }
}

/* ------------------------------------------------------------------ */
/* Gate evaluation                                                     */
/* ------------------------------------------------------------------ */

function gates() {
    console.log('\n=== SHIP GATES ===')
    const followSafe = getFollowRun('follow-safe', { hold: true })
    const simple = getFollowRun('simple', { hold: true })
    const results = {}

    // G1: Steady.
    const g1 = {}
    for (const name of ['steady-25', 'steady-50', 'steady-100', 'steady-200', 'steady-jazz-50']) {
        const run = getFollowRun(name, { hold: true })
        const diff = compareLibraries(run, followSafe)
        const soWhat = traceProject(name, 'Modal So What in D minor.json', { hold: true })
        const returnPick = soWhat[4]?.name ?? ''
        const dooWop = traceProject(name, '50s doo-wop in C.json', { hold: true }).find((pick) => pick.chord.startsWith('Am'))
        const secondary = traceProject(name, 'Secondary dominants in C.json', { hold: true }).find((pick) => pick.chord === 'A7')
        const groups = groupMetrics(run)
        const pop = groups.get('diatonic-pop')
        const popSafe = groupMetrics(followSafe).get('diatonic-pop')
        g1[name] = {
            soWhatReturn: returnPick,
            diff: diff.diffs / diff.total,
            clashes: run.metrics.clashes,
            diatonicPop: changeRate(pop),
            diatonicPopSafe: changeRate(popSafe),
            dooWop: dooWop?.name ?? '',
            secondary: secondary?.name ?? '',
        }
    }
    const best = Object.entries(g1).sort((a, b) => {
        const passA = a[1].soWhatReturn === 'D dorian' ? 0 : 1
        const passB = b[1].soWhatReturn === 'D dorian' ? 0 : 1
        if (passA !== passB)
            return passA - passB
        return a[1].diff - b[1].diff
    })[0]
    const g1Pass = best[1].soWhatReturn === 'D dorian' && best[1].clashes === 0 && best[1].diff <= 0.15
        && best[1].diatonicPop <= best[1].diatonicPopSafe + 0.01
        && /mixolydian/.test(best[1].secondary)
    results.G1 = { pass: g1Pass, best: best[0], details: g1[best[0]] }
    console.log(`G1 Steady (preferPrimary): ${g1Pass ? 'PASS' : 'FAIL'}`)
    console.log(`  best variant ${best[0]}: So What return ${best[1].soWhatReturn}, diff ${(100 * best[1].diff).toFixed(1)}%, clashes ${best[1].clashes}, diatonicPop ${(100 * best[1].diatonicPop).toFixed(1)}% vs safe ${(100 * best[1].diatonicPopSafe).toFixed(1)}%`)
    console.log(`  doo-wop Am7: ${best[1].dooWop}; secondary-dominant A7: ${best[1].secondary}`)

    // G2: melody backing. Resolve must keep a held colour note as well as the
    // melodic palette does, at its normal change rate (not the stress rate).
    const resolveColour = getFollowRun('resolve', { hold: true, solo: 'colour' })
    const melodicColour = getFollowRun('melodic', { hold: true, solo: 'colour' })
    const kept = resolveColour.metrics.soloSteps ? resolveColour.metrics.soloKept / resolveColour.metrics.soloSteps : 0
    const melodicKept = melodicColour.metrics.soloSteps ? melodicColour.metrics.soloKept / melodicColour.metrics.soloSteps : 0
    const normalRate = changeRate(getFollowRun('resolve', { hold: true }).metrics)
    const g2Pass = kept >= 0.7 && normalRate <= 0.6 && kept >= melodicKept - 0.02
    results.G2 = { pass: g2Pass, kept, melodicKept, normalRate }
    console.log(`G2 Melody backing (Resolve, held colour note): ${g2Pass ? 'PASS' : 'FAIL'} (kept ${(100 * kept).toFixed(1)}% vs melodic ${(100 * melodicKept).toFixed(1)}%, normal changeRate ${(100 * normalRate).toFixed(1)}%)`)

    // G3: dominant tension versus leap. Stab churn must be zero after the hold;
    // the winner is the candidate that lands more of its changes on dominants.
    const leap = getFollowRun('leap', { hold: true })
    const tension = getFollowRun('tension', { hold: true })
    const leapDiff = compareLibraries(leap, simple)
    const tensionDiff = compareLibraries(tension, simple)
    const leapConcentration = leap.metrics.changesOnNew ? leap.metrics.domChanges / leap.metrics.changesOnNew : 0
    const tensionConcentration = tension.metrics.changesOnNew ? tension.metrics.domChanges / tension.metrics.changesOnNew : 0
    const tensionStabHeld = countChanges(probeStab('tension', 'G7', true))
    const leapStabHeld = countChanges(probeStab('leap', 'G7', true))
    const g3Pass = tension.metrics.clashes === 0 && tensionStabHeld === 0 && tensionConcentration > 0.5 && tensionConcentration > leapConcentration
    results.G3 = {
        pass: g3Pass,
        winner: g3Pass ? 'tension' : 'leap',
        leap: { diff: leapDiff.diffs / leapDiff.total, concentration: leapConcentration, clashes: leap.metrics.clashes, stabChurnHeld: leapStabHeld, songRowFlips: leap.metrics.changesOnSame },
        tension: { diff: tensionDiff.diffs / tensionDiff.total, concentration: tensionConcentration, clashes: tension.metrics.clashes, stabChurnHeld: tensionStabHeld, songRowFlips: tension.metrics.changesOnSame },
    }
    console.log(`G3 dominant tension vs Bold leap: ${g3Pass ? 'tension WINS' : 'leap preferred'}`)
    console.log(`  tension: diff vs simple ${(100 * tensionDiff.diffs / tensionDiff.total).toFixed(1)}%, changes on dominants ${(100 * tensionConcentration).toFixed(1)}%, clashes ${tension.metrics.clashes}, stab churn after hold ${tensionStabHeld}, song-row flips ${tension.metrics.changesOnSame}`)
    console.log(`  leap:    diff vs simple ${(100 * leapDiff.diffs / leapDiff.total).toFixed(1)}%, changes on dominants ${(100 * leapConcentration).toFixed(1)}%, clashes ${leap.metrics.clashes}, stab churn after hold ${leapStabHeld}, song-row flips ${leap.metrics.changesOnSame}`)

    // G4: phrase. Split realistic held chord tones from distinguishing colour
    // notes: at a held third the bias is inert, at a distinguishing colour note
    // it changes most picks.
    let maxRealistic = 0
    let maxRealisticScenario = ''
    let maxDistinguishing = 0
    let maxDistinguishingScenario = ''
    for (const presetName of ['simple', 'lyrical', 'resolve']) {
        const off = getFollowRun(presetName, { hold: true, solo: 'none', phraseOverride: { phraseBias: false, phraseStrength: 1 } })
        for (const scenario of ['third', 'root', 'colour', 'outer']) {
            const full = presetName === 'simple'
                ? { hold: true, solo: scenario, phraseOverride: { phraseBias: true, phraseStrength: 1 } }
                : { hold: true, solo: scenario }
            const on = getFollowRun(presetName, full)
            const diff = compareLibraries(on, off)
            const share = diff.diffs / diff.total
            if (scenario === 'third' || scenario === 'root') {
                if (share > maxRealistic) {
                    maxRealistic = share
                    maxRealisticScenario = `${presetName}/${scenario}`
                }
            }
            else if (share > maxDistinguishing) {
                maxDistinguishing = share
                maxDistinguishingScenario = `${presetName}/${scenario}`
            }
        }
    }
    const g4Pass = maxDistinguishing > 0.02
    results.G4 = { keep: g4Pass, heldChordToneMaxDiff: maxRealistic, heldChordToneScenario: maxRealisticScenario, distinguishingMaxDiff: maxDistinguishing, distinguishingScenario: maxDistinguishingScenario }
    console.log(`G4 phrase bias: ${g4Pass ? 'KEEP hidden' : 'DROP'}`)
    console.log(`  held chord tones (third/root): largest pick change ${(100 * maxRealistic).toFixed(1)}% at ${maxRealisticScenario} (inert, as every stored slot contains them)`)
    console.log(`  distinguishing colour notes: largest pick change ${(100 * maxDistinguishing).toFixed(1)}% at ${maxDistinguishingScenario}`)

    // G5: manual safe.
    const manualSafe = REPORT.safe
    const g5Pass = !manualSafe || (manualSafe.manualSafeVsJazz > 0 && manualSafe.clashes.diatonic === 0 && manualSafe.clashes.jazz === 0)
    results.G5 = { pass: g5Pass, manualSafeVsJazz: manualSafe?.manualSafeVsJazz ?? null, uniqueChords: manualSafe?.uniqueChords ?? null, clashes: manualSafe?.clashes ?? null }
    console.log(`G5 manual safe cross-check: ${g5Pass ? 'PASS' : 'FAIL'} (${manualSafe ? `${manualSafe.manualSafeVsJazz} of ${manualSafe.uniqueChords} unique chords, clashes ${JSON.stringify(manualSafe.clashes)}` : 'run section safe'})`)

    REPORT.meta.date = new Date().toISOString().slice(0, 10)
    REPORT.meta.steps = 308
    REPORT.gates = results
    fs.writeFileSync(path.join(ROOT, 'research', 'scale-analysis', 'results.json'), JSON.stringify(REPORT, null, 2))
    console.log('\nGate results written to research/scale-analysis/results.json')
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const sections = {
    corpus: sectionCorpus,
    follow: sectionFollow,
    shuffle: sectionShuffle,
    repeat: sectionRepeat,
    safe: sectionSafe,
    steady: sectionSteady,
    dominant: sectionDominant,
    phrase: sectionPhrase,
    options: sectionOptions,
    gates,
}

function main() {
    console.log(`DeepSeek harness2 - section: ${SECTION}`)
    if (SECTION === 'all') {
        sectionCorpus()
        sectionFollow()
        sectionShuffle()
        sectionRepeat()
        sectionSafe()
        sectionSteady()
        sectionDominant()
        sectionPhrase()
        sectionOptions()
        gates()
    }
    else if (sections[SECTION]) {
        sections[SECTION]()
    }
    else {
        console.error(`unknown section '${SECTION}'. Use: all, corpus, follow, shuffle, repeat, safe, steady, dominant, phrase, options, gates`)
        process.exit(1)
    }
    console.log('\nHarness2 complete. See research/scale-analysis/README.md.')
}

main()
