// @ts-check
import { globals } from './globals.js'
import { sequencerControl } from './sequencer-control.js'
import { startRecording, stopRecording } from './midi/recorder.js'
import { stopPlayback } from './midi/playback.js'
import { isTypingTarget } from './is-typing-target.js'

/**
 * @module lib/transport
 * @desc Shared top-bar transport: the Record button beside the pattern Play
 * button, and the Space shortcut that drives recording, pattern playback and
 * take playback. The piano keyboard uses `isTypingTarget()` to leave typing
 * alone, and the same technique guards Space so it acts naturally in fields.
 */

/**
 * The Space shortcut action for the current transport state.
 * @typedef {'stop-recording'|'stop-pattern'|'stop-take-playback'|'start-pattern'|'none'} TransportAction
 */

/**
 * Decide what Space should do for the given transport state. Pure, so it can
 * be unit tested. Priority: stop recording first, then stop the pattern loop,
 * then pause take playback, then start the pattern when it has notes.
 * @param {{ isRecording: boolean, patternPlaying: boolean, takePlaying: boolean, hasPatternNotes: boolean }} state
 * @returns {TransportAction}
 */
export function decideTransportAction(state) {
    if (state.isRecording)
        return 'stop-recording'
    if (state.patternPlaying)
        return 'stop-pattern'
    if (state.takePlaying)
        return 'stop-take-playback'
    if (state.hasPatternNotes)
        return 'start-pattern'
    return 'none'
}

/** Read the live transport state from globals and the sequencer controller. */
export function readTransportState() {
    return {
        isRecording: !!globals.recording.isRecording,
        patternPlaying: !!sequencerControl.isPlaying,
        takePlaying: !!globals.recording.playback.isPlaying,
        hasPatternNotes: !!sequencerControl.hasNotes,
    }
}

/**
 * True when a keydown event is a Space transport press. Mirrors the piano
 * keyboard wiring: auto-repeats and Ctrl/Meta/Alt combinations are ignored,
 * and typing in a field leaves Space alone.
 * @param {KeyboardEvent} e
 * @returns {boolean}
 */
export function isSpaceTransportEvent(e) {
    if (!e || e.code !== 'Space')
        return false
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey)
        return false
    if (isTypingTarget(/** @type {EventTarget|null} */ (e.target)))
        return false
    return true
}

function showToast(message, className) {
    try {
        if (typeof $ === 'function')
            $('body').toast({ message, displayTime: 2500, class: className })
    }
    catch (error) {
        // Toasts are best effort.
    }
}

/** Start recording from the top bar and toast, staying on the current page. */
export function startTopBarRecording() {
    startRecording()
    showToast('Recording. Press Space or Record to stop. The take is reviewed under Perform, Take.', 'red')
}

/** Stop recording from the top bar and toast, staying on the current page. */
export function stopTopBarRecording() {
    stopRecording()
    const take = globals.recording.take
    const noteCount = (take.chords?.length || 0) + (take.jam?.length || 0)
    if (noteCount > 0)
        showToast(`Recording stopped. Saved ${noteCount} note${noteCount === 1 ? '' : 's'}. Review it under Perform, Take.`, 'teal')
    else
        showToast('Recording stopped. No notes were captured.', 'brown')
}

/** Toggle take recording from the top-bar Record button or Space. */
export function toggleTopBarRecord() {
    if (globals.recording.isRecording)
        stopTopBarRecording()
    else
        startTopBarRecording()
}

/**
 * Carry out the Space shortcut for the current state. Returns the action that
 * ran, or 'none' when nothing was playing and there was nothing to start.
 * @returns {TransportAction}
 */
export function performSpaceTransportAction() {
    const action = decideTransportAction(readTransportState())
    if (action === 'stop-recording')
        toggleTopBarRecord()
    else if (action === 'stop-pattern')
        sequencerControl.stop()
    else if (action === 'stop-take-playback')
        stopPlayback(false)
    else if (action === 'start-pattern')
        sequencerControl.play()
    return action
}

/**
 * Handle a window keydown for the Space transport. Returns true when the event
 * was consumed, so callers can keep their own shortcut chains.
 * @param {KeyboardEvent} e
 * @returns {boolean}
 */
export function handleSpaceTransportKeyDown(e) {
    if (!isSpaceTransportEvent(e))
        return false
    const action = decideTransportAction(readTransportState())
    if (action === 'none')
        return false
    e.preventDefault()
    performSpaceTransportAction()
    return true
}
