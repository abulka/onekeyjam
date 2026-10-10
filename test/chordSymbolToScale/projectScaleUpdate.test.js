import assert from 'assert';
import { globals } from '../../src/lib/globals.js';
import { findMatchingScalesForAllProjectChords } from '../../src/lib/findMatchingScales.js';
import { applyProjectKeySettings, applyChordKeySettings, applyChordKeyLocked } from '../../src/lib/projectScaleSettings.js';
import { toggleSoloMode } from '../../src/lib/change-scale.js';
import { buildTriggerMap } from '../../src/lib/triggerMaps.js';

/*
 * When the project key or colour changes, every chord scale is re-ranked in
 * place and any allocated trigger-map entry is synced. See
 * doco/MUSIC-THEORY.md.
 */

function makeProject() {
    return {
        name: 'test',
        chords: [
            { id: 1, name: 'Dm7', chord: 'Dm7', chordNotes: ['D3', 'F3', 'A3', 'C4'], scale1: 'C major blues', scale2: '', scale3: '' },
            { id: 2, name: 'G7b9', chord: 'G7b9', chordNotes: ['G3', 'B3', 'D4', 'F4', 'Ab4'], scale1: 'C major', scale2: '', scale3: '' },
            { id: 3, name: 'Cmaj7', chord: 'Cmaj7', chordNotes: ['C3', 'E3', 'G3', 'B3'], scale1: 'C major blues', scale2: '', scale3: '' },
        ],
        options: { key: { tonic: 'C', type: 'major', source: 'user' }, colour: 'jazz' },
        songs: {},
    };
}

describe('findMatchingScalesForAllProjectChords', () => {

    beforeEach(() => {
        globals.chordTriggerMap = {};
        globals.projectKey = null;
    });

    it('re-ranks every project chord in the declared key and colour', () => {
        const project = makeProject();
        findMatchingScalesForAllProjectChords(project);
        assert.equal(project.chords[0].scale1, 'D dorian');
        assert.equal(project.chords[2].scale1, 'C major');
        assert.ok(project.chords[1].scale1.startsWith('G '), project.chords[1].scale1);
        assert.ok(Array.isArray(project.chords[0].scale1Notes));
        assert.ok(project.chords[0].scale1Notes.length > 0);
    });

    it('syncs allocated trigger-map entries with the project chords', () => {
        const project = makeProject();
        globals.chordTriggerMap = { C3: project.chords[0] };
        findMatchingScalesForAllProjectChords(project);
        assert.equal(globals.chordTriggerMap.C3.scale1, 'D dorian');
        assert.deepEqual(globals.chordTriggerMap.C3.scale1Notes, project.chords[0].scale1Notes);
    });

    it('flattens the choices when the project colour is diatonic', () => {
        const project = makeProject();
        project.chords = [{ id: 1, name: 'Am7', chord: 'Am7', chordNotes: ['A3', 'C4', 'E4', 'G4'], scale1: '', scale2: '', scale3: '' }];
        project.options.colour = 'diatonic';
        findMatchingScalesForAllProjectChords(project);
        assert.equal(project.chords[0].scale1, 'A aeolian');
    });

});

describe('applyProjectKeySettings', () => {

    beforeEach(() => {
        document.broadcastEvent = () => { };
        globals.chordTriggerMap = {};
        globals.currentChordTriggerNote = undefined;
        globals.currentScaleFilter = 'scale1';
        globals.scaleFiltering.frozen = false;
        globals.scaleOverrideName = '';
        globals.scaleOverrideNotes = [];
        globals.projectKey = null;
    });

    it('saves the key and re-ranks the project in place', () => {
        const project = makeProject();
        project.options = {};
        globals.project = project;
        globals.chordTriggerMap = { C3: project.chords[0] };
        globals.currentChordTriggerNote = 'C3';

        const applied = applyProjectKeySettings({ tonic: 'C', type: 'major' });

        assert.equal(applied, true);
        assert.deepEqual(project.options.key, { tonic: 'C', type: 'major', source: 'user' });
        assert.equal(project.chords[0].scale1, 'D dorian');
        assert.equal(globals.chordTriggerMap.C3.scale1, 'D dorian');
        assert.equal(globals.projectKey.tonic, 'C');
        assert.equal(globals.projectKey.colour, 'jazz');
    });

    it('re-ranks when only the colour changes', () => {
        const project = makeProject();
        globals.project = project;
        globals.chordTriggerMap = {};

        applyProjectKeySettings({ colour: 'diatonic' });

        assert.equal(project.options.colour, 'diatonic');
        assert.equal(project.chords[0].scale1, 'D dorian'); // ii is dorian in both profiles
        assert.equal(project.chords[1].scale2 !== '', true);
    });

});

