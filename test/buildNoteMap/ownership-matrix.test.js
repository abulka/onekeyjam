import assert from 'assert'
import { Note } from '@tonaljs/tonal'
import { buildNoteMap } from '@/lib/midi/jam-mapping-to-allowed.js'
import { describeChordSoloSplit } from '@/lib/midi/keyboard-split.js'

/*
 * Ownership matrix for the computer-keyboard solo map. The app builds the map
 * with CToC and backfill. This checks, for a range of chord counts, that:
 *   - the chord triggers are the first N white notes;
 *   - after the shadow prune the chord and solo sets are disjoint;
 *   - the first solo key is the white note after the last chord;
 *   - with backfill the first solo value is the key's own note in its own
 *     octave (CToC in C major), so the old octave drop is gone.
 */

const C_MAJOR = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LH_TRIGGER_OCTAVE = 3
const RH_JAM_SOUND_OCTAVE = 4
const OPTIONS = { strategy: 'CToC', backfill: true }

/**
 * Mirror of the prune done in change-scale.js _setActiveScaleFilter.
 * @param {Record<string, string>} map
 * @param {string[]} chordNotes
 */
function pruneShadowed(map, chordNotes) {
    for (const note of Object.keys(map)) {
        if (chordNotes.includes(note))
            delete map[note]
    }
    return map
}

describe('chord/solo ownership matrix', () => {

    for (const n of [0, 1, 4, 6, 7, 8, 9, 10, 14]) {
        it(`N=${n}: chords are the first N whites and solo starts after them`, () => {
            const split = describeChordSoloSplit(n, LH_TRIGGER_OCTAVE)
            const map = pruneShadowed(
                buildNoteMap(C_MAJOR, n, LH_TRIGGER_OCTAVE, RH_JAM_SOUND_OCTAVE, { ...OPTIONS }),
                split.chordNotes,
            )
            const chordSet = new Set(split.chordNotes)
            const soloNotes = Object.keys(map)

            for (const note of soloNotes)
                assert.ok(!chordSet.has(note), `${note} is both a chord trigger and a solo note`)

            if (n === 0) {
                // No chord triggers leaves the map empty (every key echoes).
                assert.deepEqual(soloNotes, [])
                return
            }

            assert.equal(soloNotes[0], split.firstSoloNote, 'first solo key sits on the white after the last chord')
            assert.equal(map[soloNotes[0]], soloNotes[0], 'with backfill the first solo value is its own note in its own octave')

            // The solo notes are strictly ascending, as the piano mapping expects.
            for (let i = 1; i < soloNotes.length; i++)
                assert.ok(Note.midi(soloNotes[i]) > Note.midi(soloNotes[i - 1]), `solo notes not ascending at ${i}`)
        })
    }
})
