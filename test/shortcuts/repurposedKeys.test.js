import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { wireScaleFilterShortcuts } from '@/lib/midi/scaleFilterShortcuts.js'

/*
 * The freed lower-row punctuation keys: `/` adds the jammed chord in either
 * mode, `,` switches to magic mode and `.` switches to normal piano. These are
 * global, so they are handled by scaleFilterShortcuts.js.
 */

function press(code, overrides = {}) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, ...overrides }))
}

describe('repurposed lower-row keys', () => {

    let events

    beforeEach(() => {
        wireScaleFilterShortcuts()
        events = []
        document.broadcastEvent = (name) => { events.push(name) }
        globals.bypass = false  // start in magic mode
    })

    afterEach(() => {
        globals.bypass = false
    })

    it('/ adds the jammed chord', () => {
        press('Slash')
        assert.deepEqual(events, ['chord-add'])
    })

    it('/ adds the jammed chord in normal piano mode too', () => {
        globals.bypass = true
        press('Slash')
        assert.deepEqual(events, ['chord-add'])
    })

    it(', switches to magic mode and . switches to normal piano', () => {
        globals.bypass = true
        press('Comma')
        assert.equal(globals.bypass, false)
        assert.equal(globals.scaleFilteringEnabled, true)
        assert.equal(globals.enableLhChordTriggers, true)

        press('Period')
        assert.equal(globals.bypass, true)
        assert.equal(globals.scaleFilteringEnabled, false)
        assert.equal(globals.enableLhChordTriggers, false)
    })

    it('ignores the shifted punctuation variants', () => {
        globals.bypass = true
        press('Comma', { shiftKey: true })
        assert.equal(globals.bypass, true, 'Shift+, must not switch mode')
        press('Slash', { shiftKey: true })
        assert.deepEqual(events, [], 'Shift+/ must not add a chord')
    })
})
