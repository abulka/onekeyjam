// @ts-check
import { globals } from '../globals.js'
import { WebMidi, Note } from './webmidi.js'

/**
 * @module lib/midi/midi-monitor
 * @desc Observes raw messages from every hardware MIDI input, independent of
 * the selected keyboard config. It feeds the top-bar activity dot and the
 * "incoming MIDI" log in the MIDI Keyboard Config section, which makes it easy
 * to tell whether the browser is receiving anything at all from a device.
 *
 * A physical keyboard often exposes both a USB MIDI input and output endpoint
 * under the same name (for example the Akai LPK25). That output endpoint does
 * not make it unusable as an input, so nothing is filtered out here. Only the
 * device the app itself sends to (the IAC Driver) is called out as a routing
 * device, because wiring it back in could loop the app's own notes.
 */

/** Inputs already listened to, so re-running the wiring does not double-add. */
const wiredInputs = new WeakSet()

/** Message types that are pure clock/timing noise and would swamp the log. */
const NOISY_TYPES = new Set([
    'clock',
    'start',
    'continue',
    'stop',
    'activesensing',
    'reset',
    'unknownmessage',
    'sysex',
    'sysexend',
    'tunerequest',
    'songposition',
    'songselect',
])

/** Virtual / routing port names that are not physical keyboards. */
const ROUTING_PATTERN = /(^|[^a-z])(iac|virtual|loopback|loopmidi)([^a-z]|$)/i

/**
 * Whether a device name is the one the app itself sends output to (the IAC
 * Driver). Using it as a keyboard input can create a feedback loop.
 * @param {string} name
 * @returns {boolean}
 */
export function isSelfOutputDevice(name) {
    return !!globals.myOutput && globals.myOutput.name === name
}

/**
 * Whether a device name looks like a virtual or DAW routing port rather than a
 * physical keyboard. Used only to warn, never to filter anything out.
 * @param {string} name
 * @returns {boolean}
 */
export function looksLikeRoutingDevice(name) {
    if (!name)
        return false
    return isSelfOutputDevice(name) || ROUTING_PATTERN.test(name)
}

/**
 * @param {number[]} dataBytes
 * @returns {string}
 */
function noteNameFromDataBytes(dataBytes) {
    try {
        return new Note(dataBytes[0]).identifier
    }
    catch (error) {
        return String(dataBytes[0])
    }
}

/**
 * The octave of a MIDI note number, using WebMidi's middle-C-is-C4 convention.
 * @param {number} midi
 * @returns {number}
 */
function octaveFromMidi(midi) {
    return Math.floor(Number(midi) / 12) - 1
}

/**
 * A compact human-readable form of a MIDI message for the debug log.
 * @param {*} message webmidi Message
 * @returns {string}
 */
export function formatMidiMessage(message) {
    if (!message)
        return ''
    const type = message.type || 'unknown'
    const channel = message.channel ? ` ch${message.channel}` : ''
    const bytes = Array.isArray(message.dataBytes) ? message.dataBytes : []
    if (type === 'noteon' || type === 'noteoff') {
        const note = noteNameFromDataBytes(bytes)
        const velocity = bytes[1]
        return `${type}${channel} ${note} vel ${velocity}`
    }
    if (type === 'controlchange') {
        return `controlchange${channel} cc${bytes[0]} val ${bytes[1]}`
    }
    if (type === 'pitchbend') {
        return `pitchbend${channel} ${bytes.join(' ')}`
    }
    return `${type}${channel} [${bytes.join(' ')}]`
}

/**
 * @param {string} inputName
 * @param {*} message
 */
function recordMidiActivity(inputName, message) {
    const activity = globals.midiActivity
    const type = message.type || 'unknown'
    const isNote = type === 'noteon' || type === 'noteoff'
    /** @type {{ at: number, input: string, type: string, note: string, text: string }} */
    const entry = {
        at: Date.now(),
        input: inputName,
        type,
        note: isNote ? noteNameFromDataBytes(message.dataBytes) : '',
        text: formatMidiMessage(message),
    }
    // Only keep the raw log while the debug area is open, so a busy keyboard
    // cannot accumulate entries during normal use.
    if (activity.captureLog) {
        activity.log.push(entry)
        while (activity.log.length > activity.logLimit)
            activity.log.shift()
    }
    activity.lastAt = entry.at
    activity.lastInput = inputName
    activity.lastNote = entry.note || entry.text
    activity.lastState = type
    if (isNote) {
        activity.seen = true
        activity.lastOctave = octaveFromMidi(message.dataBytes[0])
    }
    activity.pulse++
}

/**
 * @param {string} inputName
 * @param {*} e webmidi midimessage event
 */
function onMidiMessage(inputName, e) {
    const message = e && e.message
    if (!message || NOISY_TYPES.has(message.type))
        return
    recordMidiActivity(inputName, message)
}

/**
 * Attach the monitor to every input. Safe to call repeatedly; each input is
 * only wired once.
 * @param {Array<*>} [inputs] the inputs to watch; defaults to every WebMidi input
 */
export function wireMidiMonitor(inputs = WebMidi.inputs) {
    for (const input of inputs) {
        if (wiredInputs.has(input))
            continue
        wiredInputs.add(input)
        input.addListener('midimessage', (/** @type {*} */ e) => onMidiMessage(input.name, e))
    }
}

/** Empty the incoming-message log. The dot and octave panel are left alone. */
export function clearMidiActivityLog() {
    globals.midiActivity.log.splice(0)
}
