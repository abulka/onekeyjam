import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { scaleNameToNotes } from '@/lib/scaleToNotes.js'
import { applyScalePolicy, rerollShuffleScale } from '@/lib/change-scale.js'
import { samePitchClasses, resetChordHistory, recordChordHistory } from '@/lib/autoScale.js'

/*
 * Shuffle anchors a change to the harmony: a repeated trigger of the same
 * chord holds the scale, a chord change may redraw within a close band, and a
 * change made while solo notes are held takes the closest fit. See
 * doco/SCALE-POLICIES.md.
 */

function configFor(id, chord, chordNotes, scales) {
    const config = { id, name: chord, chord, chordNotes, bassNote: '', bass: '', symbols: chord, scale1: scales[0], scale2: scales[1], scale3: scales[2], scaleNotesOfChord: chordNotes }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

function goTo(note) {
    globals.currentChordTriggerNote = note
}

describe('shuffle policy options', () => {

    beforeEach(() => {
        document.broadcastEvent = () => { }
        globals.keyboard = { name: 'test', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        globals.scaleFilteringEnabled = true
        globals.GM = false
        globals.channel = undefined
        globals.channel2 = undefined
        globals.channel3 = undefined
        globals.pendingChordNoteOffs = {}
        globals.pendingChordBassNoteOffs = {}
        globals.pendingNoteOffs = {}
        globals.chordTriggerMap = {
            C3: configFor(1, 'Cmaj7', ['C3', 'E3', 'G3', 'B3'], ['C major', 'C lydian', 'C harmonic major']),
            D3: configFor(2, 'Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D aeolian', 'D minor pentatonic']),
        }
        globals.currentChordTriggerNote = 'C3'
        globals.currentScaleFilter = 'scale1'
        globals.projectKey = null
        globals.project = { options: {}, songs: { default: { ids: [1, 2], favourites: [], blacklist: [] } } }
        globals.scaleFiltering.policy = 'shuffle'
        globals.scaleFiltering.policyOptions.poolSize = 5
        globals.scaleFiltering.policyOptions.dwell = 1
        globals.scaleFiltering.policyOptions.changeChance = 1
        globals.scaleFiltering.policyOptions.maxNewNotes = 1
        globals.scaleFiltering.policyOptions.deferWhilePlaying = true
        globals.scaleFiltering.frozen = false
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
        globals.scaleFiltering.autoReason = ''
        globals.scaleFiltering.manualScaleNote = ''
        globals.scaleFiltering.manualScaleFilter = ''
        resetChordHistory()
    })

    afterEach(() => {
        resetChordHistory()
        globals.scaleFiltering.policy = 'manual'
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        globals.currentScaleFilter = 'scale1'
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = ''
    })

    it('holds the scale when the same chord is triggered again', () => {
        applyScalePolicy({ rng: () => 0 })
        assert.equal(globals.scaleFiltering.shuffleRank, 0)
        const heldFilter = globals.currentScaleFilter

        applyScalePolicy({ rng: () => 0.999 })
        assert.equal(globals.scaleFiltering.shuffleRank, 0, 'a repeat must not redraw')
        assert.match(globals.scaleFiltering.autoReason, /holding rank 1/)
        assert.equal(globals.currentScaleFilter, heldFilter)
    })

    it('draws again after the chord changes', () => {
        applyScalePolicy({ rng: () => 0 })
        assert.equal(globals.scaleFiltering.shuffleChordId, 1)

        goTo('D3')
        applyScalePolicy({ rng: () => 0.999 })
        assert.equal(globals.scaleFiltering.shuffleChordId, 2)
        assert.match(globals.scaleFiltering.autoReason, /shuffle:/)
        assert.doesNotMatch(globals.scaleFiltering.autoReason, /holding/)
    })

    it('keeps the rank across a chord change when the change chance is zero', () => {
        globals.scaleFiltering.policyOptions.changeChance = 0
        applyScalePolicy({ rng: () => 0 })
        assert.equal(globals.scaleFiltering.shuffleRank, 0)

        goTo('D3')
        applyScalePolicy({ rng: () => 0.999 })
        assert.equal(globals.scaleFiltering.shuffleRank, 0, 'with 0% change the rank is kept')
        assert.match(globals.scaleFiltering.autoReason, /holding rank 1/)
    })

    it('reroll ignores the dwell and draws fresh', () => {
        globals.scaleFiltering.policyOptions.dwell = 4
        applyScalePolicy({ rng: () => 0 })
        assert.equal(globals.scaleFiltering.shuffleDwellRemaining, 3)

        applyScalePolicy({ rng: () => 0.999 })
        assert.match(globals.scaleFiltering.autoReason, /holding/)

        rerollShuffleScale()
        assert.doesNotMatch(globals.scaleFiltering.autoReason, /holding/)
        assert.equal(globals.scaleFiltering.shuffleDwellRemaining, 3)
    })

    it('takes the closest fit when the chord changes while solo notes are held', () => {
        applyScalePolicy({ rng: () => 0 })
        recordChordHistory()  // as playChord does after a real trigger
        globals.pendingNoteOffs = { 'E4': { allowedNote: 'F4' } }
        goTo('D3')
        applyScalePolicy({ rng: () => 0.999 })
        assert.match(globals.scaleFiltering.autoReason, /closest fit/)
        globals.pendingNoteOffs = {}
    })

    it('with a pool of three the draw is always a stored scale', () => {
        globals.scaleFiltering.policyOptions.poolSize = 3
        applyScalePolicy({ rng: () => 0.999 })
        assert.equal(globals.currentScaleFilter, 'scale3')
        assert.ok(samePitchClasses(globals.currentScaleNotes, scaleNameToNotes('C harmonic major')), globals.currentScaleNotes.join(','))
        globals.scaleFiltering.policyOptions.poolSize = 5
    })

    it('never offers a G scale for a transposed G7inversion2 that sounds Ab7', () => {
        // The custom name keeps its old G root unless transposition moves it.
        // Even with a stale name, the sounding Ab7 notes must drive the choice.
        globals.projectKey = { tonic: 'C', type: 'major', source: 'user' }
        globals.transpositionSemitones = 1
        globals.chordTriggerMap = {
            G3: configFor(2, 'G7inversion2*', ['Eb3', 'Gb3', 'Ab3', 'C4'], ['Ab mixolydian', 'Ab lydian dominant', 'Ab mixolydian b6']),
        }
        globals.currentChordTriggerNote = 'G3'
        globals.scaleFiltering.policyOptions.poolSize = 6
        globals.scaleFiltering.policyOptions.maxNewNotes = 7
        globals.scaleFiltering.policyOptions.deferWhilePlaying = false
        resetChordHistory()
        applyScalePolicy({ rng: () => 0.999 })
        const name = globals.scaleFiltering.autoScaleName
        assert.match(name, /^Ab /, name)
        assert.doesNotMatch(name, /G harmonic minor|G major augmented|G double harmonic/)
        globals.transpositionSemitones = 0
    })
})
