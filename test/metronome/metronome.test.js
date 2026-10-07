import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    noteSequencerStarted,
    noteSequencerStopped,
    getSequencerClock,
} from '@/lib/pattern-snapshot.js'
import { activeClock } from '@/lib/audio/metronome.js'

describe('pattern snapshot hub', () => {
    afterEach(() => {
        noteSequencerStopped()
        globals.recording.playback.isPlaying = false
    })

    it('tracks the sequencer clock', () => {
        assert.deepEqual(getSequencerClock(), { isPlaying: false, baseTime: null, offsetSec: 0 })
        noteSequencerStarted(123.5)
        assert.deepEqual(getSequencerClock(), { isPlaying: true, baseTime: 123.5, offsetSec: 0 })
        noteSequencerStopped()
        assert.deepEqual(getSequencerClock(), { isPlaying: false, baseTime: null, offsetSec: 0 })
    })

    it('records the loop-relative start offset', () => {
        noteSequencerStarted(100, 0.75)
        assert.deepEqual(getSequencerClock(), { isPlaying: true, baseTime: 100, offsetSec: 0.75 })
        noteSequencerStopped()
        assert.deepEqual(getSequencerClock(), { isPlaying: false, baseTime: null, offsetSec: 0 })
    })

    it('resets the offset when restarted without one', () => {
        noteSequencerStarted(100, 0.75)
        noteSequencerStarted(200)
        assert.deepEqual(getSequencerClock(), { isPlaying: true, baseTime: 200, offsetSec: 0 })
    })
})

describe('metronome clock choice', () => {
    afterEach(() => {
        noteSequencerStopped()
        globals.recording.playback.isPlaying = false
    })

    it('is silent when neither the take nor the pattern plays', () => {
        assert.equal(activeClock(), null)
    })

    it('follows the pattern loop when the take is stopped', () => {
        noteSequencerStarted(77)
        const clock = activeClock()
        assert.ok(clock)
        assert.equal(clock.baseTime, 77)
        assert.equal(clock.offsetSec, 0)
    })

    it('prefers the take over the pattern when both play', () => {
        noteSequencerStarted(77)
        globals.recording.playback.isPlaying = true
        const clock = activeClock()
        assert.ok(clock)
        // The take clock reports the take's playing state.
        assert.equal(clock.isPlaying, true)
        noteSequencerStopped()
        assert.equal(activeClock().isPlaying, true)
        globals.recording.playback.isPlaying = false
        assert.equal(activeClock(), null)
    })
})
