// @ts-check

import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { candidatesToTriggerMapDumbDeprecated } from "../../src/lib/triggerMaps"
import { candidatesToTriggerMapSmart } from "../../src/lib/triggerMaps"
import { maxChordConfigs } from '../../src/lib/globals-config';
import { createDefaultMetaProjectConfig } from '../../src/lib/projectConfig';

/** @typedef {import("../../src/lib/typedefs").ChordConfig} ChordConfig */
/** @typedef {import("../../src/lib/typedefs").ChordTriggerMap} ChordTriggerMap */
/** @typedef {import("../../src/lib/typedefs").Project} Project */
/** @typedef {import("../../src/lib/typedefs").Chord} Chord */
/** @typedef {import("../../src/lib/typedefs").Song} Song */

describe('trigger maps - simple', () => {

    /** @type {Array<ChordConfig>} */
    const chordConfigs = [
        {
            "id": 1,
            "name": "G7 chord",
            "chord": "G7inversion2",
            chordNotes: [],
            "scale1": "g mixolydian",
            scaleNotesOfChord: [],

        },
        {
            "id": 2,
            "name": "A7 chord",
            "chord": "AM",
            chordNotes: [],
            "scale1": "a mixolydian",
            scaleNotesOfChord: [],
        }
    ]

    it('candidatesToTriggerMap', () => {
        /** @type {ChordTriggerMap} */
        const result = candidatesToTriggerMapDumbDeprecated(chordConfigs)

        assert.equal(Object.keys(result).length, 2);
        assert.equal(Object.keys(result)[0], 'C3');
        assert.equal(Object.keys(result)[1], 'D3');

        const chordConfig = result['C3']
        // console.log('chordConfig', chordConfig)

        assert.equal(chordConfig.id, 1);
        assert.equal(chordConfig.chord, 'G7inversion2');  // custom chord
        assert.deepEqual(chordConfig.chordNotes, ['D3', 'F3', 'G3', 'B3']);
        assert.equal(chordConfig.bass, 'D');
        assert.equal(chordConfig.bassNote, "D2");
        assert.equal(chordConfig.scale1, "g mixolydian");
        assert.equal(chordConfig.scale2, "");
        assert.equal(chordConfig.scale3, "");
        assert.deepEqual(chordConfig.scale1Notes, ['G', 'A', 'B', 'C', 'D', 'E', 'F']);
        assert.deepEqual(chordConfig.scale2Notes, []);
        assert.deepEqual(chordConfig.scale3Notes, []);
        assert.deepEqual(chordConfig.scaleNotesOfChord, ['D', 'F', 'G', 'B']);  // the notes of chord G7inversion2 incl. bass note
    });
});


describe('trigger maps - smart', () => {

    /** @type {Project} */
    let project = {
        name: 'Untitled',
        meta: createDefaultMetaProjectConfig(),
        options: {},
        chords: [
            {
                name: 'Chord 1 from midi',
                chord: 'Am#5',
                chordNotes: [],
                id: 0,
                scale1: 'A harmonic minor',
                scaleNotesOfChord: [],
            },
            {
                name: 'Chord 2 from midi',
                chord: 'FM',
                chordNotes: [],
                id: 1,
                scale1: 'F lydian',
                scale2: 'F major',
                scaleNotesOfChord: [],
            }
        ],
        songs: { default: { ids: [], favourites: [], blacklist: [] } }  // createDefaultSongs()
    }


    it('candidatesToTriggerMapSmart', () => {
        const chordConfigs = project.chords
        const maxChordConfigs = 7
        const song = project.songs['default']
        const allocateFavourites = true
        const sortIds = false
        let {chordTriggerMap, ids, statistics} = candidatesToTriggerMapSmart(chordConfigs, maxChordConfigs, song, allocateFavourites, sortIds)
        // console.log('triggerMap', chordTriggerMap)

        assert.equal(Object.keys(chordTriggerMap).length, 2);
        assert.deepEqual(ids.sort(), [0, 1].sort());

        assert.equal(Object.keys(chordTriggerMap)[0], 'C3');
        assert.equal(Object.keys(chordTriggerMap)[1], 'D3');


        // some random allocation is going on so cater for this
        assert.ok(chordTriggerMap['C3'].chord == 'Am#5' || chordTriggerMap['C3'].chord == 'FM')

        // grab the chord config for the 'Am#5' chord
        const chordConfig = (chordTriggerMap['C3'].chord == 'Am#5') ? chordTriggerMap['C3'] : chordTriggerMap['D3']
        // console.log('chordConfig', chordConfig)

        assert.equal(chordConfig.chord, 'Am#5');
        assert.deepEqual(chordConfig.chordNotes, ['A3', 'C4', 'F4']);
        assert.equal(chordConfig.bass, 'A');
        assert.equal(chordConfig.bassNote, "A2");
        assert.equal(chordConfig.scale1, "A harmonic minor");
        assert.equal(chordConfig.scale2, "A phrygian");  // used to be '' but now we auto-fill in scales
        assert.equal(chordConfig.scale3, "A aeolian");  // used to be '' but now we auto-fill in scales
        assert.deepEqual(chordConfig.scale1Notes, [ 'A',  'B', 'C', 'D',  'E', 'F', 'G#' ]);
        assert.notDeepEqual(chordConfig.scale2Notes, []);  // not empty
        assert.notDeepEqual(chordConfig.scale3Notes, []);  // not empty
        assert.deepEqual(chordConfig.scaleNotesOfChord, ['C', 'F', 'A']);

    });

});
