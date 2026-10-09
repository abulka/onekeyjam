import assert from 'assert'
import { scalePatternNoteLengths } from '@/lib/sequencer-notes.js'

function note(t, n, g) {
    return { t, n, g, v: 100, f: 0 }
}

describe('scalePatternNoteLengths', () => {
    it('returns an empty list for no notes', () => {
        assert.deepEqual(scalePatternNoteLengths([], 2), [])
        assert.deepEqual(scalePatternNoteLengths(null, 0.5), [])
    })

    it('doubles back-to-back notes proportionally', () => {
        const out = scalePatternNoteLengths([note(0, 60, 16), note(16, 62, 16)], 2)
        assert.deepEqual(out.map(n => [n.t, n.g]), [[0, 32], [32, 32]])
        assert.deepEqual(out.map(n => n.n), [60, 62])
    })

    it('halves back-to-back notes proportionally', () => {
        const out = scalePatternNoteLengths([note(0, 60, 16), note(16, 62, 16)], 0.5)
        assert.deepEqual(out.map(n => [n.t, n.g]), [[0, 8], [8, 8]])
    })

    it('scales existing gaps proportionally too', () => {
        const doubled = scalePatternNoteLengths([note(0, 60, 16), note(32, 62, 16)], 2)
        assert.deepEqual(doubled.map(n => [n.t, n.g]), [[0, 32], [64, 32]])
        const halved = scalePatternNoteLengths([note(0, 60, 16), note(32, 62, 16)], 0.5)
        assert.deepEqual(halved.map(n => [n.t, n.g]), [[0, 8], [16, 8]])
    })

    it('keeps same-start notes together', () => {
        const out = scalePatternNoteLengths([note(0, 60, 16), note(0, 64, 16), note(16, 62, 16)], 2)
        assert.deepEqual(out.map(n => [n.t, n.n, n.g]), [[0, 60, 32], [0, 64, 32], [32, 62, 32]])
    })

    it('rounds odd halves half up with a one-tick minimum', () => {
        const out = scalePatternNoteLengths([note(0, 60, 15)], 0.5)
        assert.equal(out[0].g, 8)
        const tiny = scalePatternNoteLengths([note(0, 60, 1)], 0.5)
        assert.equal(tiny[0].g, 1)
    })

    it('trims rounding overlaps instead of cascading shifts', () => {
        // t=3 and g=3 both round half up to 2, ending at 4 over t=6 halved to 3.
        const out = scalePatternNoteLengths([note(3, 60, 3), note(6, 62, 16)], 0.5)
        assert.deepEqual(out.map(n => [n.t, n.g]), [[2, 1], [3, 8]])
    })

    it('sorts the result and leaves the input alone', () => {
        const input = [note(16, 62, 16), note(0, 60, 16)]
        const out = scalePatternNoteLengths(input, 2)
        assert.deepEqual(out.map(n => n.t), [0, 32])
        assert.deepEqual(input.map(n => n.t), [16, 0])
    })

    it('round-trips doubling then halving', () => {
        const notes = [note(0, 60, 16), note(16, 62, 16), note(32, 64, 16)]
        const out = scalePatternNoteLengths(scalePatternNoteLengths(notes, 2), 0.5)
        assert.deepEqual(out.map(n => [n.t, n.g]), [[0, 16], [16, 16], [32, 16]])
    })
})
