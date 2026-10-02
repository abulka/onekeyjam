import assert from 'assert'
import { secondsPerTick, secondsToTicks, ticksToSeconds, quantizeTick, recordedNoteDuration } from '@/lib/midi/timing.js'

describe('midi timing', () => {
    it('computes seconds per tick from bpm and ppq', () => {
        assert.ok(Math.abs(secondsPerTick(120, 480) - (0.5 / 480)) < 1e-12)
        assert.ok(Math.abs(secondsPerTick(60, 480) - (1 / 480)) < 1e-12)
    })

    it('returns zero seconds per tick for invalid input', () => {
        assert.equal(secondsPerTick(0, 480), 0)
        assert.equal(secondsPerTick(120, 0), 0)
    })

    it('round-trips ticks and seconds', () => {
        const spt = secondsPerTick(120, 480)
        assert.ok(Math.abs(secondsToTicks(ticksToSeconds(960, spt), spt) - 960) < 1e-9)
    })

    it('quantizes to a grid and leaves the note alone when the grid is off', () => {
        assert.equal(quantizeTick(250, 240), 240)
        assert.equal(quantizeTick(370, 240), 480)
        assert.equal(quantizeTick(250, 0), 250)
    })

    it('never returns a duration shorter than one tick', () => {
        assert.equal(recordedNoteDuration(100, 340), 240)
        assert.equal(recordedNoteDuration(500, 500), 1)
        assert.equal(recordedNoteDuration(500, 400), 1)
    })
})
