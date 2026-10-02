import { globals } from "../globals.js";
import { onNoteOn, onNoteOff } from "./wire-events.js"
import { Note } from "./webmidi.js"

export function initChordPlayEvents() {
    document.addEventListener('chord-play-lh-trigger', function (e) {
        if (!globals.currentChordTriggerNote)
            return;
        const singleNote = globals.currentChordTriggerNote;
        fakeTrigger(singleNote, e.detail.state == 'on');
    });

    document.addEventListener('chord-play-lh-trigger-next', function (e) {
        if (!globals.currentChordTriggerNote)
            return;
        const singleNote = globals.currentChordTriggerNote;
        fakeTrigger(singleNote, false);  // turn off old trigger note

        // calc next trigger note
        const triggerNotes = Object.keys(globals.chordTriggerMap);
        const currentIndex = triggerNotes.indexOf(singleNote);
        if (currentIndex == -1)
            throw ('cannot find current trigger note?');
        // console.log('You are at index', currentIndex)
        const nextIndex = (currentIndex < triggerNotes.length - 1) ? currentIndex + 1 : 0;
        const nextTriggerNote = triggerNotes[nextIndex];

        fakeTrigger(nextTriggerNote, e.detail.state == 'on');
    });
}

/**
 * Send a simulated event to onNoteOn and onNoteOff
 * @param {string} triggerNote e.g. 'C3'
 * @param {boolean} noteState whether to play or stop the note, true means play
 */
function fakeTrigger(triggerNote, noteState = true) {
    // console.log('fakeTrigger', triggerNote, noteState);

    // v1. way
    // const options = { originNote: '?', duration: 50, when: 0 }
    // playChord(triggerNote, options)

    // v2. way
    let simulatedEvent = {
        note: new Note(triggerNote, { attack: 0.5 }),
        duration: 0,  // need duration 0 for note off to work
        when: 0,
    };
    noteState ? onNoteOn(simulatedEvent) : onNoteOff(simulatedEvent);
}
