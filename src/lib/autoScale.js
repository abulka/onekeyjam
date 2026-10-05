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

/**
 * Named policy presets for the follow and shuffle policies. Each preset lists
 * the option values it sets; the UI matches the current options to a preset
 * and shows "Custom" when they do not match. Applying a preset merges its
 * options into globals.scaleFiltering.policyOptions. See doco/SCALE-POLICIES.md.
 */
export const POLICY_PRESETS = {
    shuffle: [
        // Intentions, in order of boldness: Subtle stays on the three stored
        // scales with close, infrequent shifts; Varied takes one close colour
        // from a larger pool on each chord change; Wild lifts the spread band
        // and the hold rule.
        { name: 'subtle', label: 'Subtle', options: { poolSize: 3, dwell: 2, changeChance: 1, maxNewNotes: 1, deferWhilePlaying: true, phraseBias: false, phraseStrength: 1 } },
        { name: 'varied', label: 'Varied', options: { poolSize: 5, dwell: 1, changeChance: 1, maxNewNotes: 1, deferWhilePlaying: true, phraseBias: false, phraseStrength: 1 } },
        { name: 'wild', label: 'Wild', options: { poolSize: 6, dwell: 1, changeChance: 1, maxNewNotes: 7, deferWhilePlaying: false, phraseBias: false, phraseStrength: 1 } },
    ],
    follow: [
        { name: 'simple', label: 'Simple', options: { contextChords: 1, phraseBias: false, phraseStrength: 1 } },
        { name: 'progression', label: 'Progression', options: { contextChords: 2, phraseBias: false, phraseStrength: 1 } },
        { name: 'lyrical', label: 'Lyrical', options: { contextChords: 2, phraseBias: true, phraseStrength: 1 } },
        { name: 'resolve', label: 'Resolve', options: { contextChords: 1, phraseBias: true, phraseStrength: 2 } },
    ],
}

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
 * @property {string} [policy] which policy or a manual pick chose the scale
 */

/**
 * @typedef {object} ScaleDecision
 * @property {'slot'|'auto'} type
 * @property {string} name
 * @property {string} reason
 * @property {'scale1'|'scale2'|'scale3'} [slot]
 * @property {string} [tonic]
 * @property {string} [scaleType]
 * @property {number} [rank] 0-based shuffle rank that was drawn or held
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
 * @param {ChordShape|undefined} [previous2] the chord before previous
 * @param {number} [contextChords] 1 or 2, how many previous chords to use
 * @returns {{bonus: number, reason: string}}
 */
export function progressionBonus(name, current, previous, previous2, contextChords = 1) {
    if (!current || !previous)
        return { bonus: 0, reason: '' }
    const type = Tonal.Scale.get(name).type
    const motion = mod12(current.rootChroma - previous.rootChroma)

    // Dominant approaching a dominant: the existing ii-V rule.
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

    // Two-chord context: a full ii-V resolving into a major tonic.
    if (contextChords >= 2 && previous2 && current.isMajorQuality && previous.isDominant) {
        const iiMotion = mod12(previous.rootChroma - previous2.rootChroma)
        if (iiMotion === 5 && (previous2.isMinorish || previous2.isHalfDim) && type === 'major')
            return { bonus: 4, reason: `ii-V-I into ${current.root}: major` }
    }

    // A dominant resolving down a fifth, a semitone (tritone substitute) or a
    // whole tone (backdoor) into its target. Prefer the target's home scale.
    if (previous.isDominant && (current.isMajorQuality || (current.minorThird && !current.isDominant))) {
        if (current.isMajorQuality) {
            if (type === 'major') {
                const reason = motion === 11
                    ? `tritone-sub resolution into ${current.root}: major`
                    : motion === 2
                        ? `backdoor resolution into ${current.root}: major`
                        : `dominant resolution into ${current.root}: major`
                return { bonus: 3, reason }
            }
            if (type === 'lydian')
                return { bonus: 1, reason: '' }
        }
        else {
            if (type === 'dorian')
                return { bonus: 2, reason: `dominant resolution into ${current.root}: dorian` }
            if (type === 'aeolian')
                return { bonus: 1, reason: '' }
        }
    }

    return { bonus: 0, reason: '' }
}

/**
 * How well a candidate resolves the phrase. When enabled, a scale that keeps
 * or lands on the last sounding solo note is preferred, especially when that
 * note is a chord tone or guide tone of the new chord; a scale that leaves the
 * note unresolved, or where the note is a hard semitone clash, is penalised.
 * @param {{pcs: Set<number>}} candidate
 * @param {*} context from buildContext()
 * @returns {number}
 */
