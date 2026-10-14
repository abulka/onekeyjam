import assert from 'assert'
import { newProject } from '@/lib/boot-project.js'
import { globals } from '@/lib/globals.js'
import { startRecording, stopRecording, recordChordNoteOn, recordChordNoteOff } from '@/lib/midi/recorder.js'

// A new project is a blank slate: the previous take is global (it lives in
// globals.recording and localStorage, not the project), so New Project has to
// clear it explicitly. Loading an existing project keeps the take.
describe('newProject clears the take', () => {
    const STORAGE_KEY = 'onekeyjam.latestTake'
    let savedBroadcast

    beforeEach(() => {
        savedBroadcast = document.broadcastEvent
        document.broadcastEvent = () => {}
        globals.recording.take = { chords: [], jam: [] }
        globals.recording.held = { chords: {}, jam: {} }
        globals.recording.isRecording = false
        globals.recording.hasTake = false
    })

    afterEach(() => {
        document.broadcastEvent = savedBroadcast
    })

    function recordATake() {
        startRecording(0)
        recordChordNoteOn('C3', 0.8, { now: 0, playedNote: 'C3', role: 'bass' })
        recordChordNoteOff('C3', { now: 0.5, playedNote: 'C3' })
        stopRecording(0.5)
    }

    it('discards the previous take and its saved copy', () => {
        recordATake()
        assert.equal(globals.recording.hasTake, true)
        assert.ok(globals.recording.take.chords.length > 0)

        newProject()

        assert.equal(globals.recording.hasTake, false)
        assert.deepEqual(globals.recording.take, { chords: [], jam: [] })
        assert.equal(localStorage.getItem(STORAGE_KEY), null)
    })

    it('creates an empty project that still carries the demo pattern', () => {
        newProject()
        assert.deepEqual(globals.project.chords, [])
        assert.match(globals.project.chordSequences.default.mml, /[a-g]/i)
    })
})
