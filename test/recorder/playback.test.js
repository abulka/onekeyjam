import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { takeDurationSec, stopPlayback, seekPlayback, startPlayback } from '@/lib/midi/playback.js'

describe('midi playback helpers', () => {
    beforeEach(() => {
        globals.recording.bpm = 120
        globals.recording.ppq = 480
        globals.recording.take = { chords: [], jam: [] }
        globals.recording.playback.isPlaying = false
        globals.recording.playback.positionSec = 0
        globals.recording.playback.durationSec = 0
    })

    it('measures the take from the latest note end', () => {
        globals.recording.take = {
            chords: [{ startTick: 0, durationTicks: 960 }],
            jam: [{ startTick: 480, durationTicks: 960 }],
        }
        // 1440 ticks at 1/960 s per tick is 1.5 seconds.
        assert.ok(Math.abs(takeDurationSec(globals.recording) - 1.5) < 1e-9)
    })

    it('does nothing when there is no audio context to play through', () => {
        globals.recording.take = { chords: [{ startTick: 0, durationTicks: 480 }], jam: [] }
        startPlayback(0)
        assert.equal(globals.recording.playback.isPlaying, false)
    })

    it('clamps the seek position to the take duration', () => {
        globals.recording.playback.durationSec = 2
        seekPlayback(5)
        assert.equal(globals.recording.playback.positionSec, 2)
        seekPlayback(-1)
        assert.equal(globals.recording.playback.positionSec, 0)
    })

    it('resets the position on stop when asked', () => {
        globals.recording.playback.positionSec = 1.25
        stopPlayback(true)
        assert.equal(globals.recording.playback.positionSec, 0)
    })
})
