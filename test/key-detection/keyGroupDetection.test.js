import assert from 'assert';
import { suggestKeyGroups, resolveSegmentPenalty, mergeAdjacentGroups } from '../../src/lib/keyGroupDetection.js';

/*
 * Experimental key group detection. It searches for the partition of the
 * arranged chords that best explains the music as a few key groups, scoring
 * pitch coverage plus function cues (tonic starts, V-I cadences and parallel
 * sequences). Relative keys tie on coverage, so every group carries
 * alternatives; anchors (chords with an explicit key) are never crossed.
 */

function chords(...symbols) {
    return symbols.map((chord, index) => ({ id: index + 1, chord }));
}

function keyNames(groups) {
    return groups.map((group) => group.keyName);
}

describe('suggestKeyGroups', () => {

    it('finds the two minor keys in two parallel i-VI pairs', () => {
        const groups = suggestKeyGroups({ options: {} }, chords('Am7', 'Fmaj7', 'Em7', 'Cmaj7'));
        assert.deepEqual(keyNames(groups), ['A minor', 'E minor']);
        assert.deepEqual(groups[0].chords.map((chord) => chord.id), [1, 2]);
        assert.deepEqual(groups[1].chords.map((chord) => chord.id), [3, 4]);
        // C major covers all four chords, so it is offered as an alternative.
        assert.ok(groups[0].alternatives.some((alternative) => alternative.keyName === 'C major'));
    });

    it('finds the two keys of a two-key etude', () => {
        const groups = suggestKeyGroups({ options: {} }, chords('Cmaj7', 'Am7', 'Dm7', 'G7', 'Ebmaj7', 'Cm7', 'Fm7', 'Bb7'));
        assert.deepEqual(keyNames(groups), ['C major', 'Eb major']);
        assert.deepEqual(groups[0].chords.map((chord) => chord.id), [1, 2, 3, 4]);
        assert.deepEqual(groups[1].chords.map((chord) => chord.id), [5, 6, 7, 8]);
    });

    it('keeps a ii-V-I in one key', () => {
        const groups = suggestKeyGroups({ options: {} }, chords('Dm7', 'G7', 'Cmaj7', 'Cmaj7'));
        assert.deepEqual(keyNames(groups), ['C major']);
    });

    it('keeps a two-bar I-vi-ii-V loop in one key', () => {
        const groups = suggestKeyGroups({ options: {} }, chords('Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'));
        assert.deepEqual(keyNames(groups), ['C major']);
    });

    it('finds the four key areas of All the Things grid rows', () => {
        const groups = suggestKeyGroups({ options: {} }, chords(
            'Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7',
            'Dm7', 'G7', 'Cmaj7',
            'Am7', 'D7', 'Gmaj7',
            'F#m7b5', 'B7', 'Emaj7',
        ));
        assert.deepEqual(keyNames(groups), ['Ab major', 'C major', 'G major', 'E major']);
    });

    it('ignores locks and existing keys when detecting', () => {
        // A lock (even one holding a wrong key) never splits the run or biases
        // the reading; locks only gate the UI's Apply action.
        const chordsWithLock = [
            { id: 1, chord: 'Am7' },
            { id: 2, chord: 'Fmaj7' },
            { id: 3, chord: 'Em7', keyLocked: true, key: { tonic: 'Eb', type: 'major', source: 'user' } },
            { id: 4, chord: 'Cmaj7' },
        ];
        const groups = suggestKeyGroups({ options: {} }, chordsWithLock);
        assert.deepEqual(groups.map((group) => group.keyName), ['A minor', 'E minor']);
        assert.deepEqual(groups.map((group) => group.chords.map((chord) => chord.id)), [[1, 2], [3, 4]]);
    });

    it('analyses a chord that already has a key', () => {
        const keyed = [
            { id: 1, chord: 'Am7' },
            { id: 2, chord: 'Fmaj7' },
            { id: 3, chord: 'Em7', key: { tonic: 'E', type: 'minor', source: 'user' } },
            { id: 4, chord: 'Cmaj7' },
        ];
        const groups = suggestKeyGroups({ options: {} }, keyed);
        assert.deepEqual(groups.map((group) => group.keyName), ['A minor', 'E minor']);
        assert.deepEqual(groups.map((group) => group.chords.map((chord) => chord.id)), [[1, 2], [3, 4]]);
    });

    it('reports an ambiguous reading when the top keys tie', () => {
        // Am7, Fmaj7, Em7 and Cmaj7 all fit C major and A minor equally.
        const groups = suggestKeyGroups({ options: {} }, chords('Am7', 'Fmaj7', 'Em7', 'Cmaj7'));
        assert.ok(groups[0].ambiguous);
        assert.ok(groups[0].alternatives.length >= 2);
    });

    it('gives a single chord one group with alternatives', () => {
        const groups = suggestKeyGroups({ options: {} }, chords('Am7'));
        assert.equal(groups.length, 1);
        assert.ok(groups[0].alternatives.length >= 1);
    });

    it('parses a suggested key into a usable project key', () => {
        const groups = suggestKeyGroups({ options: {} }, chords(
            'Fm7', 'Bbm7', 'Eb7', 'Abmaj7',
            'Dm7', 'G7', 'Cmaj7', 'Cmaj7',
        ));
        const cMajor = groups.find((group) => group.keyName === 'C major');
        assert.deepEqual(cMajor?.key, { tonic: 'C', type: 'major', source: 'user' });
    });

});

