// @ts-check

import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { buildProject } from "../../src/lib/build-project"

/** @typedef {import("../../src/lib/typedefs").ChordConfig} ChordConfig */
/** @typedef {import("../../src/lib/typedefs").ChordTriggerMap} ChordTriggerMap */
/** @typedef {import("../../src/lib/typedefs").Project} Project */
/** @typedef {import("../../src/lib/typedefs").Chord} Chord */

describe('buildProject', () => {

    /** @type {Array<Chord>} */
    const chords = [['A2', 'F3', 'A3', 'C4', 'F4', 'A4'], ['C2', 'C3', 'A3', 'F4']]

    it('simple', () => {
        /** @type {Project} */
        let project = buildProject(chords)
        // console.log('project', project)

        assert.equal(Object.keys(project.chords).length, 2);

        // assert.equal(Object.keys(result)[0], 'C3');
        // const chordConfig = result['C3']
        // console.log('chordConfig', chordConfig)
        // assert.equal(chordConfig.id, 1);
        // assert.deepEqual(chordConfig.chordNotes, ['D3', 'F3', 'G3', 'B3']);
        // assert.equal(chordConfig.bass, 'D');
        // assert.equal(chordConfig.bassNote, "D3");
        // assert.equal(chordConfig.scale1, "g mixolydian");
        // assert.equal(chordConfig.scale2, "");
        // assert.equal(chordConfig.scale3, "");
        // assert.deepEqual(chordConfig.scale1Notes, ['G', 'A', 'B', 'C', 'D', 'E', 'F']);
        // assert.deepEqual(chordConfig.scale2Notes, []);
        // assert.deepEqual(chordConfig.scale3Notes, []);
    });

});