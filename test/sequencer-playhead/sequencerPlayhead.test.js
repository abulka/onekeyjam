import assert from 'assert'
import { tickToX, xToTick, isTickVisible, resolveResumeTick } from '@/lib/sequencer-playhead.js'

describe('sequencer-playhead', () => {
    const geo = { xoffsetTicks: 0, xrangeTicks: 64, swidth: 640, yruler: 24, kbwidth: 40 }

    describe('tickToX', () => {
        it('places tick zero at the left of the time area', () => {
            assert.equal(tickToX(0, geo), 64)
        })

        it('scales ticks across the time area', () => {
            // 64 ticks over 640 pixels: 10 pixels per tick.
            assert.equal(tickToX(32, geo), 384)
        })

        it('accounts for horizontal scroll', () => {
            const scrolled = { ...geo, xoffsetTicks: 16 }
            assert.equal(tickToX(16, scrolled), 64)
        })
    })

    describe('xToTick', () => {
        it('round-trips with tickToX', () => {
            assert.equal(xToTick(tickToX(20, geo), geo), 20)
        })

        it('clamps negative positions at zero', () => {
            assert.equal(xToTick(0, geo), 0)
        })

        it('returns zero for a zero-sized viewport', () => {
            assert.equal(xToTick(100, { ...geo, swidth: 0 }), 0)
        })
    })

    describe('isTickVisible', () => {
        it('is true inside the time area and false outside', () => {
            assert.equal(isTickVisible(0, geo), true)
            assert.equal(isTickVisible(64, geo), true)
            assert.equal(isTickVisible(65, geo), false)
            assert.equal(isTickVisible(-1, geo), false)
        })
    })

    describe('resolveResumeTick', () => {
        it('resumes from the head mid-loop', () => {
            assert.equal(resolveResumeTick(20, 0, 64), 20)
        })

        it('restarts at the loop start when parked at or past the end', () => {
            assert.equal(resolveResumeTick(64, 0, 64), 0)
            assert.equal(resolveResumeTick(80, 16, 64), 16)
        })

        it('clamps invalid positions at zero', () => {
            assert.equal(resolveResumeTick(NaN, 0, 64), 0)
            assert.equal(resolveResumeTick(-5, 0, 64), 0)
        })
    })
})
