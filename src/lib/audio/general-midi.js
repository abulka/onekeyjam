import { notesToKeyboardNumbers } from "../note-tools.js";
import { globals } from "../globals.js"  // just for globals.delayBassToChord
import * as soundfont from "./general-midi-soundfont-player.js";

export let audioContext = undefined

export function bootGeneralMidi() {
    let AudioContextFunc = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextFunc();

    soundfont.bootGeneralMidi(audioContext)

    // Registered explicitly during boot rather than as an import side effect.
    document.addEventListener("authorise-gm-cmd", function () {
        soundfont.ping()
    })
}

export function stopGmNote(noteOffInfo) {
    soundfont.stopGmNote(audioContext, noteOffInfo)
}

export function playGmNote(allowedNote, noteOffInfo, options) {
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
