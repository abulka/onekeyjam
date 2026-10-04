import assert from 'assert';
import {
    normalizeKey,
    normalizeColour,
    projectKeyName,
    projectKeyNotes,
    projectKeyPitchClasses,
    projectColour,
    setProjectColour,
    declaredProjectKey,
    setProjectKey,
    clearProjectKey,
    detectProjectKey,
    resolveProjectKey,
} from '../../src/lib/projectKey.js';

/*
 * The project key model: options.key = { tonic, type, source }. Type is a
 * Tonal scale type, so modes such as dorian are supported. See
 * doco/MUSIC-THEORY.md.
 */

describe('projectKey - normalisation', () => {

    it('accepts major and minor and normalises aeolian to minor', () => {
        assert.deepEqual(normalizeKey({ tonic: 'C', type: 'major' }), { tonic: 'C', type: 'major', source: 'user' });
        assert.deepEqual(normalizeKey({ tonic: 'C', type: 'minor' }), { tonic: 'C', type: 'minor', source: 'user' });
        assert.deepEqual(normalizeKey({ tonic: 'C', type: 'aeolian' }), { tonic: 'C', type: 'minor', source: 'user' });
    });

    it('accepts modes', () => {
        assert.deepEqual(normalizeKey({ tonic: 'D', type: 'dorian' }), { tonic: 'D', type: 'dorian', source: 'user' });
    });

    it('rejects unknown keys', () => {
        assert.equal(normalizeKey({ tonic: 'H', type: 'major' }), undefined);
        assert.equal(normalizeKey({ tonic: 'C', type: 'nonsense' }), undefined);
        assert.equal(normalizeKey({}), undefined);
        assert.equal(normalizeKey(undefined), undefined);
    });

    it('keeps a valid source and defaults anything else to user', () => {
        assert.equal(normalizeKey({ tonic: 'C', type: 'major', source: 'detected' })?.source, 'detected');
        assert.equal(normalizeKey({ tonic: 'C', type: 'major', source: 'nonsense' })?.source, 'user');
    });

    it('exposes name, notes and pitch classes', () => {
        const key = { tonic: 'C', type: 'major', source: 'user' };
        assert.equal(projectKeyName(key), 'C major');
        assert.deepEqual(projectKeyNotes(key), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
        assert.deepEqual([...projectKeyPitchClasses(key)].sort((a, b) => a - b), [0, 2, 4, 5, 7, 9, 11]);
    });

});

describe('projectKey - declared and detected', () => {

    const cMajorTwoFiveOne = {
        name: 'ii-V-I in C',
        chords: [
            { chord: 'Dm7', chordNotes: ['D3', 'F3', 'A3', 'C4'] },
            { chord: 'G7', chordNotes: ['G3', 'B3', 'D4', 'F4'] },
            { chord: 'Cmaj7', chordNotes: ['C3', 'E3', 'G3', 'B3'] },
        ],
        options: {},
    };

    it('reads a declared key from options', () => {
        const project = { ...cMajorTwoFiveOne, options: { key: { tonic: 'C', type: 'minor', source: 'user' } } };
        assert.deepEqual(declaredProjectKey(project), { tonic: 'C', type: 'minor', source: 'user' });
    });

    it('detects a key from the chords when none is declared', () => {
        const detected = detectProjectKey(cMajorTwoFiveOne);
        assert.equal(detected?.tonic, 'C');
        assert.equal(detected?.type, 'major');
        assert.equal(detected?.source, 'detected');
    });

    it('prefers the declared key over detection', () => {
        const project = { ...cMajorTwoFiveOne, options: { key: { tonic: 'D', type: 'dorian', source: 'user' } } };
        assert.deepEqual(resolveProjectKey(project), { tonic: 'D', type: 'dorian', source: 'user', colour: 'jazz' });
    });

    it('falls back to detection when the declared key is invalid', () => {
        const project = { ...cMajorTwoFiveOne, options: { key: { tonic: 'H', type: 'major' } } };
        assert.equal(resolveProjectKey(project)?.type, 'major');
        assert.equal(resolveProjectKey(project)?.source, 'detected');
    });

    it('sets and clears a key in place', () => {
        const project = { ...cMajorTwoFiveOne, options: {} };
        const written = setProjectKey(project, { tonic: 'F', type: 'minor' }, 'detected');
        assert.deepEqual(written, { tonic: 'F', type: 'minor', source: 'detected' });
        assert.deepEqual(declaredProjectKey(project), written);
        clearProjectKey(project);
        assert.equal(declaredProjectKey(project), undefined);
    });

    it('returns undefined for a project with no chords', () => {
        assert.equal(detectProjectKey({ name: 'empty', chords: [], options: {} }), undefined);
        assert.equal(resolveProjectKey({ name: 'empty', chords: [], options: {} }), undefined);
    });

});

describe('projectKey - colour preference', () => {

    it('normalises colours and defaults to jazz', () => {
        assert.equal(normalizeColour('diatonic'), 'diatonic');
        assert.equal(normalizeColour('jazz'), 'jazz');
        assert.equal(normalizeColour('adventurous'), 'adventurous');
        assert.equal(normalizeColour('nonsense'), 'jazz');
        assert.equal(normalizeColour(undefined), 'jazz');
    });

    it('reads and sets the project colour', () => {
        const project = { name: 'x', chords: [], options: {} };
        assert.equal(projectColour(project), 'jazz');
        assert.equal(setProjectColour(project, 'adventurous'), 'adventurous');
        assert.equal(projectColour(project), 'adventurous');
    });

    it('carries the colour in the resolved key context', () => {
        const project = {
            name: 'ii-V-I in C',
            chords: [{ chord: 'Cmaj7', chordNotes: ['C3', 'E3', 'G3', 'B3'] }],
            options: { key: { tonic: 'C', type: 'major' }, colour: 'diatonic' },
        };
        assert.equal(resolveProjectKey(project)?.colour, 'diatonic');
    });

});
