import assert from 'assert';
import {
    resolveChordKey,
    setChordKey,
    clearChordKey,
    keyGroupsForProject,
    projectKeyName,
} from '../../src/lib/projectKey.js';
import { findMatchingScalesForAllProjectChords } from '../../src/lib/findMatchingScales.js';
import { getProjectForPersistence } from '../../src/lib/projectSerialize.js';
import { emergencyRepairProject } from '../../src/lib/emergencyRepairProject.js';
import { globals } from '../../src/lib/globals.js';

/*
 * Per-chord section keys let one project hold several key signature groups.
 * A chord's own key wins over the project key; a chord without one follows the
 * project key as before. See doco/MUSIC-THEORY.md and doco/DATA-MODEL.md.
 */

function chord(overrides = {}) {
    return {
        id: 1,
        name: 'Dm7',
        chord: 'Dm7',
        chordNotes: ['D3', 'F3', 'A3', 'C4'],
        scale1: '',
        scale2: '',
        scale3: '',
        ...overrides,
    };
}

describe('resolveChordKey', () => {

    it('uses the chord key when it has one', () => {
        const project = { name: 'x', chords: [], options: { key: { tonic: 'C', type: 'major' } } };
        const config = chord({ key: { tonic: 'F', type: 'major', source: 'user' } });
        assert.equal(projectKeyName(resolveChordKey(project, config)), 'F major');
    });

    it('falls back to the project key when the chord has none', () => {
        const project = { name: 'x', chords: [], options: { key: { tonic: 'C', type: 'major' } } };
        assert.equal(projectKeyName(resolveChordKey(project, chord())), 'C major');
    });

    it('carries the project colour into the chord key context', () => {
        const project = { name: 'x', chords: [], options: { key: { tonic: 'C', type: 'major' }, colour: 'diatonic' } };
        const config = chord({ key: { tonic: 'F', type: 'major' } });
        assert.equal(resolveChordKey(project, config)?.colour, 'diatonic');
    });

    it('still detects when neither the chord nor the project declares a key', () => {
        const project = {
            name: 'ii-V-I',
            chords: [chord({ chord: 'Dm7' }), chord({ id: 2, chord: 'G7' }), chord({ id: 3, chord: 'Cmaj7' })],
            options: {},
        };
        assert.equal(projectKeyName(resolveChordKey(project, project.chords[0])), 'C major');
    });

});

describe('setChordKey and clearChordKey', () => {

    it('writes a normalised key and removes it again', () => {
        const config = chord();
        const written = setChordKey(config, { tonic: 'Eb', type: 'major' });
        assert.deepEqual(written, { tonic: 'Eb', type: 'major', source: 'user' });
        assert.deepEqual(config.key, written);
        clearChordKey(config);
        assert.equal(config.key, undefined);
    });

    it('ignores an invalid key', () => {
        const config = chord();
        assert.equal(setChordKey(config, { tonic: 'H', type: 'major' }), undefined);
        assert.equal(config.key, undefined);
    });

});

describe('findMatchingScalesForAllProjectChords with section keys', () => {

    it('ranks each chord in its own key', () => {
        const project = {
            name: 'two keys',
            chords: [
                chord({ id: 1, chord: 'Cmaj7', chordNotes: ['C3', 'E3', 'G3', 'B3'] }),
                chord({ id: 2, chord: 'Cmaj7', chordNotes: ['C3', 'E3', 'G3', 'B3'], key: { tonic: 'G', type: 'major' } }),
            ],
            options: { key: { tonic: 'C', type: 'major' }, colour: 'jazz' },
        };
        findMatchingScalesForAllProjectChords(project);
        // Cmaj7 is the tonic in C major, but has a lydian colour as IV in G.
        assert.equal(project.chords[0].scale1, 'C major');
        assert.equal(project.chords[1].scale1, 'C lydian');
    });

});

describe('keyGroupsForProject', () => {

    it('merges adjacent chords that share a key and splits on a change', () => {
        const project = { name: 'x', chords: [], options: { key: { tonic: 'C', type: 'major' } } };
        const chords = [
            chord({ id: 1, key: { tonic: 'C', type: 'major' } }),
            chord({ id: 2 }),
            chord({ id: 3, key: { tonic: 'Eb', type: 'major' } }),
            chord({ id: 4, key: { tonic: 'Eb', type: 'major' } }),
        ];
        const groups = keyGroupsForProject(project, chords);
        assert.deepEqual(groups.map((group) => group.keyName), ['C major', 'Eb major']);
        assert.deepEqual(groups.map((group) => group.chords.map((c) => c.id)), [[1, 2], [3, 4]]);
    });

});

describe('globals.getChordKey and getActiveKey', () => {

    afterEach(() => {
        globals.project = null;
        globals.projectKey = null;
        globals.transpositionSemitones = 0;
        globals.chordTriggerMap = {};
        globals.currentChordTriggerNote = undefined;
    });

    it('applies the live transposition to a chord key', () => {
        globals.project = { name: 'x', chords: [], options: {} };
        globals.projectKey = { tonic: 'C', type: 'major', source: 'user' };
        const config = chord({ key: { tonic: 'C', type: 'major' } });
        globals.transpositionSemitones = 2;
        assert.equal(projectKeyName(globals.getChordKey(config)), 'D major');
    });

    it('falls back to the project key for an unkeyed chord', () => {
        globals.project = { name: 'x', chords: [], options: {} };
        globals.projectKey = { tonic: 'F', type: 'major', source: 'user' };
        assert.equal(projectKeyName(globals.getChordKey(chord())), 'F major');
    });

    it('getActiveKey follows the current trigger chord', () => {
        globals.project = { name: 'x', chords: [], options: {} };
        globals.projectKey = { tonic: 'C', type: 'major', source: 'user' };
        const keyed = chord({ id: 7, key: { tonic: 'Eb', type: 'major' } });
        globals.chordTriggerMap = { C3: keyed };
        globals.currentChordTriggerNote = 'C3';
        assert.equal(projectKeyName(globals.getActiveKey()), 'Eb major');
    });

});

describe('persistence round-trip', () => {

    it('keeps a valid chord key and drops an invalid one on load', () => {
        const project = {
            name: 'round trip',
            chords: [
                chord({ id: 1, key: { tonic: 'Ab', type: 'major', source: 'user' } }),
                chord({ id: 2, chord: 'G7', chordNotes: ['G3', 'B3', 'D4', 'F4'], key: { tonic: 'H', type: 'major' } }),
            ],
            options: { key: { tonic: 'C', type: 'major' } },
        };
        const reloaded = JSON.parse(getProjectForPersistence(project, false));
        emergencyRepairProject(reloaded);
        assert.deepEqual(reloaded.chords[0].key, { tonic: 'Ab', type: 'major', source: 'user' });
        assert.equal(reloaded.chords[1].key, undefined);
    });

    it('keeps a true key lock and drops a falsy one on load', () => {
        const project = {
            name: 'lock round trip',
            chords: [
                chord({ id: 1, keyLocked: true }),
                chord({ id: 2, chord: 'G7', chordNotes: ['G3', 'B3', 'D4', 'F4'], keyLocked: false }),
            ],
            options: { key: { tonic: 'C', type: 'major' } },
        };
        const reloaded = JSON.parse(getProjectForPersistence(project, false));
        emergencyRepairProject(reloaded);
        assert.equal(reloaded.chords[0].keyLocked, true);
        assert.equal(reloaded.chords[1].keyLocked, undefined);
    });

});
