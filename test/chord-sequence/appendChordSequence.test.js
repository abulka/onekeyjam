import assert from 'assert';
import { globals } from "../../src/lib/globals.js";
import { parseChordSequence } from "../../src/lib/parseChordSequence.js";
import { voiceChordSequence } from "../../src/lib/voiceChordSequence.js";
import { appendChordSequence } from "../../src/lib/appendChordSequence.js";

function snapshotGlobals() {
    return {
        project: JSON.parse(JSON.stringify(globals.project)),
        chordTriggerMap: JSON.parse(JSON.stringify(globals.chordTriggerMap)),
        maxChordConfigs: globals.maxChordConfigs,
        projectKey: globals.projectKey ? JSON.parse(JSON.stringify(globals.projectKey)) : globals.projectKey,
    };
}

function restoreGlobals(snapshot) {
    globals.project = snapshot.project;
    globals.chordTriggerMap = snapshot.chordTriggerMap;
    globals.maxChordConfigs = snapshot.maxChordConfigs;
    globals.projectKey = snapshot.projectKey;
}

describe('appendChordSequence', () => {
    it('appends three chords and extends ids and trigger map', () => {
        const snapshot = snapshotGlobals();
        try {
            globals.project = {
                name: 'Sequence Test',
                chords: [],
                options: {},
                songs: { default: { ids: [], favourites: [], blacklist: [] } },
            };
            globals.chordTriggerMap = {};
            globals.maxChordConfigs = 0;

            const { entries } = parseChordSequence('Dsus4 Dmaj7 C#min11');
            const voiced = voiceChordSequence(entries);
            const beforeCount = globals.project.chords.length;
            const beforeMapSize = Object.keys(globals.chordTriggerMap).length;

            const { addedIds, addedCount } = appendChordSequence(voiced);

            assert.equal(addedCount, 3);
            assert.deepEqual(addedIds, [1, 2, 3]);
            assert.equal(globals.project.chords.length, beforeCount + 3);
            assert.equal(Object.keys(globals.chordTriggerMap).length, beforeMapSize + 3);
            assert.deepEqual(globals.project.songs.default.ids.slice(-3), [1, 2, 3]);
            assert.deepEqual(globals.project.chords.map(c => c.chord), ['Dsus4', 'Dmaj7', 'C#m11']);
            for (const config of globals.project.chords.slice(-3)) {
                assert.ok(config.chordNotes.length > 0);
                assert.ok(config.scale1);
            }
        } finally {
            restoreGlobals(snapshot);
        }
    });

    it('does nothing for an empty sequence', () => {
        const snapshot = snapshotGlobals();
        try {
            const before = JSON.stringify(globals.project.chords);
            const result = appendChordSequence([]);
            assert.deepEqual(result, { addedIds: [], addedCount: 0 });
            assert.equal(JSON.stringify(globals.project.chords), before);
        } finally {
            restoreGlobals(snapshot);
        }
    });
});
