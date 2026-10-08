import assert from 'assert';
import { voiceChordSequence, voiceLeadingCost } from "../../src/lib/voiceChordSequence.js";
import { chordSymbolToNotesInversion } from "../../src/lib/chordSymbolToNotes.js";
import { parseChordSequence } from "../../src/lib/parseChordSequence.js";

function totalMovement(noteLists) {
    let total = 0;
    for (let i = 1; i < noteLists.length; i++)
        total += voiceLeadingCost(noteLists[i - 1], noteLists[i]);
    return total;
}

describe('voiceChordSequence example', () => {
    it('voices Dsus4 Dmaj7 C#min11 with notes for every chord', () => {
        const { entries } = parseChordSequence('Dsus4 Dmaj7 C#min11');
        const voiced = voiceChordSequence(entries);
        assert.equal(voiced.length, 3);
        for (const v of voiced)
            assert.ok(v.chordNotes.length > 0, `${v.chord} has notes`);
        // First chord with no anchor uses root position.
        assert.deepEqual(voiced[0].chordNotes, chordSymbolToNotesInversion('Dsus4', 0));
        assert.equal(voiced[0].inversion, 0);
    });

    it('moves less than naive root position stacking', () => {
        const { entries } = parseChordSequence('Dsus4 Dmaj7 C#m11');
        const voiced = voiceChordSequence(entries);
        const smooth = totalMovement(voiced.map(v => v.chordNotes));
        const naive = totalMovement(entries.map(e => chordSymbolToNotesInversion(e.chord, 0)));
        assert.ok(smooth <= naive, `smooth ${smooth} should beat naive ${naive}`);
    });

    it('anchors the first chord to the previous grid chord', () => {
        const { entries } = parseChordSequence('Dmaj7');
        const previousChordNotes = ['D3', 'F3', 'A3'];
        const voiced = voiceChordSequence(entries, { previousChordNotes });
        const anchored = voiceLeadingCost(previousChordNotes, voiced[0].chordNotes);
        const rootPosition = voiceLeadingCost(previousChordNotes, chordSymbolToNotesInversion('Dmaj7', 0));
        assert.ok(anchored <= rootPosition);
    });

    it('keeps an explicit slash bass alongside the voicing', () => {
        const { entries } = parseChordSequence('E7/D');
        const [voiced] = voiceChordSequence(entries);
        assert.equal(voiced.bass, 'D');
        assert.ok(voiced.chordNotes.length > 0);
    });
});
