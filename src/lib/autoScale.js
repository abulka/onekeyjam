// @ts-check
import * as Tonal from '@tonaljs/tonal'
import { globals } from './globals.js'
import { resolveChord, rankScales } from './chordScaleEngine.js'
import { scaleNameToNotes } from './scaleToNotes.js'

/**
 * @module lib/autoScale
 * @desc History-aware and shuffled scale policies for the right hand.
 *
 * 'follow' scores the chord's stored scale1/2/3 against the previous sounding
 * scale and the chord function, and picks the best continuation. 'shuffle'
 * computes a live scale from the top ranked candidates, weighted by rank,
 * common tones and novelty. The chosen scale may then be a live scale that is
 * not one of the stored slots; in that case it sounds through
 * setAutoScaleFilter() and is displayed as "(auto)".
 *
 * See doco/MUSIC-THEORY.md for the theory.
 */

/** @typedef {import("./typedefs").ChordConfig} ChordConfig */

export const SCALE_POLICIES = ['manual', 'follow', 'shuffle']
export const HISTORY_LIMIT = 8

const mod12 = (n) => ((n % 12) + 12) % 12

/**
 * @typedef {object} ChordShape
 * @property {number} rootChroma
 * @property {string} root
 * @property {Array<number>} intervals
 * @property {boolean} majorThird
 * @property {boolean} minorThird
 * @property {boolean} isDominant
 * @property {boolean} isHalfDim
 * @property {boolean} isMinorish
 * @property {boolean} isMajorQuality
 * @property {Set<number>} guidePcs
 */

/**
 * @typedef {object} ChordHistoryEntry
 * @property {string} triggerNote
 * @property {number} chordId
 * @property {string} chordName
 * @property {ChordShape} shape
 * @property {Set<number>} scalePcs
 * @property {string} scaleName
 */

/**
 * @typedef {object} ScaleDecision
 * @property {'slot'|'auto'} type
 * @property {string} name
 * @property {string} reason
 * @property {'scale1'|'scale2'|'scale3'} [slot]
 * @property {string} [tonic]
 * @property {string} [scaleType]
 * @property {Array<string>} [notes]
 * @property {Array<string>} [scaleTypes]
 */

/** @param {string} note */
function chromaOf(note) {
    const chroma = Tonal.Note.chroma(note)
    return Number.isNaN(chroma) ? undefined : chroma
}

/**
 * @param {Array<string>} notes
 * @returns {Set<number>}
 */
export function pitchClassSet(notes) {
    /** @type {Set<number>} */
    const result = new Set()
    for (const note of notes ?? []) {
        const chroma = chromaOf(note)
        if (chroma !== undefined)
            result.add(chroma)
    }
    return result
}

/** @param {Set<number>} a @param {Set<number>} b */
function setsEqual(a, b) {
    if (!a || !b || a.size !== b.size)
        return false
    for (const value of a)
        if (!b.has(value))
            return false
    return true
}

/** @param {Set<number>} a @param {Set<number>} b */
export function commonToneCount(a, b) {
    if (!a || !b)
        return 0
    let count = 0
    for (const value of a)
        if (b.has(value))
            count++
    return count
}

/**
 * Whether two note lists describe the same pitch classes, independent of
 * spelling or of which mode/parent name is used. Empty lists never match.
 * @param {Array<string>} notesA
 * @param {Array<string>} notesB
 */
export function samePitchClasses(notesA, notesB) {
    const a = pitchClassSet(notesA)
    const b = pitchClassSet(notesB)
    if (a.size === 0 || b.size === 0)
        return false
    return setsEqual(a, b)
}

/**
 * The stored scale that shares the most pitch classes with a live scale.
 * Ties go to the earlier list. Used by the grid to mark the closest stored
 * alternative when the sounding shuffle scale is not itself a stored slot.
 * @param {Array<Array<string>>} scaleNoteLists
 * @param {Array<string>} autoNotes
 * @returns {{index: number, common: number}|null}
 */
