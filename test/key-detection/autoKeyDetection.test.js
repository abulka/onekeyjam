import assert from 'assert';
import { globals } from '../../src/lib/globals.js';
import { buildTriggerMap } from '../../src/lib/triggerMaps.js';
import { detectKeysForLoad, detectKeysAfterEdit, describeAutoKey } from '../../src/lib/autoKeyDetection.js';

/*
 * Automatic key and multi-key detection. A freshly loaded song is left as
 * authored; the first grid edit re-detects the key groups in auto mode. Manual
 * mode never writes keys. See doco/MULTI-KEY.md.
 */

function makeProject() {
    return {
        name: 'two key areas',
        chords: [
            { id: 1, name: 'Am7', chord: 'Am7', chordNotes: ['A3', 'C4', 'E4', 'G4'], scale1: '', scale2: '', scale3: '' },
            { id: 2, name: 'Fmaj7', chord: 'Fmaj7', chordNotes: ['F3', 'A3', 'C4', 'E4'], scale1: '', scale2: '', scale3: '' },
            { id: 3, name: 'Em7', chord: 'Em7', chordNotes: ['E3', 'G3', 'B3', 'D4'], scale1: '', scale2: '', scale3: '' },
            { id: 4, name: 'Cmaj7', chord: 'Cmaj7', chordNotes: ['C3', 'E3', 'G3', 'B3'], scale1: '', scale2: '', scale3: '' },
        ],
        options: { colour: 'jazz' },
        songs: { default: { ids: [1, 2, 3, 4], favourites: [], blacklist: [] } },
    };
}

describe('autoKeyDetection', () => {

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
        globals.transpositionSemitones = 0;
        globals.keyDetectionMode = 'auto';
        globals.keyDetectionSensitivity = 'balanced';
    });

    it('leaves a freshly loaded song as authored', () => {
        const project = makeProject();
        project.options.key = { tonic: 'G', type: 'major', source: 'user' };
        globals.project = project;
        globals.chordTriggerMap = buildTriggerMap(project.chords, project.songs.default.ids, 7);

        detectKeysForLoad();

        assert.deepEqual(project.options.key, { tonic: 'G', type: 'major', source: 'user' });
        assert.equal(project.chords[0].key, undefined);
        assert.equal(project.chords[2].key, undefined);
    });

    it('detects and applies the key groups after a grid edit in auto mode', () => {
        const project = makeProject();
        globals.project = project;
        globals.chordTriggerMap = buildTriggerMap(project.chords, project.songs.default.ids, 7);

        detectKeysAfterEdit();

        assert.equal(project.options.key.tonic, 'A');
        assert.equal(project.options.key.type, 'minor');
        assert.equal(project.options.key.source, 'detected');
        assert.equal(project.chords[0].key, undefined);
        assert.deepEqual(project.chords[2].key, { tonic: 'E', type: 'minor', source: 'detected' });
        assert.deepEqual(project.chords[3].key, { tonic: 'E', type: 'minor', source: 'detected' });
    });

    it('does not write keys in manual mode', () => {
        const project = makeProject();
        globals.project = project;
        globals.chordTriggerMap = buildTriggerMap(project.chords, project.songs.default.ids, 7);
        globals.keyDetectionMode = 'manual';

        detectKeysAfterEdit();

        assert.equal(project.options.key, undefined);
        assert.equal(project.chords[0].key, undefined);
        assert.equal(project.chords[2].key, undefined);
    });

    it('applies more key groups at a higher sensitivity', () => {
        const project = makeChromaticProject();
        globals.project = project;
        globals.chordTriggerMap = buildTriggerMap(project.chords, project.songs.default.ids, 12);
        globals.keyDetectionSensitivity = 'eager';

        detectKeysAfterEdit();

        assert.equal(project.options.key.tonic, 'C');
        assert.equal(project.options.key.type, 'minor');
        assert.ok(project.chords.some((chord) => chord.key && chord.key.tonic === 'Db' && chord.key.type === 'minor'));
    });

});

