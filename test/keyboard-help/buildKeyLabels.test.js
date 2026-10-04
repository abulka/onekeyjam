import assert from 'assert'
import { buildKeyLabels } from '@/lib/keyboard-help.js'

const baseOptions = {
    min: 0,
    max: 4,
    lhTriggerOctave: 3,
    rhJamSoundOctave: 4,
    whiteNoteMappings: {},
    keyboardHelpMode: 'all',
}

function byNote(labels, note) {
    return labels.find(label => label.note === note)
}

describe('buildKeyLabels', () => {

    it('produces both black and white labels in all mode', () => {
        const labels = buildKeyLabels(baseOptions)
        assert.equal(labels.length, 5)
        assert.equal(byNote(labels, 'C3').isBlack, false)
        assert.equal(byNote(labels, 'C#3').isBlack, true)
        assert.equal(byNote(labels, 'D3').isBlack, false)
    })

    it('black labels carry help and shift help', () => {
        const labels = buildKeyLabels(baseOptions)
        assert.equal(byNote(labels, 'C#3').help, 'SHIFT')
        assert.equal(byNote(labels, 'D#3').help, 'Scale filter OFF')
        assert.equal(byNote(labels, 'D#3').shiftHelp, 'All notes off')
    })

    it('gives the left hand A# a SHIFT meaning for Solo in key', () => {
        const labels = buildKeyLabels({ ...baseOptions, max: 11 })
        assert.equal(byNote(labels, 'A#3').help, 'Transp chord UP')
        assert.equal(byNote(labels, 'A#3').shiftHelp, 'Solo in key')
    })

    it('white labels carry the mapping for their note', () => {
        const labels = buildKeyLabels({ ...baseOptions, whiteNoteMappings: { C3: 'Cmaj7' } })
        assert.equal(byNote(labels, 'C3').mapping, 'Cmaj7')
        assert.equal(byNote(labels, 'D3').mapping, '')
    })

    it('marks chord trigger white keys distinctly from scale notes', () => {
        const labels = buildKeyLabels({ ...baseOptions, chordTriggerNotes: ['C3'], whiteNoteMappings: { C3: 'Cmaj7' } })
        assert.equal(byNote(labels, 'C3').kind, 'chord')
        assert.equal(byNote(labels, 'D3').kind, 'scale')
    })

    it('marks left hand black keys and the SHIFT key', () => {
        const labels = buildKeyLabels(baseOptions)
        assert.equal(byNote(labels, 'C#3').isLeftHand, true)
        assert.equal(byNote(labels, 'C#3').isShiftKey, true)
        assert.equal(byNote(labels, 'D#3').isShiftKey, false)
    })

    it('black mode omits white labels', () => {
        const labels = buildKeyLabels({ ...baseOptions, keyboardHelpMode: 'black' })
        assert(labels.every(label => label.isBlack))
    })

    it('white mode omits black labels', () => {
        const labels = buildKeyLabels({ ...baseOptions, keyboardHelpMode: 'white' })
        assert(labels.every(label => !label.isBlack))
    })

    it('off mode returns no labels', () => {
        assert.deepEqual(buildKeyLabels({ ...baseOptions, keyboardHelpMode: 'off' }), [])
    })

    it('uses the configured left hand octave', () => {
        const labels = buildKeyLabels({ ...baseOptions, lhTriggerOctave: 2 })
        assert.equal(byNote(labels, 'C#2').help, 'SHIFT')
    })

    it('shows the scale labels on right-hand black keys', () => {
        const labels = buildKeyLabels({ ...baseOptions, max: 22 })
        assert.equal(byNote(labels, 'C#4').help, 'Scale 1')
        assert.equal(byNote(labels, 'D#4').help, 'Scale 2')
        assert.equal(byNote(labels, 'F#4').help, 'Scale 3')
        assert.equal(byNote(labels, 'G#4').help, 'Scale 4 (chord notes)')
        assert.equal(byNote(labels, 'A#4').help, 'Lock current scale')
    })

    it('hides right-hand black help when scale filtering is off', () => {
        const labels = buildKeyLabels({ ...baseOptions, max: 22, scaleFilteringEnabled: false })
        assert.equal(byNote(labels, 'C#4').help, '')
        assert.equal(byNote(labels, 'A#4').help, '')
        // left hand modifiers are unaffected
        assert.equal(byNote(labels, 'C#3').help, 'SHIFT')
    })
})