export function phraseBonus(candidate, context) {
    if (!context.phraseBias || context.lastSoloPc === undefined)
        return 0
    const shape = context.current
    if (!shape)
        return 0
    const pc = context.lastSoloPc
    const inChord = shape.intervals.some((interval) => mod12(shape.rootChroma + interval) === pc)
    const inGuide = shape.guidePcs.has(pc)
    // The b9 against the root is a hard clash on a major or minor chord; on a
    // dominant it is an available tension, so it is not penalised.
    const semitoneAboveRoot = mod12(shape.rootChroma + 1) === pc
    const hardClash = semitoneAboveRoot && !shape.isDominant && !inChord
    let bonus = 0
    if (candidate.pcs.has(pc))
        bonus += inGuide ? 2 : inChord ? 1.5 : 1
    else
        bonus -= inGuide ? 1.5 : inChord ? 1 : 0.5
    if (hardClash)
        bonus -= 2
    return bonus * (context.phraseStrength ?? 1)
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
    const { bonus, reason } = progressionBonus(candidate.name, context.current, context.previous, context.previous2, context.contextChords ?? 1)
    score += bonus
    score += phraseBonus(candidate, context)
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
 * Pick a live scale for variety. Candidates are ranked best first; the draw is
 * limited to candidates whose pitch set is within `maxNewNotes` of the previous
 * scale, so a change is a close colour shift rather than a jump. Rank, common
 * tones and novelty shape the weights inside that band.
 * @param {Array<{name: string, pcs: Set<number>}>} candidates ranked best first
 * @param {*} context from buildContext()
 * @param {() => number} rng injectable for tests
 */
export function chooseShuffleCandidate(candidates, context, rng = Math.random) {
    const previousPcs = context.previousScalePcs ?? new Set()
    const recent = context.recentScaleSets ?? []
    const maxNewNotes = Number.isFinite(context.maxNewNotes) ? context.maxNewNotes : 1
    // How many notes a change substitutes, roughly the symmetric difference / 2.
    const changedCount = (pcs) => Math.round((pcs.size + previousPcs.size - 2 * commonToneCount(pcs, previousPcs)) / 2)

    let pool = candidates.map((candidate, index) => ({ candidate, index }))
    if (previousPcs.size > 0) {
        const close = pool.filter(({ candidate }) => changedCount(candidate.pcs) <= maxNewNotes)
        if (close.length > 0)
            pool = close
        else {
            // nothing is inside the band: fall back to the closest candidate(s)
            let best = Infinity
            for (const entry of pool)
                best = Math.min(best, changedCount(entry.candidate.pcs))
            pool = pool.filter(({ candidate }) => changedCount(candidate.pcs) === best)
        }
    }

    const weights = []
    let total = 0
    for (let i = 0; i < pool.length; i++) {
        const { candidate } = pool[i]
        const common = commonToneCount(candidate.pcs, previousPcs)
        const seen = recent.some((set) => setsEqual(candidate.pcs, set))
        let weight = 1 + 1 / (i + 1)
        weight *= 1 + 0.1 * common
        weight *= Math.max(0.2, 1 + 0.15 * phraseBonus(candidate, context))
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

    const changed = changedCount(chosen.candidate.pcs)
    const changeLabel = changed === 0 ? 'same notes' : changed === 1 ? '1 note change' : `${changed} note change`
    return { index: chosen.index, rank: chosen.index + 1, common: commonToneCount(chosen.candidate.pcs, previousPcs), changed, reason: `shuffle: ${changeLabel}` }
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

/** Shuffle candidates are recomputed lazily and cached by chord, key and pool. */
const shuffleCandidateCache = new Map()

export function clearScaleRankingCache() {
    shuffleCandidateCache.clear()
}

/** @param {number|undefined} value @returns {number} */
function clampPoolSize(value) {
    const n = Math.round(Number(value))
    if (!Number.isFinite(n))
        return 6
    return Math.min(8, Math.max(3, n))
}

/**
 * The normalised ranked candidates for a chord, cached because re-ranking the
 * scale dictionary on every trigger is wasteful.
 * @param {ChordConfig} config
 * @param {number} poolSize
 * @param {{tonic?:string, type?:string, colour?:string}|undefined} key
 */
function rankedCandidatesFor(config, poolSize, key) {
    const keyName = key ? `${key.tonic} ${key.type} ${key.colour ?? ''}` : ''
    const cacheKey = [poolSize, keyName, config.chord, (config.chordNotes ?? []).join(',')].join('|')
    const cached = shuffleCandidateCache.get(cacheKey)
    if (cached)
        return cached
    const ranked = rankScales(chordInfo(config), poolSize, key)
    const candidates = ranked.map((suggestion) => ({
        name: suggestion.name,
        type: suggestion.type,
        notes: suggestion.notes,
        pcs: pitchClassSet(suggestion.notes),
    }))
    shuffleCandidateCache.set(cacheKey, candidates)
    return candidates
}

/** @param {ChordShape} current */
function buildContext(current) {
    const history = globals.chordHistory
    const last = history[history.length - 1]
    const secondLast = history.length >= 2 ? history[history.length - 2] : undefined
    const lastSolo = globals.recentSoloNotes[globals.recentSoloNotes.length - 1]
    return {
        current,
        previous: last ? last.shape : undefined,
        previous2: secondLast ? secondLast.shape : undefined,
        previousScalePcs: last ? last.scalePcs : new Set(),
        previousScaleName: last ? last.scaleName : '',
        previous2ScalePcs: secondLast ? secondLast.scalePcs : new Set(),
        recentScaleSets: history.slice(-3).map((entry) => entry.scalePcs),
        contextChords: globals.scaleFiltering.policyOptions?.contextChords ?? 1,
        maxNewNotes: globals.scaleFiltering.policyOptions?.maxNewNotes ?? 1,
        lastSoloPc: lastSolo ? lastSolo.pc : undefined,
        lastSoloName: lastSolo ? lastSolo.name : '',
        phraseBias: globals.scaleFiltering.policyOptions?.phraseBias ?? false,
        phraseStrength: globals.scaleFiltering.policyOptions?.phraseStrength ?? 1,
    }
}

/**
 * Decide the scale for a chord trigger under the active policy.
 * @param {ChordConfig} chordConfig
 * @param {string} [policy]
 * @param {{rng?: () => number, heldRank?: number|null, closest?: boolean}} [options]
 * heldRank holds a previously drawn shuffle rank, closest asks for the nearest
 * fit to the previous scale, and rng is injectable for tests.
 * @returns {ScaleDecision|null} null when the normal manual behaviour applies
 */
export function chooseScaleForChord(chordConfig, policy = globals.scaleFiltering.policy, options = {}) {
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
        const poolSize = clampPoolSize(globals.scaleFiltering.policyOptions?.poolSize)
        const key = globals.getProjectKey() ?? undefined
        const candidates = rankedCandidatesFor(chordConfig, poolSize, key)
        if (candidates.length === 0)
            return null
        const context = buildContext(current)
        const heldRank = Number.isInteger(options.heldRank) && options.heldRank >= 0 && options.heldRank < candidates.length
            ? options.heldRank
            : null
        let index
        let reason
        if (options.closest && (context.previousScalePcs?.size ?? 0) > 0) {
            // A chord change while solo notes are held: take the closest fit so
            // the mapping barely moves under the player's fingers.
            let bestCommon = -1
            index = 0
            for (let i = 0; i < candidates.length; i++) {
                const common = commonToneCount(candidates[i].pcs, context.previousScalePcs)
                if (common > bestCommon) {
                    bestCommon = common
                    index = i
                }
            }
            reason = `shuffle: closest fit (${bestCommon} common tones)`
        }
        else if (heldRank != null) {
            index = heldRank
            const common = commonToneCount(candidates[index].pcs, context.previousScalePcs)
            reason = `shuffle: holding rank ${index + 1} of ${candidates.length}, ${common} common tones`
        }
        else {
            const picked = chooseShuffleCandidate(candidates, context, options.rng ?? Math.random)
            index = picked.index
            reason = picked.reason
        }
        const chosen = candidates[index]
        const scaleObj = Tonal.Scale.get(chosen.name)
        if (scaleObj.empty)
            return null
        return {
            type: 'auto',
            name: chosen.name,
            tonic: scaleObj.tonic,
            scaleType: scaleObj.type,
            notes: chosen.notes.slice(),
            scaleTypes: candidates.map((candidate) => candidate.type),
            rank: index,
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
    globals.recentSoloNotes = []
    globals.scaleFiltering.shuffleRank = null
    globals.scaleFiltering.shuffleDwellRemaining = 0
    globals.scaleFiltering.shuffleChordId = null
    globals.scaleFiltering.shuffleDeferred = false
    clearScaleRankingCache()
}

/** Recent solo notes kept for the phrase-aware bias. */
const SOLO_HISTORY_LIMIT = 4

/**
 * Record a sounding right-hand solo note for the phrase-aware bias.
 * @param {string} noteName a note name, with or without an octave
 */
export function recordSoloNote(noteName) {
    const chroma = chromaOf(noteName)
    if (chroma === undefined)
        return
    globals.recentSoloNotes.push({ pc: chroma, name: noteName })
    while (globals.recentSoloNotes.length > SOLO_HISTORY_LIMIT)
        globals.recentSoloNotes.shift()
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
        policy: globals.scaleFiltering.manualScaleNote ? 'manual' : globals.scaleFiltering.policy,
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
