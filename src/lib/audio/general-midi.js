import { notesToKeyboardNumbers } from "../note-tools.js";
import { globals } from "../globals.js"  // just for globals.delayBassToChord
import * as soundfont from "./general-midi-soundfont-player.js";

export let audioContext = undefined
let unlockInstalled = false

/**
 * Wake the shared audio context if the browser left it waiting for a user
 * gesture. iPad Safari starts it suspended at page load and can suspend it
 * again after lock, backgrounding or an interruption. Resolves true when the
 * context is running (or there is nothing to wake).
 */
export function ensureAudioReady() {
    if (!audioContext)
        return Promise.resolve(false)
    if (audioContext.state !== 'suspended')
        return Promise.resolve(true)
    try {
        const result = audioContext.resume()
        if (result && typeof result.then === 'function')
            return result.then(() => audioContext.state !== 'suspended').catch(() => false)
        return Promise.resolve(audioContext.state !== 'suspended')
    }
    catch (error) {
        return Promise.resolve(false)
    }
}

/** Wake on the first tap and whenever the page returns to the foreground. */
function installAudioUnlock() {
    if (unlockInstalled)
        return
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return
    unlockInstalled = true
    const wake = () => { ensureAudioReady() }
    window.addEventListener('pointerdown', wake)
    window.addEventListener('touchend', wake)
    window.addEventListener('click', wake)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden)
            ensureAudioReady()
    })
    window.addEventListener('pageshow', wake)
}

export function bootGeneralMidi() {
    let AudioContextFunc = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextFunc();

    soundfont.bootGeneralMidi(audioContext)
    installAudioUnlock()

    // Registered explicitly during boot rather than as an import side effect.
    document.addEventListener("authorise-gm-cmd", function () {
        soundfont.ping()
    })
}

export function stopGmNote(noteOffInfo) {
    if (!audioContext || !noteOffInfo)
        return
    soundfont.stopGmNote(audioContext, noteOffInfo)
}

export function playGmNote(allowedNote, noteOffInfo, options) {
    if (!audioContext)
        return
    // Fire-and-forget: the current tap may still be silent if the context was
    // suspended, but waking here means the next tap sounds without needing to
    // press play elsewhere first.
    if (audioContext.state === 'suspended')
        ensureAudioReady()
    let octave;
    let noteName;
    if (!options)
        throw ('playGmNote() options must be defined');
    let velocity = options.velocity || 0.5


    if (allowedNote.length == 3) {
        noteName = allowedNote.slice(0, 2);
        octave = allowedNote.charAt(2);
    }
    else {
        noteName = allowedNote.charAt(0);
        octave = allowedNote.charAt(1);
    }

    let when
    if (options.when) {
        when = options.when || audioContext.currentTime
    }
    else {
        // possibly delay the chord, when to play, audioContext.currentTime or 0 to play now, audioContext.currentTime + 3 to play after 3 seconds
        when = options.toneType === 'chord' ? audioContext.currentTime + parseFloat(globals.delayBassToChord) : 0
    }

    let pitches = notesToKeyboardNumbers([noteName]);
    let pitch = pitches[0];

    const duration = options.duration || 123456789
    const envelope = soundfont.playGmNote(audioContext, options.toneType, when, octave, allowedNote, pitch, velocity, duration)

    // inject the envelope into the noteOffInfo so that we can later stop it
    noteOffInfo.pitch = pitch;
    noteOffInfo.envelope = envelope;
    noteOffInfo.velocity = velocity;
}

export function stopAllNotes() {
    soundfont.stopAllNotes();
}