// A chromatic progression: no single key explains most of its tones, so
// detection splits it once the sensitivity is raised. See doco/MULTI-KEY.md.
function makeChromaticProject() {    return {
        name: 'chromatic',
        chords: [
            { id: 1, name: 'Cm', chord: 'Cm', chordNotes: ['C3', 'Eb3', 'G3'], scale1: '', scale2: '', scale3: '' },
            { id: 2, name: 'Cm/ma7', chord: 'Cm/ma7', chordNotes: ['C3', 'Eb3', 'G3', 'B3'], scale1: '', scale2: '', scale3: '' },
            { id: 3, name: 'C#m13', chord: 'C#m13', chordNotes: ['C#3', 'E3', 'G#3', 'B3'], scale1: '', scale2: '', scale3: '' },
            { id: 4, name: 'Bdim7', chord: 'Bdim7', chordNotes: ['B3', 'D4', 'F4', 'Ab4'], scale1: '', scale2: '', scale3: '' },
            { id: 5, name: 'Gm/ma7', chord: 'Gm/ma7', chordNotes: ['G3', 'Bb3', 'D4', 'F#4'], scale1: '', scale2: '', scale3: '' },
            { id: 6, name: 'Gmaj9', chord: 'Gmaj9', chordNotes: ['G3', 'B3', 'D4', 'F#4', 'A4'], scale1: '', scale2: '', scale3: '' },
            { id: 7, name: 'Amaj9', chord: 'Amaj9', chordNotes: ['A3', 'C#4', 'E4', 'G#4', 'B4'], scale1: '', scale2: '', scale3: '' },
            { id: 8, name: 'Bmaj9', chord: 'Bmaj9', chordNotes: ['B3', 'D#4', 'F#4', 'A#4', 'C#5'], scale1: '', scale2: '', scale3: '' },
            { id: 9, name: 'D#m11', chord: 'D#m11', chordNotes: ['D#3', 'F#3', 'A#3', 'C#4', 'F4', 'G#4'], scale1: '', scale2: '', scale3: '' },
        ],
        options: { colour: 'jazz' },
        songs: { default: { ids: [1, 2, 3, 4, 5, 6, 7, 8, 9], favourites: [], blacklist: [] } },
    };
}

describe('describeAutoKey', () => {

    it('reports the auto status before any chords exist', () => {
        const description = describeAutoKey([]);
        assert.equal(description.label, 'auto');
        assert.ok(description.title.includes('Add chords'), description.title);
    });

    it('handles a missing group list', () => {
        assert.equal(describeAutoKey(undefined).label, 'auto');
    });

    it('names a single key area', () => {
        const description = describeAutoKey([
            { keyName: 'C major', key: { tonic: 'C', type: 'major' }, chords: [] },
        ], { tonic: 'C', type: 'major' });
        assert.equal(description.label, 'auto · 1 key area');
        assert.ok(description.title.includes('C major'), description.title);
    });

    it('names the project key and several areas', () => {
        const description = describeAutoKey([
            { keyName: 'C minor', key: { tonic: 'C', type: 'minor' }, chords: [] },
            { keyName: 'Db minor', key: { tonic: 'Db', type: 'minor' }, chords: [] },
        ], { tonic: 'C', type: 'minor' });
        assert.equal(description.label, 'auto · 2 key areas');
        assert.ok(description.title.includes('C minor'), description.title);
        assert.ok(description.title.includes('Manual'), description.title);
    });

    it('still names a project key that matches no area', () => {
        // A freshly loaded multi-key song keeps its authored key until the
        // first edit, so the project key may not be one of the areas shown.
        const description = describeAutoKey([
            { keyName: 'D minor', key: { tonic: 'D', type: 'minor' }, chords: [] },
        ], { tonic: 'Bb', type: 'major' });
        assert.equal(description.label, 'auto · 1 key area');
        assert.ok(description.title.includes('Bb major'), description.title);
    });

});
