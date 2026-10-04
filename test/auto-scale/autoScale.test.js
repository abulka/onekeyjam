import assert from 'assert'
import {
    SCALE_POLICIES,
    HISTORY_LIMIT,
    pitchClassSet,
    commonToneCount,
    samePitchClasses,
    closestScaleIndex,
    chordShapeFor,
    progressionBonus,
    continuityScore,
    chooseFollowCandidate,
    chooseShuffleCandidate,
    chooseScaleForChord,
    resetChordHistory,
    recordChordHistory,
    noteScaleChange,
} from '../../src/lib/autoScale.js'
import { scaleNameToNotes } from '../../src/lib/scaleToNotes.js'
import { globals } from '../../src/lib/globals.js'

/*
 * The follow and shuffle policies. Follow scores the stored scale1/2/3 against
 * the previous sounding scale and the progression function; shuffle draws from
 * the top ranked candidates with continuity, novelty and no immediate repeats.
 * See doco/MUSIC-THEORY.md.
 */

/** @param {string} chord @param {Array<string>} chordNotes @param {Array<string>} scales */
function configFor(chord, chordNotes, scales) {
    const config = { id: 1, name: chord, chord, chordNotes, scale1: scales[0], scale2: scales[1], scale3: scales[2] }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

function historyEntryFor(config, scaleName) {
    return {
        triggerNote: 'D3',
        chordId: config.id,
        chordName: config.chord,
        shape: chordShapeFor(config),
        scalePcs: pitchClassSet(scaleNameToNotes(scaleName)),
        scaleName,
    }
}

describe('autoScale policies', () => {

    it('exposes the three policies', () => {
        assert.deepEqual(SCALE_POLICIES, ['manual', 'follow', 'shuffle'])
    })

    describe('pitch classes and shapes', () => {
        it('turns note names into pitch classes', () => {
            assert.deepEqual([...pitchClassSet(['C', 'E', 'G', 'Bb'])].sort((a, b) => a - b), [0, 4, 7, 10])
            assert.equal(commonToneCount(pitchClassSet(['C', 'E', 'G']), pitchClassSet(['C', 'F', 'G'])), 2)
        })

        it('reads the root, dominant quality and guide tones', () => {
            const shape = chordShapeFor(configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6']))
            assert.equal(shape.rootChroma, 7)
            assert.equal(shape.isDominant, true)
            assert.equal(shape.majorThird, true)
            assert.deepEqual([...shape.guidePcs].sort((a, b) => a - b), [5, 11])
        })

        it('marks half-diminished and minor qualities', () => {
            const halfDim = chordShapeFor(configFor('Dm7b5', ['D3', 'F3', 'Ab3', 'C4'], ['D locrian #2', 'D locrian', 'D minor blues']))
            assert.equal(halfDim.isHalfDim, true)
            assert.equal(halfDim.isDominant, false)
            const minor = chordShapeFor(configFor('Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D minor pentatonic', 'D aeolian']))
            assert.equal(minor.isMinorish, true)
            assert.equal(minor.guidePcs.has(5), true)
        })
    })

    describe('pitch-class comparison', () => {
        it('matches enharmonic spellings', () => {
            assert.equal(samePitchClasses(['C#', 'D', 'E'], ['Db', 'D', 'E']), true)
            assert.equal(samePitchClasses(['C', 'E', 'G'], []), false)
        })

        it('matches a parent scale name to its chord-rooted mode', () => {
            const altered = pitchClassSet(scaleNameToNotes('G altered'))
            const melodicMinor = pitchClassSet(scaleNameToNotes('Ab melodic minor'))
            assert.equal([...altered].sort((a, b) => a - b).join(','), [...melodicMinor].sort((a, b) => a - b).join(','))
            assert.equal(samePitchClasses(scaleNameToNotes('G altered'), scaleNameToNotes('Ab melodic minor')), true)
        })

        it('does not match different sets or empty lists', () => {
            assert.equal(samePitchClasses(['C', 'E', 'G'], ['C', 'F', 'G']), false)
            assert.equal(samePitchClasses([], []), false)
        })

        it('finds the closest stored scale by shared pitch classes', () => {
            const auto = scaleNameToNotes('G half-whole diminished')
            const lists = [
                scaleNameToNotes('G mixolydian'),
                scaleNameToNotes('G lydian dominant'),
                scaleNameToNotes('G mixolydian b6'),
            ]
            const near = closestScaleIndex(lists, auto)
            assert.ok(near)
            assert.ok(near.common > 0)
            assert.equal(near.common, Math.max(...lists.map((list) => commonToneCount(pitchClassSet(list), pitchClassSet(auto)))))
        })

        it('prefers the earlier list on a tie', () => {
            const auto = ['C', 'E', 'G']
            const near = closestScaleIndex([['C', 'E', 'G'], ['C', 'E', 'G']], auto)
            assert.equal(near.index, 0)
        })

        it('skips empty lists and returns null without a live scale', () => {
            assert.equal(closestScaleIndex([[], []], ['C', 'E', 'G']), null)
            assert.equal(closestScaleIndex([['C', 'E', 'G']], []), null)
        })
    })

    describe('progression function', () => {
        const dMinor7 = () => chordShapeFor(configFor('Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D minor pentatonic', 'D aeolian']))
        const dHalfDim = () => chordShapeFor(configFor('Dm7b5', ['D3', 'F3', 'Ab3', 'C4'], ['D locrian #2', 'D locrian', 'D minor blues']))
        const gDominant = () => chordShapeFor(configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6']))

        it('prefers mixolydian after a major ii chord', () => {
            assert.equal(progressionBonus('G mixolydian', gDominant(), dMinor7()).bonus, 3)
        })

        it('prefers the altered family after a minor iiø chord', () => {
            assert.equal(progressionBonus('G phrygian dominant', gDominant(), dHalfDim()).bonus, 3)
            assert.equal(progressionBonus('G altered', gDominant(), dHalfDim()).bonus, 3)
            assert.equal(progressionBonus('G mixolydian', gDominant(), dHalfDim()).bonus, -2)
        })

        it('does nothing without a previous chord', () => {
            assert.deepEqual(progressionBonus('G mixolydian', gDominant(), undefined), { bonus: 0, reason: '' })
        })
    })

    describe('continuity scoring', () => {
        it('weights a shared guide tone above a shared colour tone', () => {
            const context = {
                current: chordShapeFor(configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])),
                previous: undefined,
                previousScalePcs: pitchClassSet(['B', 'E']),
                previousScaleName: 'previous scale',
            }
            const sharedGuide = continuityScore({ name: 'C major', pcs: pitchClassSet(['B']) }, context)
            const sharedColour = continuityScore({ name: 'C major', pcs: pitchClassSet(['E']) }, context)
            assert.ok(sharedGuide.score > sharedColour.score, `${sharedGuide.score} should beat ${sharedColour.score}`)
        })
    })

    describe('follow chooser', () => {
        const gCandidates = [
            { slot: 'scale1', name: 'G mixolydian', pcs: pitchClassSet(scaleNameToNotes('G mixolydian')) },
            { slot: 'scale2', name: 'G lydian dominant', pcs: pitchClassSet(scaleNameToNotes('G lydian dominant')) },
            { slot: 'scale3', name: 'G mixolydian b6', pcs: pitchClassSet(scaleNameToNotes('G mixolydian b6')) },
        ]

        it('keeps the diatonic dominant after D dorian', () => {
            const dm7 = configFor('Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D minor pentatonic', 'D aeolian'])
            const context = {
                current: chordShapeFor(configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])),
                previous: chordShapeFor(dm7),
                previousScalePcs: pitchClassSet(scaleNameToNotes('D dorian')),
                previousScaleName: 'D dorian',
            }
            const result = chooseFollowCandidate(gCandidates, context)
            assert.equal(result.index, 0)
            assert.match(result.reason, /ii-V/)
        })

        it('picks the altered dominant after A locrian #2', () => {
            const am7b5 = configFor('Am7b5', ['A3', 'C4', 'Eb4', 'G4'], ['A locrian #2', 'A locrian', 'A minor blues'])
            const dCandidates = [
                { slot: 'scale1', name: 'D phrygian dominant', pcs: pitchClassSet(scaleNameToNotes('D phrygian dominant')) },
                { slot: 'scale2', name: 'D lydian dominant', pcs: pitchClassSet(scaleNameToNotes('D lydian dominant')) },
                { slot: 'scale3', name: 'D mixolydian', pcs: pitchClassSet(scaleNameToNotes('D mixolydian')) },
            ]
            const context = {
                current: chordShapeFor(configFor('D7', ['D3', 'F#3', 'A3', 'C4'], ['D phrygian dominant', 'D lydian dominant', 'D mixolydian'])),
                previous: chordShapeFor(am7b5),
                previousScalePcs: pitchClassSet(scaleNameToNotes('A locrian #2')),
                previousScaleName: 'A locrian #2',
            }
            const result = chooseFollowCandidate(dCandidates, context)
            assert.equal(result.index, 0)
            assert.match(result.reason, /minor ii-V/)
        })

        it('continues with lydian dominant into a tritone substitute', () => {
            const g7 = configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])
            const dbCandidates = [
                { slot: 'scale1', name: 'Db lydian dominant', pcs: pitchClassSet(scaleNameToNotes('Db lydian dominant')) },
                { slot: 'scale2', name: 'Db mixolydian', pcs: pitchClassSet(scaleNameToNotes('Db mixolydian')) },
                { slot: 'scale3', name: 'Db mixolydian b6', pcs: pitchClassSet(scaleNameToNotes('Db mixolydian b6')) },
            ]
            const context = {
                current: chordShapeFor(configFor('Db7', ['Db3', 'F3', 'Ab3', 'Cb4'], ['Db lydian dominant', 'Db mixolydian', 'Db mixolydian b6'])),
                previous: chordShapeFor(g7),
                previousScalePcs: pitchClassSet(scaleNameToNotes('G mixolydian')),
                previousScaleName: 'G mixolydian',
            }
            const result = chooseFollowCandidate(dbCandidates, context)
            assert.equal(result.index, 0)
        })

        it('falls back to scale1 when there is no history', () => {
            const context = {
                current: chordShapeFor(configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])),
                previous: undefined,
                previousScalePcs: new Set(),
                previousScaleName: '',
            }
            assert.equal(chooseFollowCandidate(gCandidates, context).index, 0)
        })
    })

    describe('shuffle chooser', () => {
        const candidates = [
            { name: 'G mixolydian', pcs: pitchClassSet(scaleNameToNotes('G mixolydian')) },
            { name: 'G lydian dominant', pcs: pitchClassSet(scaleNameToNotes('G lydian dominant')) },
            { name: 'G mixolydian b6', pcs: pitchClassSet(scaleNameToNotes('G mixolydian b6')) },
        ]

        it('is deterministic for a given random function', () => {
            const context = { previousScalePcs: new Set(), recentScaleSets: [] }
            const first = chooseShuffleCandidate(candidates, context, () => 0.42)
            const second = chooseShuffleCandidate(candidates, context, () => 0.42)
            assert.equal(first.index, second.index)
        })

        it('never repeats the previous pitch set when an alternative exists', () => {
            const context = {
                previousScalePcs: pitchClassSet(scaleNameToNotes('G mixolydian')),
                recentScaleSets: [],
            }
            const result = chooseShuffleCandidate(candidates, context, () => 0)
            assert.notEqual(result.index, 0)
            assert.equal(result.index, 1)
        })

        it('allows the same pitch set when it is the only option', () => {
            const context = {
                previousScalePcs: pitchClassSet(scaleNameToNotes('G mixolydian')),
                recentScaleSets: [],
            }
            const result = chooseShuffleCandidate([candidates[0]], context, () => 0)
            assert.equal(result.index, 0)
        })

        it('can reach the last candidate with a high random value', () => {
            const context = { previousScalePcs: new Set(), recentScaleSets: [] }
            const result = chooseShuffleCandidate(candidates, context, () => 0.999999)
            assert.equal(result.index, 2)
        })
    })

    describe('chooseScaleForChord', () => {
        it('declines in manual mode', () => {
            const config = configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])
            assert.equal(chooseScaleForChord(config, 'manual'), null)
        })

        it('follows the stored slots after a history entry', () => {
            const dm7 = configFor('Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D minor pentatonic', 'D aeolian'])
            globals.chordHistory = [historyEntryFor(dm7, 'D dorian')]
            const g7 = configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])
            const decision = chooseScaleForChord(g7, 'follow')
            assert.equal(decision.type, 'slot')
            assert.equal(decision.slot, 'scale1')
            resetChordHistory()
        })

        it('returns a live scale for shuffle', () => {
            globals.chordHistory = []
            const g7 = configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])
            const decision = chooseScaleForChord(g7, 'shuffle')
            assert.equal(decision.type, 'auto')
            assert.equal(typeof decision.tonic, 'string')
            assert.equal(typeof decision.scaleType, 'string')
            assert.ok(decision.notes.length > 0)
            assert.ok(decision.scaleTypes.length > 0)
            assert.match(decision.reason, /shuffle/)
        })
    })

    describe('chord history', () => {
        const config = () => configFor('G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])

        beforeEach(() => {
            resetChordHistory()
            globals.chordTriggerMap = { G3: config() }
            globals.currentChordTriggerNote = 'G3'
            globals.currentScaleFilter = 'scale1'
            globals.scaleFiltering.frozen = false
            globals.scaleFiltering.autoScaleName = ''
            globals.scaleFiltering.autoScaleNotes = []
        })

        afterEach(() => {
            resetChordHistory()
            globals.chordTriggerMap = {}
            globals.currentChordTriggerNote = undefined
            globals.currentScaleFilter = 'scale1'
        })

        it('records a chord trigger with its sounding scale', () => {
            recordChordHistory()
            assert.equal(globals.chordHistory.length, 1)
            assert.equal(globals.chordHistory[0].triggerNote, 'G3')
            assert.equal(globals.chordHistory[0].scaleName, 'G mixolydian')
            assert.equal(globals.chordHistory[0].scalePcs.size, 7)
        })

        it('collapses consecutive identical entries', () => {
            recordChordHistory()
            recordChordHistory()
            assert.equal(globals.chordHistory.length, 1)
        })

        it('caps the history length', () => {
            for (let i = 0; i < HISTORY_LIMIT + 4; i++) {
                globals.currentChordTriggerNote = 'G3'
                globals.currentScaleFilter = ['scale1', 'scale2', 'scale3'][i % 3]
                recordChordHistory()
            }
            assert.equal(globals.chordHistory.length, HISTORY_LIMIT)
        })

        it('updates the last entry when the scale changes by hand', () => {
            recordChordHistory()
            globals.currentScaleFilter = 'scale2'
            noteScaleChange()
            assert.equal(globals.chordHistory[0].scaleName, 'G lydian dominant')
        })

        it('ignores a scale change for a different chord trigger', () => {
            recordChordHistory()
            globals.currentChordTriggerNote = 'A3'
            globals.currentScaleFilter = 'scale2'
            noteScaleChange()
            assert.equal(globals.chordHistory[0].scaleName, 'G mixolydian')
        })

        it('resets on demand', () => {
            recordChordHistory()
            resetChordHistory()
            assert.equal(globals.chordHistory.length, 0)
        })
    })
})
