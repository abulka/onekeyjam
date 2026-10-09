import assert from 'assert'
import { decideTransportAction, isSpaceTransportEvent } from '@/lib/transport.js'

function spaceEvent(overrides = {}, target = null) {
    const event = new KeyboardEvent('keydown', { code: 'Space', ...overrides })
    // KeyboardEvent target is read-only; define it for the guard.
    Object.defineProperty(event, 'target', { value: target || document.body })
    event.preventDefault = () => {}
    return event
}

describe('decideTransportAction', () => {
    it('stops recording first', () => {
        assert.equal(decideTransportAction({
            isRecording: true, patternPlaying: true, takePlaying: true, hasPatternNotes: true,
        }), 'stop-recording')
    })

    it('stops the pattern before take playback', () => {
        assert.equal(decideTransportAction({
            isRecording: false, patternPlaying: true, takePlaying: true, hasPatternNotes: true,
        }), 'stop-pattern')
    })

    it('pauses take playback when nothing else runs', () => {
        assert.equal(decideTransportAction({
            isRecording: false, patternPlaying: false, takePlaying: true, hasPatternNotes: true,
        }), 'stop-take-playback')
    })

    it('starts the pattern when it has notes', () => {
        assert.equal(decideTransportAction({
            isRecording: false, patternPlaying: false, takePlaying: false, hasPatternNotes: true,
        }), 'start-pattern')
    })

    it('does nothing with no recording, playback or notes', () => {
        assert.equal(decideTransportAction({
            isRecording: false, patternPlaying: false, takePlaying: false, hasPatternNotes: false,
        }), 'none')
    })
})

describe('isSpaceTransportEvent', () => {
    it('accepts a plain Space press', () => {
        assert.equal(isSpaceTransportEvent(spaceEvent()), true)
    })

    it('rejects other keys, repeats and modifiers', () => {
        assert.equal(isSpaceTransportEvent(spaceEvent({ code: 'KeyA' })), false)
        assert.equal(isSpaceTransportEvent(spaceEvent({ repeat: true })), false)
        assert.equal(isSpaceTransportEvent(spaceEvent({ ctrlKey: true })), false)
        assert.equal(isSpaceTransportEvent(spaceEvent({ metaKey: true })), false)
        assert.equal(isSpaceTransportEvent(spaceEvent({ altKey: true })), false)
    })

    it('leaves Space alone while typing, like the piano shortcuts', () => {
        const input = document.createElement('input')
        input.setAttribute('type', 'text')
        assert.equal(isSpaceTransportEvent(spaceEvent({}, input)), false)
        const area = document.createElement('textarea')
        assert.equal(isSpaceTransportEvent(spaceEvent({}, area)), false)
    })
})
