import { globals } from "../globals.js"
import { WebMidi } from "./webmidi.js"

/**
 * @module lib/boot-webmidi
 * @desc Enables the Web MIDI API and records the detected input devices.
 *
 * Since Chrome 124 the whole Web MIDI API is gated behind a per-site
 * permission prompt. We catch failures here (instead of letting them abort the
 * whole boot) and record a status so the UI can explain what to do.
 */

export async function bootWebMidi() {
    if (!navigator.requestMIDIAccess) {
        // Safari does not support enumerating MIDI devices
        globals.midiAccess.status = 'unsupported'
        globals.midiAccess.message = 'This browser does not support the Web MIDI API. Please use Chrome, Edge or Opera.'
        return
    }
    await requestMidiAccess()
}

/**
 * Request (or retry) MIDI access. Call this from a user gesture so the browser
 * can show its permission prompt.
 * @returns {Promise<boolean>} true if access was granted
 */
export async function requestMidiAccess() {
    try {
        if (!WebMidi.enabled)
            await WebMidi.enable()
        globals.midiAccess.status = 'granted'
        globals.midiAccess.message = ''
        onWebMidiEnabled()
        wireStateChange()
        return true
    } catch (error) {
        if (error && error.name === 'SecurityError') {
            globals.midiAccess.status = 'denied'
            globals.midiAccess.message = 'MIDI access is blocked for this site. Allow MIDI devices in your browser site settings, then reload.'
        } else {
            globals.midiAccess.status = 'error'
            globals.midiAccess.message = `Could not enable MIDI access: ${error && error.message ? error.message : error}`
        }
        console.warn('WebMidi.enable() failed:', error)
        return false
    }
}

function onWebMidiEnabled() {
    globals.keyboardsDetected = WebMidi.inputs.map(device => device.name)
    prepareAbleton()
}

function wireStateChange() {
    if (wireStateChange.done)
        return
    wireStateChange.done = true
    try {
        // Re-detect devices when they are plugged in or removed
        WebMidi.addListener('statechange', () => onWebMidiEnabled())
    } catch (error) {
        console.warn('Could not subscribe to MIDI state changes', error)
    }
}

function prepareAbleton() {
    // Get ready for output. Have to enable IAC Driver first, then run Ableton
    // with a track with some synth sound listening only on IAC Driver MIDI input
    globals.myOutput = WebMidi.getOutputByName("IAC Driver Bus 1");
    if (!globals.myOutput) {
        // console.warn('Cannot WebMidi.getOutputByName of IAC Driver Bus 1, so cannot wire output channels to your DAW. Please enable IAC Driver Bus 1 on Mac in Audio MIDI Setup')
    } else {
        globals.channel = globals.myOutput.channels[1]; // jamming sound on channel 1
        globals.channel2 = globals.myOutput.channels[2]; // chord sound on channel 2
        globals.channel3 = globals.myOutput.channels[3];
    }
}
