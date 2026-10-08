import assert from 'assert';
import { globals } from "../../src/lib/globals.js";
import { syncPickerToCurrentChord } from "../../src/lib/syncPickerToCurrentChord.js";

function snapshotGlobals() {
    return {
        project: JSON.parse(JSON.stringify(globals.project)),
        chordTriggerMap: JSON.parse(JSON.stringify(globals.chordTriggerMap)),
        currentChordTriggerNote: globals.currentChordTriggerNote,
        chordPicker: JSON.parse(JSON.stringify(globals.chordPicker)),
        jammed: JSON.parse(JSON.stringify(globals.currentChordBeingJammed)),
    };
}

function restoreGlobals(snapshot) {
    globals.project = snapshot.project;
    globals.chordTriggerMap = snapshot.chordTriggerMap;
    globals.currentChordTriggerNote = snapshot.currentChordTriggerNote;
    globals.chordPicker = snapshot.chordPicker;
    globals.currentChordBeingJammed = snapshot.jammed;
}

function seedProjectWithChord(chord, chordNotes, bass = '') {
    globals.project = {
        name: 'Sync Test',
        chords: [],
        options: {},
        songs: { default: { ids: [], favourites: [], blacklist: [] } },
    };
    globals.chordTriggerMap = {
        C2: {
            id: 1, name: `${chord} (test)`, chord, chordNotes, bass,
            scale1: '', scale2: '', scale3: '', scaleNotesOfChord: [],
        },
    };
    globals.currentChordTriggerNote = 'C2';
    globals.chordPicker.currentRoot = 'C';
    globals.chordPicker.currentChord = 'M';
    globals.chordPicker.currentBass = '';
}

describe('syncPickerToCurrentChord', () => {
    it('copies the grid chord into the picker with its voicing', () => {
        const snapshot = snapshotGlobals();
        try {
            seedProjectWithChord('G7', ['G3', 'B3', 'D4', 'F4'], 'G');
            // @ts-ignore: test setup
            document.broadcastEvent = () => {};
            const ok = syncPickerToCurrentChord();
            assert.equal(ok, true);
            assert.equal(globals.chordPicker.currentRoot, 'G');
            assert.deepEqual(globals.currentChordBeingJammed.chordNotes, ['G3', 'B3', 'D4', 'F4']);
        } finally {
            restoreGlobals(snapshot);
        }
    });

    it('returns false when no project chord is selected', () => {
        const snapshot = snapshotGlobals();
        try {
            globals.chordTriggerMap = {};
            globals.currentChordTriggerNote = undefined;
            assert.equal(syncPickerToCurrentChord(), false);
        } finally {
            restoreGlobals(snapshot);
        }
    });
});
