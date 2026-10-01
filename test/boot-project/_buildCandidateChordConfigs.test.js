// @ts-check

import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { _buildCandidateChordConfigs } from "../../src/lib/build-project"

/** @typedef {import("../../src/lib/typedefs").ChordConfig} ChordConfig */
/** @typedef {import("../../src/lib/typedefs").Chord} Chord */

describe('_buildCandidateChordConfigs', () => {

    /** @type {Array<Chord>} */
    const chords = [['A2', 'F3', 'A3', 'C4', 'F4', 'A4'], ['C2', 'C3', 'A3', 'F4']]

    it('basic', () => {
        const chordConfigs = _buildCandidateChordConfigs(chords)
        // console.log('chordConfigs', chordConfigs)

        assert.equal(Object.keys(chordConfigs).length, 2);

        assert.equal(chordConfigs[0].id, 0);
        assert.equal(chordConfigs[0].chord, 'Am#5');

        assert.equal(chordConfigs[1].id, 1);
        assert.equal(chordConfigs[1].chord, 'FM');
    });

});