export function closestScaleIndex(scaleNoteLists, autoNotes) {
    const auto = pitchClassSet(autoNotes)
    if (auto.size === 0)
        return null
    let best = /** @type {{index: number, common: number}|null} */ (null)
    for (let i = 0; i < (scaleNoteLists ?? []).length; i++) {
        const pcs = pitchClassSet(scaleNoteLists[i])
        if (pcs.size === 0)
            continue
        const common = commonToneCount(pcs, auto)
        if (!best || common > best.common)
            best = { index: i, common }
    }
    return best
}

/**
 * The resolved root, intervals and guide tones of a chord config.
 * @param {ChordConfig} config
 * @returns {ChordShape|undefined}
 */
export function chordShapeFor(config) {
    if (!config)
        return undefined
    const resolved = resolveChord({
        symbol: config.chord,
        notes: config.chordNotes,
        bass: config.bass ?? config.bassNote,
        name: config.name,
    })
    if (!resolved)
        return undefined
    const has = (interval) => resolved.intervals.includes(interval)
    const majorThird = has(4)
    const minorThird = has(3) && !majorThird
    const isDominant = majorThird && has(10)
    const isHalfDim = minorThird && has(6) && has(10)
    const guidePcs = new Set()
    if (majorThird)
        guidePcs.add(mod12(resolved.rootChroma + 4))
    else if (minorThird)
        guidePcs.add(mod12(resolved.rootChroma + 3))
    if (has(11))
        guidePcs.add(mod12(resolved.rootChroma + 11))
    else if (has(10))
        guidePcs.add(mod12(resolved.rootChroma + 10))
    return {
        rootChroma: resolved.rootChroma,
        root: resolved.root,
        intervals: resolved.intervals,
        majorThird,
        minorThird,
        isDominant,
        isHalfDim,
        isMinorish: minorThird && !isHalfDim,
        isMajorQuality: majorThird && !isDominant,
        guidePcs,
    }
}

const MINOR_II_V_TYPES = new Set(['altered', 'phrygian dominant', 'half-whole diminished', 'mixolydian b6'])

/**
 * Candidate-specific preference for the chord that follows the previous one.
 * This distinguishes the three stored alternatives when the engine's static
 * ranking leaves them close, for example the major ii-V versus the minor ii-V.
 * @param {string} name candidate scale name
 * @param {ChordShape|undefined} current
 * @param {ChordShape|undefined} previous
 * @returns {{bonus: number, reason: string}}
 */
export function progressionBonus(name, current, previous) {
    if (!current || !previous)
        return { bonus: 0, reason: '' }
    const type = Tonal.Scale.get(name).type
    const motion = mod12(current.rootChroma - previous.rootChroma)
    if (motion === 5 && current.isDominant) {
        if (previous.isHalfDim) {
            if (MINOR_II_V_TYPES.has(type))
                return { bonus: 3, reason: `minor ii-V into ${current.root}: altered dominant` }
            if (type === 'mixolydian')
                return { bonus: -2, reason: '' }
        }
        else if (previous.isMinorish) {
            if (type === 'mixolydian')
                return { bonus: 3, reason: `ii-V into ${current.root}: diatonic dominant` }
            if (type === 'lydian dominant')
                return { bonus: 1, reason: '' }
        }
    }
    return { bonus: 0, reason: '' }
}

/**
 * How well a candidate scale continues the previous sounding scale.
 * @param {{name: string, pcs: Set<number>}} candidate
 * @param {*} context from buildContext()
 */
export function continuityScore(candidate, context) {
    const previousPcs = context.previousScalePcs ?? new Set()
    const currentGuide = context.current?.guidePcs ?? new Set()
    const previousGuide = context.previous?.guidePcs ?? new Set()
    let score = 0
    for (const pc of candidate.pcs) {
        if (!previousPcs.has(pc))
            continue
        let weight = 1
        if (currentGuide.has(pc))
            weight += 1
        if (previousGuide.has(pc))
            weight += 0.5
        score += weight
    }
    const { bonus, reason } = progressionBonus(candidate.name, context.current, context.previous)
    score += bonus
    const common = commonToneCount(candidate.pcs, previousPcs)
    if (previousPcs.size > 0 && !setsEqual(candidate.pcs, previousPcs))
        score += 0.5
    const fallbackReason = common > 0 && context.previousScaleName
        ? `follows ${context.previousScaleName} (${common} common tones)`
        : ''
    return { score, common, reason: reason || fallbackReason }
}

