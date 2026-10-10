import assert from 'assert'
import { clamp, normalizeWheelDelta, zoomFactor, zoomAxis, panAxis, sliderWheelSteps, rowSpan, rowBox, viewOffsetBounds, clampViewOffset } from '@/lib/sequencer-view.js'

describe('sequencer-view', () => {
    describe('clamp', () => {
        it('bounds values to the inclusive range', () => {
            assert.equal(clamp(5, 0, 10), 5)
            assert.equal(clamp(-1, 0, 10), 0)
            assert.equal(clamp(11, 0, 10), 10)
        })
    })

    describe('normalizeWheelDelta', () => {
        it('passes pixel deltas through unchanged', () => {
            assert.equal(normalizeWheelDelta(100, 0), 100)
        })

        it('scales line and page deltas', () => {
            assert.equal(normalizeWheelDelta(3, 1), 48)
            assert.equal(normalizeWheelDelta(1, 2), 300)
        })
    })

    describe('zoomFactor', () => {
        it('zooms in when scrolling up and out when scrolling down', () => {
            assert.ok(zoomFactor(-100) < 1)
            assert.ok(zoomFactor(100) > 1)
            assert.equal(zoomFactor(0), 1)
        })
    })

    describe('zoomAxis', () => {
        it('keeps the anchored position fixed while zooming', () => {
            const result = zoomAxis({
                range: 8, offset: 4, min: 1, max: 64,
                offsetMin: 0, offsetMax: 256, factor: 0.5, anchor: 0.5,
            })
            assert.equal(result.range, 4)
            // The bar at the middle of the view (4 + 0.5*8 = 8) stays in the middle.
            assert.equal(result.offset + 0.5 * result.range, 8)
        })

        it('clamps the range and the offset', () => {
            const zoomedIn = zoomAxis({
                range: 1, offset: 0, min: 1, max: 64,
                offsetMin: 0, offsetMax: 256, factor: 0.5, anchor: 0,
            })
            assert.equal(zoomedIn.range, 1)
            assert.equal(zoomedIn.offset, 0)

            const zoomedOut = zoomAxis({
                range: 40, offset: 250, min: 1, max: 64,
                offsetMin: 0, offsetMax: 256, factor: 2, anchor: 1,
            })
            assert.equal(zoomedOut.range, 64)
            // The anchored bar is held: 250 + (40 - 64) = 226.
            assert.equal(zoomedOut.offset, 226)

            const clampedLow = zoomAxis({
                range: 40, offset: 10, min: 1, max: 64,
                offsetMin: 0, offsetMax: 256, factor: 2, anchor: 1,
            })
            assert.equal(clampedLow.offset, 0)
        })
    })

    describe('panAxis', () => {
        it('moves the offset by the pixel delta in axis units', () => {
            const result = panAxis({
                range: 8, offset: 0, deltaPx: 100, viewportPx: 400,
                offsetMin: 0, offsetMax: 256,
            })
            assert.equal(result.offset, 2)
        })

        it('inverts and clamps the vertical axis', () => {
            const result = panAxis({
                range: 24, offset: 5, deltaPx: 100, viewportPx: 300,
                offsetMin: 0, offsetMax: 127, invert: true,
            })
            assert.equal(result.offset, 0)
        })

        it('returns the offset unchanged for a zero-sized viewport', () => {
            assert.equal(panAxis({ range: 8, offset: 3, deltaPx: 100, viewportPx: 0, offsetMin: 0, offsetMax: 256 }).offset, 3)
        })
    })

    describe('rowSpan', () => {
        it('spans the finite values and ignores the rest', () => {
            assert.deepEqual(rowSpan([60, 64, 67]), { min: 60, max: 67 })
            assert.deepEqual(rowSpan([64, NaN, 60]), { min: 60, max: 64 })
        })

        it('is null for an empty panel', () => {
            assert.equal(rowSpan([]), null)
            assert.equal(rowSpan(null), null)
        })
    })

    describe('rowBox', () => {
        it('widens the span by the padding with an exclusive top', () => {
            assert.deepEqual(rowBox({ min: 60, max: 67 }, 2), { min: 58, max: 70 })
        })

        it('is null without a span', () => {
            assert.equal(rowBox(null), null)
        })
    })

    describe('viewOffsetBounds', () => {
        it('keeps the window inside the box', () => {
            assert.deepEqual(viewOffsetBounds(8, 56, 72, 0, 127), { min: 56, max: 64 })
        })

        it('parks at the box start when the range covers it', () => {
            assert.deepEqual(viewOffsetBounds(24, 56, 72, 0, 127), { min: 56, max: 56 })
        })

        it('is unbounded without a box', () => {
            assert.deepEqual(viewOffsetBounds(8, null, null, 0, 127), { min: 0, max: 127 })
        })
    })

    describe('clampViewOffset', () => {
        it('pulls stray offsets back inside', () => {
            assert.equal(clampViewOffset(120, 8, 56, 72, 0, 127), 64)
            assert.equal(clampViewOffset(0, 8, 56, 72, 0, 127), 56)
            assert.equal(clampViewOffset(60, 8, 56, 72, 0, 127), 60)
        })
    })

    describe('sliderWheelSteps', () => {
        it('is gentle for a normal mouse notch', () => {
            assert.equal(sliderWheelSteps(100), 1)
            assert.equal(sliderWheelSteps(-100), -1)
        })

        it('scales up for a fast scroll and with shift, still signed', () => {
            assert.equal(sliderWheelSteps(500), 3)
            assert.equal(sliderWheelSteps(-100, true), -4)
        })

        it('does nothing for a zero or invalid delta', () => {
            assert.equal(sliderWheelSteps(0), 0)
            assert.equal(sliderWheelSteps(NaN), 0)
        })
    })
})
