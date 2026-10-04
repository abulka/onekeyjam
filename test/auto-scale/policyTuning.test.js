import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { scaleNameToNotes } from '@/lib/scaleToNotes.js'
import { applyScalePolicy, rerollShuffleScale } from '@/lib/change-scale.js'
import { samePitchClasses, resetChordHistory } from '@/lib/autoScale.js'

/*
 * Shuffle tuning: the drawn rank is held for the dwell (by rank, so each new
 * chord still gets a fitting scale), a change chance decides whether a dwell
 * boundary redraws, and Reroll forces a fresh draw. See doco/SCALE-POLICIES.md.
 */

function configFor(id, chord, chordNotes, scales) {
    const config = { id, name: chord, chord, chordNotes, bassNote: '', bass: '', symbols: chord, scale1: scales[0], scale2: scales[1], scale3: scales[2], scaleNotesOfChord: chordNotes }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

describe('shuffle policy tuning', () => {

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
        }
        globals.currentChordTriggerNote = 'C3'
        globals.currentScaleFilter = 'scale1'
        globals.projectKey = null
        globals.project = { options: {}, songs: { default: { ids: [1], favourites: [], blacklist: [] } } }
        globals.scaleFiltering.policy = 'shuffle'
        globals.scaleFiltering.policyOptions.poolSize = 6
        globals.scaleFiltering.policyOptions.dwell = 2
        globals.scaleFiltering.policyOptions.changeChance = 1
        globals.scaleFiltering.frozen = false
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
        globals.scaleFiltering.autoReason = ''
        globals.scaleFiltering.manualScaleNote = ''
        resetChordHistory()
    })

    afterEach(() => {
        resetChordHistory()
        globals.scaleFiltering.policy = 'manual'
        globals.scaleFiltering.policyOptions.poolSize = 6
        globals.scaleFiltering.policyOptions.dwell = 1
        globals.scaleFiltering.policyOptions.changeChance = 1
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        globals.currentScaleFilter = 'scale1'
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
    })

    it('draws a rank and holds it for the dwell', () => {
        applyScalePolicy({ rng: () => 0 })
        assert.equal(globals.scaleFiltering.shuffleRank, 0)
        assert.equal(globals.scaleFiltering.shuffleDwellRemaining, 1)
        const heldName = globals.scaleFiltering.autoScaleName

        applyScalePolicy({ rng: () => 0.999 })
        assert.equal(globals.scaleFiltering.shuffleRank, 0, 'the dwell should hold rank 0')
        assert.match(globals.scaleFiltering.autoReason, /holding rank 1/)
        assert.equal(globals.scaleFiltering.autoScaleName, heldName)
        assert.equal(globals.scaleFiltering.shuffleDwellRemaining, 0)

        applyScalePolicy({ rng: () => 0.999 })
        assert.notEqual(globals.scaleFiltering.shuffleRank, 0, 'the boundary should redraw')
    })

    it('keeps the rank when the change chance is zero', () => {
        globals.scaleFiltering.policyOptions.dwell = 1
        globals.scaleFiltering.policyOptions.changeChance = 0

        applyScalePolicy({ rng: () => 0 })
        assert.equal(globals.scaleFiltering.shuffleRank, 0)

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

    it('with a pool of three the draw is always a stored scale', () => {
        globals.scaleFiltering.policyOptions.poolSize = 3
        applyScalePolicy({ rng: () => 0.999 })
        const autoNotes = globals.scaleFiltering.autoScaleNotes
        const stored = ['C major', 'C lydian', 'C harmonic major'].map(scaleNameToNotes)
        assert.ok(stored.some((notes) => samePitchClasses(autoNotes, notes)), autoNotes.join(','))
    })
})