/**
 * Pick the stored slot whose scale continues the previous scale best.
 * Ties fall back to the earlier slot.
 * @param {Array<{slot: string, name: string, pcs: Set<number>}>} candidates
 * @param {*} context from buildContext()
 */
export function chooseFollowCandidate(candidates, context) {
    let bestIndex = 0
    let best = /** @type {{score: number, common: number, reason: string}|undefined} */ (undefined)
    for (let i = 0; i < candidates.length; i++) {
        const scored = continuityScore(candidates[i], context)
        if (!best || scored.score > best.score) {
            best = scored
            bestIndex = i
        }
    }
    return { index: bestIndex, score: best?.score ?? 0, common: best?.common ?? 0, reason: best?.reason ?? '' }
}

/**
 * Pick a live scale for variety. Candidates are ranked best first; rank,
 * common tones with the previous scale and novelty all shape the weights.
 * A candidate with the same pitch set as the previous scale is skipped when
 * another candidate exists, so the harmony keeps moving.
 * @param {Array<{name: string, pcs: Set<number>}>} candidates ranked best first
 * @param {*} context from buildContext()
 * @param {() => number} rng injectable for tests
 */
export function chooseShuffleCandidate(candidates, context, rng = Math.random) {
    const previousPcs = context.previousScalePcs ?? new Set()
    const recent = context.recentScaleSets ?? []
    let pool = candidates.map((candidate, index) => ({ candidate, index }))
    if (pool.length > 1) {
        const withoutPrevious = pool.filter(({ candidate }) => !setsEqual(candidate.pcs, previousPcs))
        if (withoutPrevious.length > 0)
            pool = withoutPrevious
    }

    const weights = []
    let total = 0
    for (let i = 0; i < pool.length; i++) {
        const { candidate } = pool[i]
        const common = commonToneCount(candidate.pcs, previousPcs)
        const seen = recent.some((set) => setsEqual(candidate.pcs, set))
        let weight = 1 + 1 / (i + 1)
        weight *= 1 + 0.1 * common
        weight *= seen ? 0.35 : 1.15
        weights.push(weight)
        total += weight
    }

    let target = rng() * total
    let chosen = pool[pool.length - 1]
    for (let i = 0; i < pool.length; i++) {
        target -= weights[i]
        if (target <= 0) {
            chosen = pool[i]
            break
        }
    }

    const common = commonToneCount(chosen.candidate.pcs, previousPcs)
    const seen = recent.some((set) => setsEqual(chosen.candidate.pcs, set))
    const reason = seen
        ? `shuffle: colour pick (rank ${chosen.index + 1} of ${candidates.length})`
        : `shuffle: rank ${chosen.index + 1} of ${candidates.length}, ${common} common tones`
    return { index: chosen.index, rank: chosen.index + 1, common, reason }
}

/** @param {ChordConfig} config */
function chordInfo(config) {
    return {
        symbol: config.chord,
        notes: config.chordNotes,
        bass: config.bass ?? config.bassNote,
        name: config.name,
    }
}

/** @param {ChordShape} current */
function buildContext(current) {
    const history = globals.chordHistory
    const last = history[history.length - 1]
    return {
        current,
        previous: last ? last.shape : undefined,
        previousScalePcs: last ? last.scalePcs : new Set(),
        previousScaleName: last ? last.scaleName : '',
        recentScaleSets: history.slice(-3).map((entry) => entry.scalePcs),
    }
}

/**
 * Decide the scale for a chord trigger under the active policy.
 * @param {ChordConfig} chordConfig
 * @param {string} [policy]
 * @returns {ScaleDecision|null} null when the normal manual behaviour applies
 */
