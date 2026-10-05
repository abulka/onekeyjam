import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { scaleNameToNotes } from '@/lib/scaleToNotes.js'
import { applyScalePolicy } from '@/lib/change-scale.js'
import { resetChordHistory } from '@/lib/autoScale.js'

function configFor(id, chord, chordNotes, scales) {
    const config = { id, name: chord, chord, chordNotes, bassNote: '', bass: '', symbols: chord, scale1: scales[0], scale2: scales[1], scale3: scales[2], scaleNotesOfChord: chordNotes }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

describe('applyScalePolicy while Solo in key is active', () => {

    beforeEach(() => {
        document.broadcastEvent = () => { }
        globals.keyboard = { name: 'test', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        globals.chordTriggerMap = {
            C3: configFor(1, 'Cmaj7', ['C3', 'E3', 'G3', 'B3'], ['C major', 'C lydian', 'C harmonic major']),
            D3: configFor(2, 'Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D aeolian', 'D minor pentatonic']),
        }
        globals.currentChordTriggerNote = 'C3'
        globals.currentScaleFilter = 'scale1'
        globals.scaleFiltering.policy = 'shuffle'
        globals.scaleFiltering.policyOptions.poolSize = 5
        globals.scaleFiltering.policyOptions.deferWhilePlaying = false
        globals.scaleFiltering.frozen = false
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
        globals.scaleFiltering.autoReason = ''
        globals.scaleFiltering.manualScaleNote = ''
        globals.scaleFiltering.manualScaleFilter = ''
        globals.project = { options: {}, songs: { default: { ids: [1, 2], favourites: [], blacklist: [] } } }
        resetChordHistory()
    })

    afterEach(() => {
        globals.project.options.soloMode = 'chord'
        resetChordHistory()
        globals.scaleFiltering.policy = 'manual'
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        globals.currentScaleFilter = 'scale1'
    })

    it('declines and leaves the scale alone while Solo in key is on', () => {
        globals.project.options.soloMode = 'key'

        const applied = applyScalePolicy({ rng: () => 0 })

        assert.equal(applied, false, 'the policy must decline while the key scale sounds')
        assert.equal(globals.currentScaleFilter, 'scale1', 'the sounding filter must not change')
        assert.equal(globals.scaleFiltering.autoScaleNotes.length, 0, 'no live auto scale may be set')
        assert.equal(globals.scaleFiltering.autoScaleName, '')
    })

    it('still applies when Solo in key is off', () => {
        globals.project.options.soloMode = 'chord'

        const applied = applyScalePolicy({ rng: () => 0 })

        assert.equal(applied, true, 'the policy still acts in chord mode')
    })
})
