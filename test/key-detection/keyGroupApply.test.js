import assert from 'assert';
import { applyGroupKey, applyDetectedGroups, alternativesFor, selectedAlternative } from '../../src/lib/keyGroupApply.js';
import { globals } from '../../src/lib/globals.js';

/*
 * Writing detected key groups onto the project. The manual Apply buttons and
 * the automatic mode share this code: the first group becomes the project key,
 * later groups become section keys, and locked chords are never touched. See
 * doco/MULTI-KEY.md.
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

function group(keyName, key, chords) {
    return { keyName, key, chords, alternatives: [{ keyName, key }] };
}

describe('keyGroupApply', () => {

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
    });

    it('sets the first group as the project key and later groups as sections', () => {
        const project = makeProject();
        globals.project = project;
        const chords = project.chords;
        const result = applyDetectedGroups([
            group('A minor', { tonic: 'A', type: 'minor', source: 'user' }, [chords[0], chords[1]]),
            group('E minor', { tonic: 'E', type: 'minor', source: 'user' }, [chords[2], chords[3]]),
        ]);

        assert.equal(result.applied, true);
        assert.deepEqual(project.options.key, { tonic: 'A', type: 'minor', source: 'detected' });
        assert.equal(chords[0].key, undefined);
        assert.equal(chords[1].key, undefined);
        assert.deepEqual(chords[2].key, { tonic: 'E', type: 'minor', source: 'detected' });
        assert.deepEqual(chords[3].key, { tonic: 'E', type: 'minor', source: 'detected' });
    });

    it('leaves locked chords alone, including the first group', () => {
        const project = makeProject();
        globals.project = project;
        const chords = project.chords;
        chords[0].key = { tonic: 'G', type: 'major', source: 'user' };
        chords[0].keyLocked = true;

        applyDetectedGroups([
            group('A minor', { tonic: 'A', type: 'minor', source: 'user' }, [chords[0], chords[1]]),
            group('E minor', { tonic: 'E', type: 'minor', source: 'user' }, [chords[2], chords[3]]),
        ]);

        assert.deepEqual(chords[0].key, { tonic: 'G', type: 'major', source: 'user' });
        assert.equal(chords[1].key, undefined);
    });

    it('clears a chord key when a group reads as the project key', () => {
        const project = makeProject();
        project.options.key = { tonic: 'C', type: 'major', source: 'user' };
        globals.project = project;
        const chords = project.chords;
        chords[0].key = { tonic: 'A', type: 'minor', source: 'user' };

        applyGroupKey(group('C major', { tonic: 'C', type: 'major', source: 'user' }, [chords[0]]));

        assert.equal(chords[0].key, undefined);
    });

    it('falls back to the group key when it carries no alternatives', () => {
        const g = { keyName: 'A minor', key: { tonic: 'A', type: 'minor' }, chords: [] };
        assert.equal(alternativesFor(g).length, 1);
        assert.equal(selectedAlternative(g).keyName, 'A minor');
    });

    it('does nothing when there are no groups', () => {
        const project = makeProject();
        globals.project = project;
        assert.deepEqual(applyDetectedGroups([]), { applied: false });
    });

});