describe('key group edits persist to the project', () => {

    function makeGridProject() {
        const project = makeProject();
        project.songs = { default: { ids: [1, 2, 3], favourites: [], blacklist: [] } };
        return project;
    }

    beforeEach(() => {
        document.broadcastEvent = () => { };
        globals.chordTriggerMap = {};
        globals.currentChordTriggerNote = undefined;
        globals.currentScaleFilter = 'scale1';
        globals.scaleFiltering.frozen = false;
        globals.scaleOverrideName = '';
        globals.scaleOverrideNotes = [];
        globals.projectKey = null;
        globals.transpositionSemitones = 0;
    });

    it('writes a section key to the project chord, not just the grid clone', () => {
        const project = makeGridProject();
        globals.project = project;
        globals.chordTriggerMap = buildTriggerMap(project.chords, project.songs.default.ids, 7);
        const firstNote = Object.keys(globals.chordTriggerMap)[0];
        const gridChord = globals.chordTriggerMap[firstNote];
        // The grid holds a clone, so editing it directly would not persist.
        assert.notStrictEqual(gridChord, project.chords[0]);

        applyChordKeySettings(gridChord, { tonic: 'F', type: 'major' });

        const projectChord = project.chords.find((chord) => chord.id == gridChord.id);
        assert.deepEqual(projectChord.key, { tonic: 'F', type: 'major', source: 'user' });
        assert.deepEqual(globals.chordTriggerMap[firstNote].key, { tonic: 'F', type: 'major', source: 'user' });

        // Simulate a reload: rebuilding the grid from the project keeps the key.
        const rebuilt = buildTriggerMap(project.chords, project.songs.default.ids, 7);
        const rebuiltChord = Object.values(rebuilt).find((chord) => chord.id == gridChord.id);
        assert.deepEqual(rebuiltChord?.key, { tonic: 'F', type: 'major', source: 'user' });
    });

    it('clears a section key on the project chord when the key is removed', () => {
        const project = makeGridProject();
        globals.project = project;
        globals.chordTriggerMap = buildTriggerMap(project.chords, project.songs.default.ids, 7);
        const firstNote = Object.keys(globals.chordTriggerMap)[0];
        const gridChord = globals.chordTriggerMap[firstNote];

        applyChordKeySettings(gridChord, { tonic: 'F', type: 'major' });
        applyChordKeySettings(gridChord, null);

        assert.equal(project.chords.find((chord) => chord.id == gridChord.id).key, undefined);
        assert.equal(globals.chordTriggerMap[firstNote].key, undefined);
    });

    it('persists a key lock to the project chord', () => {
        const project = makeGridProject();
        globals.project = project;
        globals.chordTriggerMap = buildTriggerMap(project.chords, project.songs.default.ids, 7);
        const firstNote = Object.keys(globals.chordTriggerMap)[0];
        const gridChord = globals.chordTriggerMap[firstNote];

        applyChordKeyLocked(gridChord, true);

        assert.equal(project.chords.find((chord) => chord.id == gridChord.id).keyLocked, true);
        assert.equal(globals.chordTriggerMap[firstNote].keyLocked, true);
    });

});

describe('toggleSoloMode', () => {

    beforeEach(() => {
        document.broadcastEvent = () => { };
        globals.chordTriggerMap = {};
        globals.currentChordTriggerNote = undefined;
        globals.currentScaleFilter = 'scale1';
        globals.scaleFiltering.frozen = false;
        globals.scaleFiltering.keyModeActive = false;
        globals.scaleOverrideName = '';
        globals.scaleOverrideNotes = [];
        globals.projectKey = null;
    });

    it('flips the project solo mode on and off', () => {
        const project = makeProject();
        globals.project = project;
        globals.chordTriggerMap = { C3: project.chords[0] };
        globals.currentChordTriggerNote = 'C3';

        toggleSoloMode();
        assert.equal(globals.soloMode, 'key');
        assert.equal(project.options.soloMode, 'key');
        assert.equal(globals.scaleFiltering.keyModeActive, true);

        toggleSoloMode();
        assert.equal(globals.soloMode, 'chord');
        assert.equal(project.options.soloMode, 'chord');
    });

});
