import assert from 'assert'
import { getBlackKeyHelp } from '@/lib/keyboard-help.js'

describe('getBlackKeyHelp', () => {

    it('left hand octave black keys show meta meanings', () => {
        const options = { lhTriggerOctave: 3 }
        assert.equal(getBlackKeyHelp('C#', 3, options), 'SHIFT')
        assert.equal(getBlackKeyHelp('D#', 3, options), 'Scale filter OFF')
        assert.equal(getBlackKeyHelp('F#', 3, options), 'Scale filter ON')
        assert.equal(getBlackKeyHelp('G#', 3, options), 'Trans-pose chords UP')
        assert.equal(getBlackKeyHelp('A#', 3, options), 'Trans-pose chords DOWN')
    })

    it('left hand shift variants', () => {
        const options = { shift: true, lhTriggerOctave: 3 }
        assert.equal(getBlackKeyHelp('C#', 3, options), '')
        assert.equal(getBlackKeyHelp('D#', 3, options), 'All notes off')
        assert.equal(getBlackKeyHelp('F#', 3, options), 'Add chord')
        assert.equal(getBlackKeyHelp('G#', 3, options), 'Reset transp.')
        assert.equal(getBlackKeyHelp('A#', 3, options), 'Reset transp.')
    })

    it('right hand octaves show scale switch meanings', () => {
        const options = { lhTriggerOctave: 3 }
        assert.equal(getBlackKeyHelp('C#', 4, options), 'Use Scale 1')
        assert.equal(getBlackKeyHelp('D#', 4, options), 'Use Scale 2')
        assert.equal(getBlackKeyHelp('F#', 5, options), 'Use Scale 3')
        assert.equal(getBlackKeyHelp('G#', 6, options), 'Use Scale 4 (notes of chord)')
        assert.equal(getBlackKeyHelp('A#', 7, options), 'Lock current scale')
    })

    it('right hand shift variants are empty', () => {
        assert.equal(getBlackKeyHelp('D#', 4, { shift: true, lhTriggerOctave: 3 }), '')
    })

    it('respects a custom left hand octave', () => {
        assert.equal(getBlackKeyHelp('D#', 2, { lhTriggerOctave: 2 }), 'Scale filter OFF')
        assert.equal(getBlackKeyHelp('D#', 3, { lhTriggerOctave: 2 }), 'Use Scale 2')
    })

    it('unknown notes return an empty string', () => {
        assert.equal(getBlackKeyHelp('B', 3, { lhTriggerOctave: 3 }), '')
    })
})
