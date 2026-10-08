import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildTriggerMap } from '@/lib/triggerMaps.js'
import { demoSequenceMml } from '@/lib/demo-pattern.js'

function generatedLikeProject(chordCount) {
    const chords = Array.from({ length: chordCount }, (_, i) => ({
        id: i + 1,
        name: `Chord${i + 1}`,
        chord: 'C',
        chordNotes: [],
        scale1: 'C major',
        scaleNotesOfChord: [],
    }))
    const ids = chords.map((chord) => chord.id)
    return {
        name: 'generated-like',
        chords,
        songs: { default: { ids, favourites: [...ids], blacklist: [] } },
    }
}

describe('generated songs allocate triggers in definition order', () => {
    let previousKeyboard

    beforeEach(() => {
        previousKeyboard = { ...globals.keyboard }
        globals.keyboard = { name: 'test', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
    })

    afterEach(() => {
        globals.keyboard = previousKeyboard
    })

    it('assigns the eight grid chords to C3..B3 then C4 in order', () => {
        const project = generatedLikeProject(8)
        const chordTriggerMap = buildTriggerMap(project.chords, project.songs.default.ids, 8)
        assert.deepEqual(Object.keys(chordTriggerMap), [
            'C3',
            'D3',
            'E3',
            'F3',
            'G3',
            'A3',
            'B3',
            'C4',
        ])
        assert.deepEqual(
            Object.values(chordTriggerMap).map((config) => config.id),
            [1, 2, 3, 4, 5, 6, 7, 8],
        )
    })

    it('builds a demo pattern with one note per allocated trigger', () => {
        // Eight bars over eight trigger positions: the pattern order matches
        // the allocation order above, so bar N triggers chord N.
        const triggers = Array.from({ length: 8 }, (_, index) => ({ index, bars: 1 }))
        assert.equal(demoSequenceMml(triggers), 't120o4c1d1e1f1g1a1b1o5c1')
    })
})
