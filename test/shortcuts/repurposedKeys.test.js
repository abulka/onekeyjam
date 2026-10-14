import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { wireScaleFilterShortcuts } from '@/lib/midi/scaleFilterShortcuts.js'

/*
 * The freed lower-row punctuation keys: `/` adds the jammed chord in either
 * mode with whatever voicing the Edit Chords panel has selected, `Shift+/` adds
 * it with the Normalised voicing, `,` switches to magic mode and `.` switches
 * to normal piano. These are global, so they are handled by
 * scaleFilterShortcuts.js.
 */

function press(code, overrides = {}) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, ...overrides }))
}

describe('repurposed lower-row keys', () => {

    let events
    let details

    beforeEach(() => {
        wireScaleFilterShortcuts()
        events = []
        details = []
        document.broadcastEvent = (name, detail) => { events.push(name); details.push(detail) }
        globals.bypass = false  // start in magic mode
    })

    afterEach(() => {
        globals.bypass = false
    })

    it('/ adds the jammed chord', () => {
        press('Slash')
        assert.deepEqual(events, ['chord-add'])
        assert.deepEqual(details, [{}], 'plain / does not ask for a voicing')
    })

    it('/ adds the jammed chord in normal piano mode too', () => {
        globals.bypass = true
        press('Slash')
        assert.deepEqual(events, ['chord-add'])
    })

    it('Shift+/ adds the jammed chord with the Normalised voicing', () => {
        press('Slash', { shiftKey: true })
        assert.deepEqual(events, ['chord-add'])
        assert.deepEqual(details, [{ voicing: 'normalised' }])
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

    it('ignores the shifted comma variant', () => {
        globals.bypass = true
        press('Comma', { shiftKey: true })
        assert.equal(globals.bypass, true, 'Shift+, must not switch mode')
        assert.deepEqual(events, [], 'Shift+, must not add a chord either')
    })

    /*
     * Enter and Shift+Enter work with the cursor in a field of the Edit Chords
     * panel, so Shift+/ does too. Plain / must not be taken over there: those
     * inputs use the character themselves.
     */

    function withPanelField(run) {
        const panel = document.createElement('div')
        panel.className = 'chord-inspector'
        const field = document.createElement('input')
        field.type = 'text'
        panel.appendChild(field)
        document.body.appendChild(panel)
        try {
            field.focus()
            run(field)
        }
        finally {
            panel.remove()
        }
    }

    it('Shift+/ works while a field in the Edit Chords panel has focus', () => {
        withPanelField((field) => {
            field.dispatchEvent(new KeyboardEvent('keydown', { code: 'Slash', key: '?', shiftKey: true, bubbles: true }))
        })
        assert.deepEqual(events, ['chord-add'])
        assert.deepEqual(details, [{ voicing: 'normalised' }])
    })

    it('plain / still types a slash bass in that field', () => {
        withPanelField((field) => {
            field.dispatchEvent(new KeyboardEvent('keydown', { code: 'Slash', key: '/', bubbles: true }))
        })
        assert.deepEqual(events, [], 'the field keeps the slash for a slash bass')
    })
})
