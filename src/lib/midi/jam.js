import { globals } from "../globals.js"
import { playGmNote, stopGmNote } from "../audio/general-midi.js"
import { detectChordsBeingPlayed } from "../detectChordsBeingPlayed.js";
import { recordJamNoteOn, recordJamNoteOff } from "./recorder.js"
import { recordSoloNote } from "../autoScale.js"

function nowMs() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export function jam(note) {
    // Avoid playing a jam note when the focus is in the live onscreen piano
    // keyboard and user hits CMD-R to refresh the browser page. See my issue
    // https://github.com/g200kg/webaudio-controls/issues/47
    if (globals.keyState.meta)
        return

    if (Object.keys(globals.scaleTriggerMap).length == 0 ||
        !globals.currentScaleNotes ||
        !globals.scaleFilteringEnabled) {
        // Unfiltered by scale - simply echo to output
        const noteOffInfo = {
            allowedNote: note.identifier,
            pitch: undefined,
            velocity: note.attack,
            envelope: undefined,
            startedAt: nowMs(),
        }
        globals.pendingNoteOffs[note.identifier] = noteOffInfo
        recordSoloNote(note.identifier)
        recordJamNoteOn(note.identifier, note.attack, { playedNote: note.identifier })
        if (globals.GM)
            playGmNote(note.identifier, noteOffInfo, { velocity: note.attack })
        else
            if (globals.channel)
                globals.channel.playNote(note);
    }
    else {
        // Filtered by scale
        let allowedNote = globals.scaleTriggerMap[note.identifier]
        if (allowedNote == undefined || allowedNote == '' || allowedNote == 'X') {
            // console.log('jam note not in scale mapping', note.identifier, allowedNote)
            return
        }
        const noteOffInfo = {
            allowedNote: allowedNote,
            pitch: undefined,
            velocity: note.attack,
            envelope: undefined,
            startedAt: nowMs(),
        }
        globals.pendingNoteOffs[note.identifier] = noteOffInfo;

        globals.currentJamNote.real = note.identifier
        globals.currentJamNote.mapped = allowedNote

        recordSoloNote(allowedNote)
        recordJamNoteOn(allowedNote, note.attack, { playedNote: note.identifier })

        if (globals.GM)
            playGmNote(allowedNote, noteOffInfo, { velocity: note.attack })
        else
            if (globals.channel)
                globals.channel.playNote(allowedNote, { attack: note.attack });
    }
    detectChordsBeingPlayed()
}

export function jamOff(note) {
    // No matter the state of scale filtering, we always need to
    // check pendingNoteOffs for the real note (key) and turn off the allowed note (value)
    let noteOffInfo = globals.pendingNoteOffs[note.identifier]
    if (noteOffInfo) {
        const allowedNote = noteOffInfo.allowedNote
        delete globals.pendingNoteOffs[note.identifier]

        recordJamNoteOff(allowedNote)

        // Clear the live readout, but only when the released note is the one
        // shown: with legato playing another note may still be held.
        if (globals.currentJamNote && globals.currentJamNote.real === note.identifier) {
            globals.currentJamNote.real = ''
            globals.currentJamNote.mapped = ''
        }

        // window.document.querySelector('#currentJamNote').innerHTML = `${note.identifier} -x-> ${allowedNote}`;
        // console.log(`${note.identifier} -x-> ${allowedNote} OFF`, 'pendingNoteOffs', globals.pendingNoteOffs)

        if (globals.GM)
            stopGmNote(noteOffInfo)
        else
            if (globals.channel)
                globals.channel.stopNote(allowedNote)
    }
    else {
        // Echo noteoff to output.
        // Safer to send sendNoteOff() instead of playNote() cos note might be from onscreen keyboard 
        // which doesn't have the usual noteoff attributes (the real keyboard Note objects do)
        if (globals.GM) {
            // nothing to do - we don't have an envelope to stop
        }
        else
            if (globals.channel)
                globals.channel.sendNoteOff(note)
    }
    detectChordsBeingPlayed()
}
