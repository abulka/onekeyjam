import assert from 'assert'
import { getBlackKeyHelp } from '@/lib/keyboard-help.js'

describe('getBlackKeyHelp', () => {

    it('left hand octave black keys show meta meanings', () => {
        const options = { lhTriggerOctave: 3 }
        assert.equal(getBlackKeyHelp('C#', 3, options), 'SHIFT')
        assert.equal(getBlackKeyHelp('D#', 3, options), 'Scale filter OFF')
        assert.equal(getBlackKeyHelp('F#', 3, options), 'Scale filter ON')
        assert.equal(getBlackKeyHelp('G#', 3, options), 'Transp chord DOWN')
        assert.equal(getBlackKeyHelp('A#', 3, options), 'Transp chord UP')
    })

    it('left hand shift variants', () => {
        const options = { shift: true, lhTriggerOctave: 3 }
        assert.equal(getBlackKeyHelp('C#', 3, options), '')
        assert.equal(getBlackKeyHelp('D#', 3, options), 'All notes off')
        assert.equal(getBlackKeyHelp('F#', 3, options), 'Add chord')
        assert.equal(getBlackKeyHelp('G#', 3, options), 'Reset transp.')
        assert.equal(getBlackKeyHelp('A#', 3, options), '')  // SHIFT + A# has no action
    })

    it('right hand octaves show the scale switch shortcut numbers', () => {
        const options = { lhTriggerOctave: 3 }
        assert.equal(getBlackKeyHelp('C#', 4, options), '1')
        assert.equal(getBlackKeyHelp('D#', 4, options), '2')
        assert.equal(getBlackKeyHelp('F#', 5, options), '3')
        assert.equal(getBlackKeyHelp('G#', 6, options), '4')
        assert.equal(getBlackKeyHelp('A#', 7, options), '5')
    })

    it('right hand shift variants are empty', () => {
        assert.equal(getBlackKeyHelp('D#', 4, { shift: true, lhTriggerOctave: 3 }), '')
    })

    it('respects a custom left hand octave', () => {
        assert.equal(getBlackKeyHelp('D#', 2, { lhTriggerOctave: 2 }), 'Scale filter OFF')
        assert.equal(getBlackKeyHelp('D#', 3, { lhTriggerOctave: 2 }), '2')
    })

    it('unknown notes return an empty string', () => {
        assert.equal(getBlackKeyHelp('B', 3, { lhTriggerOctave: 3 }), '')
    })
})
