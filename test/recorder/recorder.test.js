import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    startRecording,
    stopRecording,
    clearTake,
    persistTake,
    restoreTake,
    recordChordNoteOn,
    recordChordNoteOff,
    recordJamNoteOn,
    recordJamNoteOff,
} from '@/lib/midi/recorder.js'

// 120 BPM and 480 PPQ give one tick every 1/960 second, so 0.5s == 480 ticks.
const HALF_SECOND_IN_TICKS = 480

const STORAGE_KEY = 'onekeyjam.latestTake'

function fakeStorage() {
    const map = new Map()
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key),
    }
}

describe('midi recorder', () => {
    beforeEach(() => {
        clearTake()
        globals.recording.bpm = 120
        globals.recording.ppq = 480
    })

    afterEach(() => {
        clearTake()
    })

    it('records a chord note with its start tick, duration and velocity', () => {
        startRecording(0)
        recordChordNoteOn('C4', 0.9, { now: 0 })
        recordChordNoteOff('C4', { now: 0.5 })
        stopRecording(0.5)

        assert.equal(globals.recording.take.chords.length, 1)
        const note = globals.recording.take.chords[0]
        assert.equal(note.midi, 60)
        assert.equal(note.startTick, 0)
        assert.equal(note.durationTicks, HALF_SECOND_IN_TICKS)
        assert.equal(note.velocity, 0.9)
        assert.equal(globals.recording.take.jam.length, 0)
    })

    it('puts jam notes on their own track', () => {
        startRecording(0)
        recordJamNoteOn('E5', 0.5, { now: 0.25 })
        recordJamNoteOff('E5', { now: 0.5 })
        stopRecording(0.5)

        assert.equal(globals.recording.take.chords.length, 0)
        assert.equal(globals.recording.take.jam.length, 1)
        const note = globals.recording.take.jam[0]
        assert.equal(note.midi, 76)
        assert.equal(note.startTick, Math.round(0.25 * 960))
        assert.equal(note.durationTicks, Math.round(0.25 * 960))
    })

    it('records the played key alongside the sounding note', () => {
        startRecording(0)
        recordChordNoteOn('E4', 0.9, { now: 0, playedNote: 'C3' })
        recordChordNoteOff('E4', { now: 0.5 })
        stopRecording(0.5)

        const note = globals.recording.take.chords[0]
        assert.equal(note.midi, 64)      // E4 sounds
        assert.equal(note.playedMidi, 48) // triggered by C3
    })

    it('finalises notes still held down when recording stops', () => {
        startRecording(0)
        recordChordNoteOn('G3', 0.7, { now: 0 })
        stopRecording(1)

        assert.equal(globals.recording.take.chords.length, 1)
        assert.equal(globals.recording.take.chords[0].startTick, 0)
        assert.equal(globals.recording.take.chords[0].durationTicks, 960)
    })

    it('closes out a note that is retriggered while still held', () => {
        startRecording(0)
        recordJamNoteOn('C4', 0.5, { now: 0 })
        recordJamNoteOn('C4', 0.5, { now: 0.25 })
        recordJamNoteOff('C4', { now: 0.5 })
        stopRecording(0.5)

        assert.equal(globals.recording.take.jam.length, 2)
        assert.equal(globals.recording.take.jam[0].startTick, 0)
        assert.equal(globals.recording.take.jam[0].durationTicks, Math.round(0.25 * 960))
        assert.equal(globals.recording.take.jam[1].startTick, Math.round(0.25 * 960))
        assert.equal(globals.recording.take.jam[1].durationTicks, Math.round(0.25 * 960))
    })

    it('ignores notes when not recording', () => {
        recordChordNoteOn('C4', 0.9, { now: 0 })
        assert.equal(globals.recording.take.chords.length, 0)
        assert.equal(globals.recording.isRecording, false)
    })

    it('flags a take as exportable only when it contains notes', () => {
        startRecording(0)
        stopRecording(1)
        assert.equal(globals.recording.hasTake, false)

        startRecording(0)
        recordJamNoteOn('C4', 0.5, { now: 0 })
        stopRecording(0.5)
        assert.equal(globals.recording.hasTake, true)
    })

    it('clears the take', () => {
        startRecording(0)
        recordJamNoteOn('C4', 0.5, { now: 0 })
        stopRecording(0.5)
        clearTake()

        assert.equal(globals.recording.take.chords.length, 0)
        assert.equal(globals.recording.take.jam.length, 0)
        assert.equal(globals.recording.hasTake, false)
        assert.equal(globals.recording.isRecording, false)
    })

    it('persists and restores the latest take', () => {
        const storage = fakeStorage()
        startRecording(0)
        recordChordNoteOn('C4', 0.8, { now: 0, playedNote: 'C3' })
        recordChordNoteOff('C4', { now: 0.5 })
        recordJamNoteOn('C5', 0.6, { now: 0.25 })
        stopRecording(1)
        persistTake(storage)

        clearTake()
        assert.equal(globals.recording.hasTake, false)

        assert.equal(restoreTake(storage), true)
        assert.equal(globals.recording.hasTake, true)
        assert.equal(globals.recording.take.chords.length, 1)
        assert.equal(globals.recording.take.jam.length, 1)
        assert.equal(globals.recording.take.chords[0].midi, 60)
        assert.equal(globals.recording.take.chords[0].playedMidi, 48)
        assert.ok(globals.recording.playback.durationSec > 0)
    })

    it('removes the persisted take when the take is cleared', () => {
        const storage = fakeStorage()
        startRecording(0)
        recordJamNoteOn('C4', 0.5, { now: 0 })
        stopRecording(0.5)
        persistTake(storage)
        assert.ok(storage.getItem(STORAGE_KEY))

        clearTake()
        persistTake(storage)
        assert.equal(storage.getItem(STORAGE_KEY), null)
    })

    it('ignores missing or corrupt persisted data', () => {
        const storage = fakeStorage()
        assert.equal(restoreTake(storage), false)

        storage.setItem(STORAGE_KEY, '{not valid json')
        assert.equal(restoreTake(storage), false)

        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, chords: [], jam: [] }))
        assert.equal(restoreTake(storage), false)
    })
})
