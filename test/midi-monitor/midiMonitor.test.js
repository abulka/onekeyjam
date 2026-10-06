import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    formatMidiMessage,
    clearMidiActivityLog,
    isSelfOutputDevice,
    looksLikeRoutingDevice,
    wireMidiMonitor,
} from '@/lib/midi/midi-monitor.js'

function fakeInput(name) {
    const listeners = {}
    return {
        name,
        addListener(type, cb) { listeners[type] = cb },
        emit(type, event) { if (listeners[type]) listeners[type](event) },
    }
}

describe('midi-monitor', () => {
    it('formats a note-on message with its note name', () => {
        const message = { type: 'noteon', channel: 1, dataBytes: [60, 100] }
        assert.equal(formatMidiMessage(message), 'noteon ch1 C4 vel 100')
    })

    it('formats a note-off message', () => {
        const message = { type: 'noteoff', channel: 1, dataBytes: [60, 0] }
        assert.equal(formatMidiMessage(message), 'noteoff ch1 C4 vel 0')
    })

    it('formats a control change message', () => {
        const message = { type: 'controlchange', channel: 16, dataBytes: [64, 127] }
        assert.equal(formatMidiMessage(message), 'controlchange ch16 cc64 val 127')
    })

    it('falls back to raw bytes for other message types', () => {
        const message = { type: 'pitchbend', channel: 2, dataBytes: [0, 64] }
        assert.equal(formatMidiMessage(message), 'pitchbend ch2 0 64')
    })

    it('handles a missing message', () => {
        assert.equal(formatMidiMessage(null), '')
    })

    it('clears the activity log but keeps the dot and octave state', () => {
        globals.midiActivity.log.push({ at: 1, input: 'X', type: 'noteon', note: 'C4', text: 'noteon C4' })
        globals.midiActivity.seen = true
        globals.midiActivity.lastNote = 'C4'
        globals.midiActivity.lastInput = 'X'
        globals.midiActivity.lastOctave = 4

        clearMidiActivityLog()

        assert.deepEqual(globals.midiActivity.log, [])
        // The dot and octave panel are not affected by clearing the log.
        assert.equal(globals.midiActivity.seen, true)
        assert.equal(globals.midiActivity.lastNote, 'C4')
        assert.equal(globals.midiActivity.lastInput, 'X')
        assert.equal(globals.midiActivity.lastOctave, 4)
    })

    it('monitors a keyboard even when it also exposes an output port', () => {
        // The Akai LPK25 exposes both an input and an output named "LPK25".
        // It must still be monitored as an input.
        clearMidiActivityLog()
        globals.midiActivity.captureLog = true
        const input = fakeInput('LPK25')
        wireMidiMonitor([input])
        input.emit('midimessage', { message: { type: 'noteon', channel: 1, dataBytes: [60, 100] } })

        assert.equal(globals.midiActivity.seen, true)
        assert.equal(globals.midiActivity.lastNote, 'C4')
        assert.equal(globals.midiActivity.lastOctave, 4)
        assert.equal(globals.midiActivity.lastInput, 'LPK25')
        assert.ok(globals.midiActivity.log.length >= 1)
        globals.midiActivity.captureLog = false
    })

    it('does not accumulate a log while debug capture is off', () => {
        clearMidiActivityLog()
        globals.midiActivity.captureLog = false
        const input = fakeInput('LPK25')
        wireMidiMonitor([input])
        input.emit('midimessage', { message: { type: 'noteon', channel: 1, dataBytes: [60, 100] } })
        input.emit('midimessage', { message: { type: 'noteon', channel: 1, dataBytes: [62, 100] } })

        assert.equal(globals.midiActivity.log.length, 0)
        // The octave still tracks the last note for the panel.
        assert.equal(globals.midiActivity.lastOctave, 4)
    })

    it('identifies the app output device and routing-style names', () => {
        const previous = globals.myOutput
        try {
            globals.myOutput = { name: 'IAC Driver Bus 1' }
            assert.equal(isSelfOutputDevice('IAC Driver Bus 1'), true)
            assert.equal(isSelfOutputDevice('LPK25'), false)
            assert.equal(looksLikeRoutingDevice('IAC Driver Bus 1'), true)
            assert.equal(looksLikeRoutingDevice('Logic Pro Virtual Out'), true)
            assert.equal(looksLikeRoutingDevice('Loopback MIDI'), true)
            assert.equal(looksLikeRoutingDevice('LPK25'), false)
        }
        finally {
            globals.myOutput = previous
        }
    })
})
