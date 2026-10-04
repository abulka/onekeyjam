import assert from 'assert';
import { globals } from '../../src/lib/globals.js';
import { findMatchingScalesForAllProjectChords } from '../../src/lib/findMatchingScales.js';
import { applyProjectKeySettings } from '../../src/lib/projectScaleSettings.js';

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
