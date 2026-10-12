import assert from 'assert';
import { globals } from "../../src/lib/globals.js";
import { syncPickerToCurrentChord } from "../../src/lib/syncPickerToCurrentChord.js";

function snapshotGlobals() {
    return {
        project: JSON.parse(JSON.stringify(globals.project)),
        chordTriggerMap: JSON.parse(JSON.stringify(globals.chordTriggerMap)),
        currentChordTriggerNote: globals.currentChordTriggerNote,
        chordPicker: JSON.parse(JSON.stringify(globals.chordPicker)),
        inspector: JSON.parse(JSON.stringify(globals.chordInspector)),
    };
}

function restoreGlobals(snapshot) {
    globals.project = snapshot.project;
    globals.chordTriggerMap = snapshot.chordTriggerMap;
    globals.currentChordTriggerNote = snapshot.currentChordTriggerNote;
    globals.chordPicker = snapshot.chordPicker;
    globals.chordInspector = snapshot.inspector;
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
    it('copies the grid chord into the inspector draft with its voicing', () => {
        const snapshot = snapshotGlobals();
        try {
            seedProjectWithChord('G7', ['G3', 'B3', 'D4', 'F4'], 'G');
            const ok = syncPickerToCurrentChord();
            assert.equal(ok, true);
            assert.equal(globals.chordPicker.currentRoot, 'G');
            assert.deepEqual(globals.chordInspector.notes, ['G3', 'B3', 'D4', 'F4']);
            assert.equal(globals.chordInspector.slotId, 1);
            assert.equal(globals.chordInspector.voicingMode, 'auto');
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
