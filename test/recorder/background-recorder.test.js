import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    clearTake,
    captureTakeFromBackground,
    recordChordNoteOn,
    recordChordNoteOff,
    recordJamNoteOn,
    clearFlashback,
} from '@/lib/midi/recorder.js'
import {
    recordBackgroundNoteOn,
    recordBackgroundNoteOff,
    captureBufferedTake,
    clearBackgroundCapture,
    backgroundNoteCount,
    DEFAULT_BACKGROUND_SILENCE_SEC,
} from '@/lib/midi/background-recorder.js'

// 120 BPM and 480 PPQ give one tick every 1/960 second, so 1s == 960 ticks.
const SECOND_IN_TICKS = 960

describe('background recorder', () => {
    beforeEach(() => {
        clearTake()
        globals.recording.bpm = 120
        globals.recording.ppq = 480
        globals.recording.suppressCapture = false
        globals.recording.background.enabled = true
        globals.recording.background.windowSec = 120
        globals.recording.background.silenceSec = DEFAULT_BACKGROUND_SILENCE_SEC
    })

    afterEach(() => {
        vi.useRealTimers()
        clearTake()
        globals.recording.background.enabled = true
        globals.recording.background.windowSec = 120
        globals.recording.background.silenceSec = DEFAULT_BACKGROUND_SILENCE_SEC
    })

    it('buffers notes even though recording was never started', () => {
        recordChordNoteOn('C4', 0.8, { now: 0 })
        recordChordNoteOff('C4', { now: 0.5 })

        assert.equal(globals.recording.isRecording, false)
        assert.equal(globals.recording.take.chords.length, 0)
        assert.equal(backgroundNoteCount(), 1)
        assert.equal(globals.recording.background.available, true)
    })

    it('captures buffered notes as take notes with ticks', () => {
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 10)
        recordBackgroundNoteOff('chords', 'C4', 10.5)
        recordBackgroundNoteOn('jam', 'E5', 0.5, 'D5', 10.25)
        recordBackgroundNoteOff('jam', 'E5', 10.5, 'D5')

        const take = captureBufferedTake({ now: 10.5, windowSec: 120 })
        assert.ok(take)
        assert.equal(take.chords.length, 1)
        assert.equal(take.jam.length, 1)
        assert.equal(take.chords[0].midi, 60)
        assert.equal(take.chords[0].durationTicks, Math.round(0.5 * SECOND_IN_TICKS))
        // Leading silence trimmed: first note starts at tick 0.
        assert.equal(take.chords[0].startTick, 0)
        assert.equal(take.jam[0].midi, 76)
        assert.equal(take.jam[0].playedMidi, 74)
        assert.equal(take.jam[0].startTick, Math.round(0.25 * SECOND_IN_TICKS))
    })

    it('drops notes that fall outside the capture window', () => {
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        recordBackgroundNoteOff('chords', 'C4', 1)
        recordBackgroundNoteOn('chords', 'D4', 0.8, undefined, 100)
        recordBackgroundNoteOff('chords', 'D4', 101)

        const take = captureBufferedTake({ now: 101, windowSec: 10 })
        assert.ok(take)
        assert.equal(take.chords.length, 1)
        assert.equal(take.chords[0].midi, 62)
    })

    it('closes notes that are still held when the capture happens', () => {
        recordBackgroundNoteOn('jam', 'G4', 0.7, undefined, 5)
        const take = captureBufferedTake({ now: 6, windowSec: 120 })

        assert.ok(take)
        assert.equal(take.jam.length, 1)
        assert.equal(take.jam[0].durationTicks, SECOND_IN_TICKS)
    })

    it('closes an earlier note when the same note is retriggered', () => {
        recordBackgroundNoteOn('jam', 'C4', 0.5, undefined, 0)
        recordBackgroundNoteOn('jam', 'C4', 0.5, undefined, 0.25)
        recordBackgroundNoteOff('jam', 'C4', 0.5)

        const take = captureBufferedTake({ now: 0.5, windowSec: 120 })
        assert.ok(take)
        assert.equal(take.jam.length, 2)
        assert.equal(take.jam[0].startTick, 0)
        assert.equal(take.jam[0].durationTicks, Math.round(0.25 * SECOND_IN_TICKS))
        assert.equal(take.jam[1].startTick, Math.round(0.25 * SECOND_IN_TICKS))
    })

    it('keeps a zero-length note with a one-tick minimum', () => {
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 5)
        recordBackgroundNoteOff('chords', 'C4', 5)

        const take = captureBufferedTake({ now: 5, windowSec: 120 })
        assert.ok(take)
        assert.equal(take.chords.length, 1)
        assert.equal(take.chords[0].durationTicks, 1)
    })

    it('captures nothing when background capture is disabled', () => {
        globals.recording.background.enabled = false
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        recordBackgroundNoteOff('chords', 'C4', 1)

        assert.equal(backgroundNoteCount(), 0)
        assert.equal(captureBufferedTake({ now: 1, windowSec: 120 }), null)
    })

    it('leaves the buffer alone while capture is suppressed', () => {
        globals.recording.suppressCapture = true
        recordChordNoteOn('C4', 0.8, { now: 0 })
        recordChordNoteOff('C4', { now: 0.5 })
        globals.recording.suppressCapture = false

        assert.equal(backgroundNoteCount(), 0)
    })

    it('can clear the buffer', () => {
        recordJamNoteOn('C4', 0.5, { now: 0 })
        assert.equal(backgroundNoteCount(), 1)
        clearBackgroundCapture()
        assert.equal(backgroundNoteCount(), 0)
        assert.equal(globals.recording.background.available, false)
    })

    it('turns the buffer into the current take and clears it', () => {
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        recordBackgroundNoteOff('chords', 'C4', 0.5)

        const result = captureTakeFromBackground(120, 0.5)
        assert.equal(result.ok, true)
        assert.equal(result.noteCount, 1)
        assert.equal(globals.recording.hasTake, true)
        assert.equal(globals.recording.take.chords.length, 1)
        assert.ok(globals.recording.playback.durationSec > 0)
        // The buffer is consumed by the capture.
        assert.equal(backgroundNoteCount(), 0)
    })

    it('reports empty when nothing is buffered', () => {
        const result = captureTakeFromBackground(120, 0)
        assert.equal(result.ok, false)
        assert.equal(result.reason, 'empty')
    })

    it('refuses to capture while recording is running', () => {
        globals.recording.isRecording = true
        const result = captureTakeFromBackground(120, 0)
        assert.equal(result.ok, false)
        assert.equal(result.reason, 'recording')
        globals.recording.isRecording = false
    })

    it('clearing the take also clears the hidden buffer', () => {
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        assert.equal(backgroundNoteCount(), 1)
        clearTake()
        assert.equal(backgroundNoteCount(), 0)
    })

    it('clears the hidden buffer when a project is loaded', () => {
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        assert.ok(backgroundNoteCount() > 0)

        document.dispatchEvent(new Event('project-loaded'))

        assert.equal(backgroundNoteCount(), 0)
        assert.equal(globals.recording.background.available, false)
    })

    it('clearFlashback empties the buffer but keeps the current take', () => {
        // Build a take from the first note.
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        recordBackgroundNoteOff('chords', 'C4', 0.5)
        assert.equal(captureTakeFromBackground(120, 0.5).ok, true)
        const takeLength = globals.recording.take.chords.length
        assert.ok(takeLength > 0)

        // Buffer a second note, then clear only the buffer.
        recordBackgroundNoteOn('chords', 'E4', 0.8, undefined, 1)
        recordBackgroundNoteOff('chords', 'E4', 1.5)
        const result = clearFlashback()

        assert.equal(result.count, 1)
        assert.equal(result.remaining, 0)
        assert.equal(backgroundNoteCount(), 0)
        assert.equal(globals.recording.take.chords.length, takeLength)
    })

    it('clears the buffer after the configured silence', () => {
        vi.useFakeTimers()
        globals.recording.background.silenceSec = 10
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        recordBackgroundNoteOff('chords', 'C4', 0.5)
        assert.equal(backgroundNoteCount(), 1)

        vi.advanceTimersByTime(9999)
        assert.equal(backgroundNoteCount(), 1, 'still within the silence window')

        vi.advanceTimersByTime(2)
        assert.equal(backgroundNoteCount(), 0, 'cleared just after the window')
        assert.equal(globals.recording.background.available, false)
    })

    it('restarts the silence countdown on any chord or solo activity', () => {
        vi.useFakeTimers()
        globals.recording.background.silenceSec = 10
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        recordBackgroundNoteOff('chords', 'C4', 0.1)

        // Five seconds later a solo note arrives, so the countdown restarts.
        vi.advanceTimersByTime(5000)
        recordBackgroundNoteOn('jam', 'E5', 0.5, undefined, 5)
        recordBackgroundNoteOff('jam', 'E5', 5.1)

        vi.advanceTimersByTime(9999)
        assert.equal(backgroundNoteCount(), 2, 'activity kept the buffer alive')

        vi.advanceTimersByTime(2)
        assert.equal(backgroundNoteCount(), 0)
    })

    it('treats a still-held note as activity, not silence', () => {
        vi.useFakeTimers()
        globals.recording.background.silenceSec = 10
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)

        vi.advanceTimersByTime(10001)
        assert.equal(backgroundNoteCount(), 1, 'a held note keeps the buffer')

        recordBackgroundNoteOff('chords', 'C4', 10.1)
        vi.advanceTimersByTime(10001)
        assert.equal(backgroundNoteCount(), 0, 'the buffer clears after release plus silence')
    })

    it('does not auto-clear when the silence preference is zero', () => {
        vi.useFakeTimers()
        globals.recording.background.silenceSec = 0
        recordBackgroundNoteOn('chords', 'C4', 0.8, undefined, 0)
        recordBackgroundNoteOff('chords', 'C4', 0.5)

        vi.advanceTimersByTime(60000)
        assert.equal(backgroundNoteCount(), 1)
    })
})
