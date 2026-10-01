import { globals } from "./globals.js";
import { changeScaleFilter } from "./change-scale.js" // for testing
import { playChord, playChordOff } from "./play-chord.js"

export function scenario1() {
    // Cycle through a few scales
    globals.currentChordTriggerNote = globals.getTriggerNote(0)
    changeScaleFilter();
    setTimeout(() => {
        globals.currentChordTriggerNote = globals.getTriggerNote(1);
        changeScaleFilter('scale2');
        setTimeout(() => {
            globals.currentChordTriggerNote = globals.getTriggerNote(2);
            changeScaleFilter('scale3');
        }, 2000);

    }, 2000);
}

function resolveAfterSeconds(n = 1000) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve('resolved');
        }, n);
    });
}

async function play(noteName) {
    let fakeNote = new Note(noteName);
    fakeNote.attack = 0.1;

    playChord(noteName, { originNote: fakeNote });
    await resolveAfterSeconds()
    playChordOff(noteName)
}

export async function scenario2() {
    // Play a few chords
    play(globals.getTriggerNote(0))
    await resolveAfterSeconds(500)
    play(globals.getTriggerNote(1))
    await resolveAfterSeconds(500)
    play(globals.getTriggerNote(2))
}