describe('keyGroupDetection - sensitivity', () => {

    // A chromatic progression where no single key explains more than about
    // half the chord tones, so the adaptive penalty lets it split.
    const chromatic = chords('Cm', 'Cm/ma7', 'C#m13', 'Bdim7', 'Gm/ma7', 'Gmaj9', 'Amaj9', 'Bmaj9', 'D#m11');

    it('keeps a chromatic progression in one key when conservative', () => {
        const groups = suggestKeyGroups({ options: {} }, chromatic, { sensitivity: 'conservative' });
        assert.deepEqual(keyNames(groups), ['C minor']);
    });

    it('splits a chromatic progression in the balanced default', () => {
        const groups = suggestKeyGroups({ options: {} }, chromatic);
        assert.deepEqual(keyNames(groups), ['C minor', 'Db minor']);
    });

    it('splits a chromatic progression further when eager', () => {
        const groups = suggestKeyGroups({ options: {} }, chromatic, { sensitivity: 'eager' });
        assert.deepEqual(keyNames(groups), ['C minor', 'Db minor', 'G major', 'B major']);
    });

    it('keeps a plain ii-V-I whole at every sensitivity', () => {
        const tonal = chords('Dm7', 'G7', 'Cmaj7', 'Cmaj7');
        for (const sensitivity of ['conservative', 'balanced', 'eager'])
            assert.deepEqual(keyNames(suggestKeyGroups({ options: {} }, tonal, { sensitivity })), ['C major']);
    });

    it('resolves the segment penalty from the sensitivity', () => {
        assert.equal(resolveSegmentPenalty(chromatic, { sensitivity: 'conservative' }), 2.8);
        assert.equal(resolveSegmentPenalty(chromatic, { sensitivity: 'balanced' }), 2.0);
        assert.equal(resolveSegmentPenalty(chromatic, { sensitivity: 'eager' }), 1.2);
        // An explicit numeric penalty always wins.
        assert.equal(resolveSegmentPenalty(chromatic, { segmentPenalty: 5 }), 5);
    });

    it('never reports two adjacent groups in the same key', () => {
        for (const sensitivity of ['conservative', 'balanced', 'eager']) {
            const names = keyNames(suggestKeyGroups({ options: {} }, chords(
                'Cmaj7', 'Am7', 'Dm7', 'G7', 'Ebmaj7', 'Cm7', 'Fm7', 'Bb7',
            ), { sensitivity }));
            for (let i = 1; i < names.length; i++)
                assert.notEqual(names[i], names[i - 1]);
        }
    });

    it('merges adjacent groups that resolved to the same key', () => {
        const groups = [
            { keyName: 'C major', key: { tonic: 'C', type: 'major' }, chords: [{ id: 1, chord: 'Cmaj7' }], alternatives: [], ambiguous: false, score: 1 },
            { keyName: 'C major', key: { tonic: 'C', type: 'major' }, chords: [{ id: 2, chord: 'Am7' }], alternatives: [], ambiguous: false, score: 1 },
            { keyName: 'G major', key: { tonic: 'G', type: 'major' }, chords: [{ id: 3, chord: 'Gmaj7' }], alternatives: [], ambiguous: false, score: 1 },
        ];
        const merged = mergeAdjacentGroups(groups);
        assert.deepEqual(merged.map((group) => group.keyName), ['C major', 'G major']);
        assert.deepEqual(merged[0].chords.map((chord) => chord.id), [1, 2]);
        assert.ok(merged[0].alternatives.some((alternative) => alternative.keyName === 'C major'));
    });

});

describe('keyGroupDetection - classic modulations', () => {

    function groupsOf(text, options) {
        const symbols = text.split(/\s+/).filter(Boolean);
        return keyNames(suggestKeyGroups({ options: {} }, chords(...symbols), options));
    }

    it('finds the cycle-of-fourths key areas in the Rhythm Changes bridge', () => {
        assert.deepEqual(groupsOf('D7 G7 C7 F7 Bb7 Eb7 Ab7 Db7'),
            ['G major', 'F major', 'Eb major', 'Db major']);
    });

    it('finds the two key areas of Blue Bossa', () => {
        assert.deepEqual(groupsOf('Cm7 Fm7 Dm7b5 G7 Cm7 Fm7 Dm7b5 G7 Ebm7 Ab7 Dbmaj7 Dbmaj7'),
            ['C minor', 'Db major']);
    });

    it('finds the modulation in The Girl from Ipanema', () => {
        assert.deepEqual(groupsOf('Fmaj7 G7 Gm7 Fmaj7 Fmaj7 G7 Gm7 Fmaj7 Gbmaj7 Ab7 Abm7 Gbmaj7 Gbmaj7 Ab7 Abm7 Gbmaj7'),
            ['F major', 'Gb major']);
    });

});
