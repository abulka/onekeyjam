import assert from 'assert';
import { buildChordSequenceTextFromGrid, gridChordSymbol, orderedGridChordConfigs } from "../../src/lib/gridChordsToSequenceText.js";
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
            chords: [makeConfig(1, 'E7', 'D'), makeConfig(2, 'Am')],
            songs: { default: { ids: [1, 2], favourites: [], blacklist: [] } },
        };
        assert.equal(buildChordSequenceTextFromGrid(project), 'E7/D Am');
        assert.equal(gridChordSymbol(project.chords[0]), 'E7/D');
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
            chords: [makeConfig(1, 'Dsus4'), makeConfig(2, 'Dmaj7'), makeConfig(3, 'E7', 'D')],
            songs: { default: { ids: [1, 2, 3], favourites: [], blacklist: [] } },
        };
        const text = buildChordSequenceTextFromGrid(project);
        const { entries, errors } = parseChordSequence(text);
        assert.deepEqual(errors, []);
        assert.deepEqual(entries.map(e => e.symbol), ['Dsus4', 'Dmaj7', 'E7/D']);
    });
});
