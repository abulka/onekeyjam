import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    startRecording,
    stopRecording,
    clearTake,
    recordChordNoteOn,
    recordChordNoteOff,
    recordJamNoteOn,
    recordJamNoteOff,
} from '@/lib/midi/recorder.js'

// 120 BPM and 480 PPQ give one tick every 1/960 second, so 0.5s == 480 ticks.
const HALF_SECOND_IN_TICKS = 480

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
        recordChordNoteOn('C4', 0.9, 0)
        recordChordNoteOff('C4', 0.5)
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
        recordJamNoteOn('E5', 0.5, 0.25)
        recordJamNoteOff('E5', 0.5)
        stopRecording(0.5)

        assert.equal(globals.recording.take.chords.length, 0)
        assert.equal(globals.recording.take.jam.length, 1)
        const note = globals.recording.take.jam[0]
        assert.equal(note.midi, 76)
        assert.equal(note.startTick, Math.round(0.25 * 960))
        assert.equal(note.durationTicks, Math.round(0.25 * 960))
    })

    it('finalises notes still held down when recording stops', () => {
        startRecording(0)
        recordChordNoteOn('G3', 0.7, 0)
        stopRecording(1)

        assert.equal(globals.recording.take.chords.length, 1)
        assert.equal(globals.recording.take.chords[0].startTick, 0)
        assert.equal(globals.recording.take.chords[0].durationTicks, 960)
    })

    it('closes out a note that is retriggered while still held', () => {
        startRecording(0)
        recordJamNoteOn('C4', 0.5, 0)
        recordJamNoteOn('C4', 0.5, 0.25)
        recordJamNoteOff('C4', 0.5)
        stopRecording(0.5)

        assert.equal(globals.recording.take.jam.length, 2)
        assert.equal(globals.recording.take.jam[0].startTick, 0)
        assert.equal(globals.recording.take.jam[0].durationTicks, Math.round(0.25 * 960))
        assert.equal(globals.recording.take.jam[1].startTick, Math.round(0.25 * 960))
        assert.equal(globals.recording.take.jam[1].durationTicks, Math.round(0.25 * 960))
    })

    it('ignores notes when not recording', () => {        recordChordNoteOn('C4', 0.9, 0)
        assert.equal(globals.recording.take.chords.length, 0)
        assert.equal(globals.recording.isRecording, false)
    })

    it('flags a take as exportable only when it contains notes', () => {
        startRecording(0)
        stopRecording(1)
        assert.equal(globals.recording.hasTake, false)

        startRecording(0)
        recordJamNoteOn('C4', 0.5, 0)
        stopRecording(0.5)
        assert.equal(globals.recording.hasTake, true)
    })

    it('clears the take', () => {
        startRecording(0)
        recordJamNoteOn('C4', 0.5, 0)
        stopRecording(0.5)
        clearTake()

        assert.equal(globals.recording.take.chords.length, 0)
        assert.equal(globals.recording.take.jam.length, 0)
        assert.equal(globals.recording.hasTake, false)
        assert.equal(globals.recording.isRecording, false)
    })
})
