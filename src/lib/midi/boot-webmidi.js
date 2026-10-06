import { globals } from "../globals.js"
import { WebMidi } from "./webmidi.js"
import { wireMidiMonitor } from "./midi-monitor.js"

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
        // Chrome rejects with NotAllowedError when no user gesture is available
        // or the prompt was dismissed; older browsers use SecurityError.
        if (error && (error.name === 'SecurityError' || error.name === 'NotAllowedError')) {
            globals.midiAccess.status = 'denied'
            globals.midiAccess.message = 'MIDI access is blocked for this site. Click "Enable MIDI access", allow MIDI devices in your browser site settings, then try again.'
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
    // Watch every input for raw activity, so the UI can show whether MIDI is
    // arriving even when no keyboard config is selected.
    wireMidiMonitor()
    // Let the rest of the app re-select and re-wire the keyboard. The project
    // layer only acts on this once boot has finished.
    broadcastDevicesChanged()
}

function broadcastDevicesChanged() {
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    if (typeof document !== 'undefined' && typeof document.broadcastEvent === 'function')
        // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
        document.broadcastEvent('midi-devices-changed', {})
}

function wireStateChange() {
    if (wireStateChange.done)
        return
    wireStateChange.done = true
    try {
        // webmidi v3 emits 'portschanged' when a device appears or disappears
        // (the v3 alpha used 'statechange', which no longer fires).
        const refresh = () => onWebMidiEnabled()
        WebMidi.addListener('portschanged', refresh)
        WebMidi.addListener('connected', refresh)
        WebMidi.addListener('disconnected', refresh)
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
