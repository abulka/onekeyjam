import { notesToKeyboardNumbers } from "./note-tools.js";
import { globals } from "./globals.js"  // just for globals.delayBassToChord
import * as webaudiofont from "./general-midi-webaudiofont.js";
import * as soundfont from "./general-midi-soundfont-player.js";

export let audioContext = undefined

// const strategy = 'webaudiofont';
const strategy = 'soundfont-player';
let _boot
let _stopGmNote
let _playGmNote
let _stopAllNotes
let _ping

if (strategy === 'webaudiofont') {
    _boot = webaudiofont.bootGeneralMidi;
    _stopGmNote = webaudiofont.stopGmNote;
    _playGmNote = webaudiofont.playGmNote;
    _stopAllNotes = webaudiofont.stopAllNotes;
    _ping = webaudiofont.ping;
}
else {
    _boot = soundfont.bootGeneralMidi;
    _stopGmNote = soundfont.stopGmNote;
    _playGmNote = soundfont.playGmNote;
    _stopAllNotes = soundfont.stopAllNotes;
    _ping = soundfont.ping;
}


export function bootGeneralMidi() {
    let AudioContextFunc = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextFunc();

    _boot(audioContext)
}

export function stopGmNote(noteOffInfo) {
    _stopGmNote(audioContext, noteOffInfo)
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
    // console.log('  octave', octave)
    // if (options.toneType != 'bass') {
    //     octave++
    //     console.log('  octave boost cos not bass', octave)
    // }

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
    const envelope = _playGmNote(audioContext, options.toneType, when, octave, allowedNote, pitch, velocity, duration)

    // inject the envelope into the noteOffInfo so that we can later stop it
    noteOffInfo.pitch = pitch;
    noteOffInfo.envelope = envelope;
    noteOffInfo.velocity = velocity;
    // console.log('GM note', noteName, 'octave', octave, 'pitch', pitch, 'options', options, 'envelope', envelope, allowedNote);

}

document.addEventListener("authorise-gm-cmd", function (event) {
    _ping(audioContext)
})

export function stopAllNotes() {
    _stopAllNotes(audioContext);
}