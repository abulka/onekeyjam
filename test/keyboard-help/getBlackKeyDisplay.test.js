import assert from 'assert'
import { getBlackKeyDisplay } from '@/lib/keyboard-help.js'

describe('getBlackKeyDisplay', () => {

    it('shows only the regular text when SHIFT is not active', () => {
        const result = getBlackKeyDisplay('Scale filter OFF', 'All notes off', false)
        assert.equal(result.help, 'Scale filter OFF')
        assert.equal(result.shiftHelp, '')
    })

    it('shows only the SHIFT text when SHIFT is active', () => {
        const result = getBlackKeyDisplay('Scale filter OFF', 'All notes off', true)
        assert.equal(result.help, '')
        assert.equal(result.shiftHelp, 'All notes off')
    })

    it('blanks a left hand key with no SHIFT meaning while SHIFT is active', () => {
        const result = getBlackKeyDisplay('Trans-pose chords UP', '', true)
        assert.equal(result.help, '')
        assert.equal(result.shiftHelp, '')
    })

    it('keeps the SHIFT label on the SHIFT key while active', () => {
        const result = getBlackKeyDisplay('SHIFT', '', true, true)
        assert.equal(result.help, 'SHIFT')
        assert.equal(result.shiftHelp, '')
    })

    it('tolerates missing text', () => {
        const result = getBlackKeyDisplay(undefined, undefined, true)
        assert.equal(result.help, '')
        assert.equal(result.shiftHelp, '')
    })
})
