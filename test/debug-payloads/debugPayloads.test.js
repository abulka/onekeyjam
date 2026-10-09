import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { takeDebugJson, gridChordsDebugJson, projectDebugJson } from '@/lib/debugPayloads.js'

describe('debug payloads', () => {
    it('serialises a take as pretty JSON with both tracks', () => {
        const json = takeDebugJson({
            bpm: 100,
            ppq: 480,
            take: {
                chords: [{ midi: 60, startTick: 0, durationTicks: 480, velocity: 0.8 }],
                jam: [{ midi: 72, startTick: 240, durationTicks: 240, velocity: 0.5 }],
            },
        })
        const parsed = JSON.parse(json)
        assert.equal(parsed.bpm, 100)
        assert.equal(parsed.ppq, 480)
        assert.equal(parsed.chords.length, 1)
        assert.equal(parsed.jam[0].midi, 72)
        // Pretty output, so it pastes readably.
        assert.ok(json.includes('\n'))
    })

    it('lists the grid chords in trigger order', () => {
        const json = gridChordsDebugJson({
            'C3': { id: 1, chord: 'Cmaj7', chordNotes: ['C3', 'E3', 'G3', 'B3'], bass: 'C2', bassNote: 'C2' },
            'D3': { id: 2, chord: 'Dm7', chordNotes: ['D3', 'F3', 'A3', 'C4'], bass: 'D2', bassNote: 'D2' },
        })
        const parsed = JSON.parse(json)
        assert.equal(parsed.length, 2)
        assert.equal(parsed[0].trigger, 'C3')
        assert.equal(parsed[0].chord, 'Cmaj7')
        assert.deepEqual(parsed[0].chordNotes, ['C3', 'E3', 'G3', 'B3'])
        assert.equal(parsed[1].trigger, 'D3')
        assert.equal(parsed[1].bassNote, 'D2')
    })

    it('handles no grid chords', () => {
        assert.equal(JSON.parse(gridChordsDebugJson({})).length, 0)
    })

    it('copies the project config as real JSON, not a quoted string', () => {
        const original = globals.project
        globals.project = {
            name: 'debug test',
            chords: [{ id: 1, name: 'C', chord: 'C', chordNotes: ['C3', 'E3', 'G3'], bass: 'C', bassNote: 'C2' }],
            options: { gridRows: 1 },
            songs: { default: { ids: [1], favourites: [], blacklist: [] } },
            chordSequences: {},
        }
        try {
            const json = projectDebugJson()
            assert.equal(json[0], '{', 'the payload should be JSON, not an escaped JSON string')
            const parsed = JSON.parse(json)
            assert.equal(parsed.name, 'debug test')
            assert.equal(parsed.chords[0].chord, 'C')
        }
        finally {
            globals.project = original
        }
    })
})
