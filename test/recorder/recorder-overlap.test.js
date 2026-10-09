import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    startRecording,
    stopRecording,
    clearTake,
    recordChordNoteOn,
    recordChordNoteOff,
} from '@/lib/midi/recorder.js'

// 120 BPM and 480 PPQ give one tick every 1/960 second.
const QUARTER_SECOND_IN_TICKS = 240

/**
 * Record two overlapping chords that share a note (E3), each with its own bass,
 * the way rolling from one chord trigger to the next would. The first chord is
 * released while the second is still held.
 */
function recordTwoOverlappingChords() {
    startRecording(0)

    // Chord A (trigger C3): C3, E3, bass C2
    recordChordNoteOn('C3', 0.8, { now: 0, playedNote: 'C3', role: 'chord' })
    recordChordNoteOn('E3', 0.8, { now: 0, playedNote: 'C3', role: 'chord' })
    recordChordNoteOn('C2', 0.8, { now: 0, playedNote: 'C3', role: 'bass' })

    // Chord B (trigger D3) starts while A is still held: E3 is shared, A3 and
    // the A1 bass are new.
    recordChordNoteOn('E3', 0.8, { now: 0.25, playedNote: 'D3', role: 'chord' })
    recordChordNoteOn('A3', 0.8, { now: 0.25, playedNote: 'D3', role: 'chord' })
    recordChordNoteOn('A1', 0.8, { now: 0.25, playedNote: 'D3', role: 'bass' })

    // Release chord A first, then chord B.
    recordChordNoteOff('C3', { now: 0.5, playedNote: 'C3' })
    recordChordNoteOff('E3', { now: 0.5, playedNote: 'C3' })
    recordChordNoteOff('C2', { now: 0.5, playedNote: 'C3' })
    recordChordNoteOff('E3', { now: 0.75, playedNote: 'D3' })
    recordChordNoteOff('A3', { now: 0.75, playedNote: 'D3' })
    recordChordNoteOff('A1', { now: 0.75, playedNote: 'D3' })

    stopRecording(0.75)
}

describe('recorder overlapping chords', () => {
    beforeEach(() => {
        clearTake()
        globals.recording.bpm = 120
        globals.recording.ppq = 480
        globals.recording.suppressCapture = false
    })

    afterEach(() => {
        clearTake()
    })

    it('records a shared note once per chord instead of merging them', () => {
        recordTwoOverlappingChords()

        const e3 = globals.recording.take.chords.filter(note => note.midi === 52)
        assert.equal(e3.length, 2, 'E3 should be recorded for both chords')

        const fromChordA = e3.find(note => note.playedMidi === 48)  // C3
        const fromChordB = e3.find(note => note.playedMidi === 50)  // D3
        assert.ok(fromChordA, 'E3 of the first chord should keep its trigger')
        assert.ok(fromChordB, 'E3 of the second chord should keep its trigger')

        assert.equal(fromChordA.startTick, 0)
        assert.equal(fromChordA.durationTicks, QUARTER_SECOND_IN_TICKS * 2)
        assert.equal(fromChordB.startTick, QUARTER_SECOND_IN_TICKS)
        assert.equal(fromChordB.durationTicks, QUARTER_SECOND_IN_TICKS * 2)
    })

    it('keeps the second chord bass even while the first chord is still held', () => {
        recordTwoOverlappingChords()

        const bassA = globals.recording.take.chords.find(note => note.midi === 36)  // C2
        const bassB = globals.recording.take.chords.find(note => note.midi === 33)  // A1
        assert.ok(bassA, 'first chord bass should be recorded')
        assert.ok(bassB, 'second chord bass should be recorded')
        assert.equal(bassA.role, 'bass')
        assert.equal(bassB.role, 'bass')
        assert.equal(bassB.startTick, QUARTER_SECOND_IN_TICKS)
    })
})