export function chooseScaleForChord(chordConfig, policy = globals.scaleFiltering.policy) {
    if (!chordConfig || policy === 'manual')
        return null
    const current = chordShapeFor(chordConfig)
    if (!current)
        return null

    if (policy === 'follow') {
        /** @type {Array<{slot: 'scale1'|'scale2'|'scale3', name: string, pcs: Set<number>}>} */
        const candidates = []
        const slots = /** @type {Array<'scale1'|'scale2'|'scale3'>} */ (['scale1', 'scale2', 'scale3'])
        for (const slot of slots) {
            const name = chordConfig[slot]
            const derived = chordConfig[`${slot}Notes`]
            const notes = derived && derived.length > 0 ? derived : scaleNameToNotes(name)
            if (!name || !notes || notes.length === 0)
                continue
            candidates.push({ slot, name, pcs: pitchClassSet(notes) })
        }
        if (candidates.length === 0)
            return null
        const context = buildContext(current)
        const { index, reason } = chooseFollowCandidate(candidates, context)
        const chosen = candidates[index]
        return { type: 'slot', slot: chosen.slot, name: chosen.name, reason: reason || 'continues the previous scale' }
    }

    if (policy === 'shuffle') {
        const ranked = rankScales(chordInfo(chordConfig), 6, globals.getProjectKey() ?? undefined)
        if (ranked.length === 0)
            return null
        const candidates = ranked.map((suggestion) => ({
            name: suggestion.name,
            notes: suggestion.notes,
            pcs: pitchClassSet(suggestion.notes),
        }))
        const context = buildContext(current)
        const { index, reason } = chooseShuffleCandidate(candidates, context)
        const chosen = candidates[index]
        const scaleObj = Tonal.Scale.get(chosen.name)
        if (scaleObj.empty)
            return null
        return {
            type: 'auto',
            name: chosen.name,
            tonic: scaleObj.tonic,
            scaleType: scaleObj.type,
            notes: chosen.notes,
            scaleTypes: ranked.map((suggestion) => suggestion.type),
            reason,
        }
    }

    return null
}

/**
 * The name of the scale that is currently sounding, without UI suffixes.
 */
function soundingScaleName() {
    if (globals.scaleOverrideName)
        return globals.scaleOverrideName
    if (globals.scaleFiltering.autoScaleName)
        return globals.scaleFiltering.autoScaleName
    if (globals.soloMode === 'key' && globals.scaleFiltering.keyModeActive) {
        const key = globals.getProjectKey()
        return key ? `${key.tonic} ${key.type}` : ''
    }
    if (globals.currentScaleFilter === 'notesOfChord')
        return 'notes of chord'
    return globals.currentChordConfig()[globals.currentScaleFilter] ?? ''
}

export function resetChordHistory() {
    globals.chordHistory = []
}

/**
 * Append the current chord and sounding scale to the history. Consecutive
 * identical entries replace one another so re-triggers do not fill the buffer.
 */
export function recordChordHistory() {
    const config = globals.currentChordConfig()
    const shape = chordShapeFor(config)
    if (!shape || !globals.currentChordTriggerNote)
        return
    /** @type {ChordHistoryEntry} */
    const entry = {
        triggerNote: globals.currentChordTriggerNote,
        chordId: config.id,
        chordName: config.chord,
        shape,
        scalePcs: pitchClassSet(globals.currentScaleNotes),
        scaleName: soundingScaleName(),
    }
    const history = globals.chordHistory
    const last = history[history.length - 1]
    if (last && last.triggerNote === entry.triggerNote && last.chordId === entry.chordId && last.scaleName === entry.scaleName) {
        history[history.length - 1] = entry
        return
    }
    history.push(entry)
    while (history.length > HISTORY_LIMIT)
        history.shift()
}

/**
 * Keep the last history entry in step when the sounding scale changes without
 * a chord trigger, for example when the player picks a scale by hand.
 */
export function noteScaleChange() {
    const history = globals.chordHistory
    const last = history[history.length - 1]
    if (!last || last.triggerNote !== globals.currentChordTriggerNote)
        return
    last.scaleName = soundingScaleName()
    last.scalePcs = pitchClassSet(globals.currentScaleNotes)
}
