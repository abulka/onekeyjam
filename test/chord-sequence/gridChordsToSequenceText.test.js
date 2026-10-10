import assert from 'assert';
import { buildChordSequenceTextFromGrid, gridChordSymbol, orderedGridChordConfigs, orderedLiveGridChordConfigs } from "../../src/lib/gridChordsToSequenceText.js";
import { parseChordSequence } from "../../src/lib/parseChordSequence.js";

function makeConfig(id, chord, bass = "") {
    return { id, name: `${chord} test`, chord, bass, chordNotes: [], scale1: "c major" };
}

describe('gridChordsToSequenceText', () => {
    it('follows the trigger order from songs.default.ids', () => {
        const project = {
            chords: [makeConfig(1, 'Dm7'), makeConfig(2, 'G7'), makeConfig(3, 'Cmaj7')],
            songs: { default: { ids: [3, 1], favourites: [], blacklist: [] } },
        };
        assert.deepEqual(orderedGridChordConfigs(project).map(c => c.id), [3, 1]);
        assert.equal(buildChordSequenceTextFromGrid(project), 'Cmaj7 Dm7');
    });

    it('includes the slash bass when present', () => {
        const project = {
            chords: [makeConfig(1, 'C', 'D'), makeConfig(2, 'Am')],
            songs: { default: { ids: [1, 2], favourites: [], blacklist: [] } },
        };
        assert.equal(buildChordSequenceTextFromGrid(project), 'C/D Am');
        assert.equal(gridChordSymbol(project.chords[0]), 'C/D');
    });

    it('skips missing ids and unnamed chords', () => {
        const project = {
            chords: [makeConfig(1, 'Dm7'), makeConfig(2, ''), makeConfig(3, 'G7')],
            songs: { default: { ids: [1, 99, 2, 3], favourites: [], blacklist: [] } },
        };
        assert.equal(buildChordSequenceTextFromGrid(project), 'Dm7 G7');
    });

    it('falls back to pool order when the arrangement is empty', () => {
        const project = {
            chords: [makeConfig(1, 'Dm7'), makeConfig(2, 'G7')],
            songs: { default: { ids: [], favourites: [], blacklist: [] } },
        };
        assert.equal(buildChordSequenceTextFromGrid(project), 'Dm7 G7');
    });

    it('returns an empty string for an empty grid', () => {
        assert.equal(buildChordSequenceTextFromGrid({ chords: [], songs: { default: { ids: [], favourites: [], blacklist: [] } } }), '');
        assert.equal(buildChordSequenceTextFromGrid({}), '');
    });

    it('generated text re-parses without errors', () => {
        const project = {
            chords: [makeConfig(1, 'Dsus4'), makeConfig(2, 'Dmaj7'), makeConfig(3, 'C', 'D')],
            songs: { default: { ids: [1, 2, 3], favourites: [], blacklist: [] } },
        };
        const text = buildChordSequenceTextFromGrid(project);
        const { entries, errors } = parseChordSequence(text);
        assert.deepEqual(errors, []);
        assert.deepEqual(entries.map(e => e.symbol), ['Dsus4', 'Dmaj7', 'C/D']);
    });

    it('omits a slash bass that duplicates the root', () => {
        assert.equal(gridChordSymbol(makeConfig(1, 'Dmaj7', 'D')), 'Dmaj7');
        assert.equal(gridChordSymbol(makeConfig(1, 'Dsus4', 'D')), 'Dsus4');
        assert.equal(gridChordSymbol(makeConfig(8, 'CMadd9', 'C')), 'CMadd9');
        assert.equal(gridChordSymbol(makeConfig(3, 'C#m11', 'C#')), 'C#m11');
    });

    it('keeps a slash bass outside the chord', () => {
        assert.equal(gridChordSymbol(makeConfig(1, 'C', 'D')), 'C/D');
        assert.equal(gridChordSymbol(makeConfig(1, 'E7', 'A')), 'E7/A');
        assert.equal(gridChordSymbol(makeConfig(9, 'Am', 'F#')), 'Am/F#');
    });

    it('omits a slash bass that is part of the chord (automatic inversion)', () => {
        assert.equal(gridChordSymbol(makeConfig(1, 'Dm', 'A')), 'Dm');
        assert.equal(gridChordSymbol(makeConfig(1, 'Em', 'G')), 'Em');
        assert.equal(gridChordSymbol(makeConfig(1, 'Bb', 'F')), 'Bb');
        assert.equal(gridChordSymbol(makeConfig(1, 'Eb', 'G')), 'Eb');
        assert.equal(gridChordSymbol(makeConfig(1, 'A', 'E')), 'A');
        assert.equal(gridChordSymbol(makeConfig(1, 'B', 'D#')), 'B');
        assert.equal(gridChordSymbol(makeConfig(1, 'E7', 'D')), 'E7');
        assert.equal(gridChordSymbol(makeConfig(9, 'Amadd9', 'C')), 'Amadd9');
    });

    it('normalises automatic inversions from a voiced sequence', () => {
        const project = {
            chords: [
                makeConfig(1, 'Am', 'A'),
                makeConfig(2, 'Dm', 'A'),
                makeConfig(3, 'Em', 'G'),
                makeConfig(4, 'Bb', 'F'),
                makeConfig(5, 'Eb', 'G'),
                makeConfig(6, 'F', 'F'),
                makeConfig(7, 'E', 'E'),
                makeConfig(8, 'A', 'E'),
                makeConfig(9, 'B', 'D#'),
            ],
            songs: { default: { ids: [1, 2, 3, 4, 5, 6, 7, 8, 9], favourites: [], blacklist: [] } },
        };
        assert.equal(
            buildChordSequenceTextFromGrid(project, {}),
            'Am Dm Em Bb Eb F E A B'
        );
    });

    it('treats enharmonic bass spellings as the same pitch', () => {
        assert.equal(gridChordSymbol(makeConfig(1, 'C#m11', 'Db')), 'C#m11');
        assert.equal(gridChordSymbol(makeConfig(1, 'Bb7', 'A#')), 'Bb7');
    });

    it('prefers live transposed trigger values for arranged ids', () => {
        const project = {
            chords: [makeConfig(8, 'CMadd9', 'C'), makeConfig(4, 'Dsus4', 'D')],
            songs: { default: { ids: [8, 4], favourites: [], blacklist: [] } },
        };
        const liveMap = {
            C3: makeConfig(8, 'BMadd9', 'B'),
            E3: makeConfig(4, 'C#sus4', 'C#'),
        };
        assert.deepEqual(orderedLiveGridChordConfigs(project, liveMap).map(c => c.chord), ['BMadd9', 'C#sus4']);
        assert.equal(buildChordSequenceTextFromGrid(project, liveMap), 'BMadd9 C#sus4');
    });

    it('falls back to stored chords for hidden arrangement tails', () => {
        const project = {
            chords: [makeConfig(8, 'CMadd9', 'C'), makeConfig(4, 'Dsus4', 'D')],
            songs: { default: { ids: [8, 4], favourites: [], blacklist: [] } },
        };
        const liveMap = {
            C3: makeConfig(8, 'BMadd9', 'B'),
        };
        assert.equal(buildChordSequenceTextFromGrid(project, liveMap), 'BMadd9 Dsus4');
    });

    it('reproduces the reported project without redundant slashes', () => {
        const project = {
            chords: [
                makeConfig(2, 'Dmaj7', 'D'),
                makeConfig(3, 'C#m11', 'C#'),
                makeConfig(4, 'Dsus4', 'D'),
                makeConfig(8, 'CMadd9', 'C'),
                makeConfig(9, 'Amadd9', 'C'),
            ],
            songs: { default: { ids: [8, 9, 4, 2, 3], favourites: [], blacklist: [] } },
        };
        assert.equal(
            buildChordSequenceTextFromGrid(project, {}),
            'CMadd9 Amadd9 Dsus4 Dmaj7 C#m11'
        );
    });

    it('reproduces the transposed grid from the screenshot', () => {
        const project = {
            chords: [
                makeConfig(2, 'Dmaj7', 'D'),
                makeConfig(3, 'C#m11', 'C#'),
                makeConfig(4, 'Dsus4', 'D'),
                makeConfig(8, 'CMadd9', 'C'),
                makeConfig(9, 'Amadd9', 'C'),
            ],
            songs: { default: { ids: [8, 9, 4, 2, 3], favourites: [], blacklist: [] } },
        };
        const liveMap = {
            C3: makeConfig(8, 'BMadd9', 'B'),
            D3: makeConfig(9, 'G#madd9', 'B'),
            E3: makeConfig(4, 'C#sus4', 'C#'),
            F3: makeConfig(2, 'C#maj7', 'C#'),
            G3: makeConfig(3, 'Cm11', 'C'),
        };
        const text = buildChordSequenceTextFromGrid(project, liveMap);
        assert.equal(text, 'BMadd9 G#madd9 C#sus4 C#maj7 Cm11');
        const { errors } = parseChordSequence(text);
        assert.deepEqual(errors, []);
    });
});
