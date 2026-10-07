import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { applyProjectTempo } from '@/lib/boot-project.js'

function projectWithTempo(tempo) {
    return {
        name: 'test',
        chords: [],
        songs: { default: { ids: [], favourites: [], blacklist: [] } },
        options: {},
        chordSequences: { default: { mml: '', tempo } },
    }
}

describe('applyProjectTempo', () => {
    let previousProject
    let previousBpm

    beforeEach(() => {
        previousProject = globals.project
        previousBpm = globals.recording.bpm
    })

    afterEach(() => {
        globals.project = previousProject
        globals.recording.bpm = previousBpm
    })

    it('sets the global BPM from the stored song tempo', () => {
        globals.project = projectWithTempo(96)
        globals.recording.bpm = 120
        applyProjectTempo()
        assert.equal(globals.recording.bpm, 96)
    })

    it('leaves the global BPM alone when the project has no stored tempo', () => {
        globals.project = { name: 'test', chords: [], songs: {}, options: {} }
        globals.recording.bpm = 120
        applyProjectTempo()
        assert.equal(globals.recording.bpm, 120)
    })

    it('clamps out of range tempos to the supported range', () => {
        globals.project = projectWithTempo(5)
        applyProjectTempo()
        assert.equal(globals.recording.bpm, 40)
        globals.project = projectWithTempo(500)
        applyProjectTempo()
        assert.equal(globals.recording.bpm, 240)
    })

    it('ignores non-numeric tempos', () => {
        globals.project = projectWithTempo('fast')
        globals.recording.bpm = 120
        applyProjectTempo()
        assert.equal(globals.recording.bpm, 120)
    })
})
