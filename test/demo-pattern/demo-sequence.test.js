import assert from 'assert'
import {
    dedupeSymbols,
    mergeConsecutiveHolds,
    planDemoPattern,
    planDemoSequences,
    normalizeSequences,
    demoSequenceMml,
    demoEntryForTriggers,
    defaultSequenceLabel,
    DEMO_PATTERN_TIMEBASE,
    DEMO_PATTERN_TEMPO,
} from '@/lib/demo-pattern.js'

describe('dedupeSymbols', () => {
    it('keeps first-appearance order and drops repeats', () => {
        assert.deepEqual(dedupeSymbols(['E', 'D', 'A', 'E', 'D', 'A', 'B', 'E']), ['E', 'D', 'A', 'B'])
    })

    it('leaves unique lists alone', () => {
        assert.deepEqual(dedupeSymbols(['C', 'D', 'E']), ['C', 'D', 'E'])
    })
})

describe('mergeConsecutiveHolds', () => {
    it('merges back to back repeats into longer holds', () => {
        assert.deepEqual(
            mergeConsecutiveHolds([
                { index: 0, bars: 1 },
                { index: 0, bars: 1 },
                { index: 1, bars: 1 },
            ]),
            [
                { index: 0, bars: 2 },
                { index: 1, bars: 1 },
            ],
        )
    })

    it('leaves separated repeats as separate notes', () => {
        assert.deepEqual(
            mergeConsecutiveHolds([
                { index: 0, bars: 1 },
                { index: 1, bars: 1 },
                { index: 0, bars: 1 },
            ]),
            [
                { index: 0, bars: 1 },
                { index: 1, bars: 1 },
                { index: 0, bars: 1 },
            ],
        )
    })
})

describe('planDemoPattern', () => {
    it('reuses rows for repeats without a hand-authored sequence', () => {
        const { uniqueSymbols, triggers, missing } = planDemoPattern({
            chords: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'],
        })
        assert.deepEqual(uniqueSymbols, ['Cmaj7', 'Am7', 'Dm7', 'G7'])
        assert.deepEqual(
            triggers.map((entry) => entry.index),
            [0, 1, 2, 3, 0, 1, 2, 3],
        )
        assert.deepEqual(missing, [])
    })

    it('merges modal vamps into long holds', () => {
        const { uniqueSymbols, triggers } = planDemoPattern({
            chords: ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7'],
        })
        assert.deepEqual(uniqueSymbols, ['Dm7', 'Ebm7'])
        assert.deepEqual(triggers, [
            { index: 0, bars: 4 },
            { index: 1, bars: 4 },
        ])
    })

    it('follows a hand-authored sequence with varied lengths', () => {
        const { uniqueSymbols, triggers } = planDemoPattern({
            chords: ['Cmaj7', 'D7', 'Dm7', 'G7'],
            sequence: [
                { chord: 'Cmaj7', bars: 1 },
                { chord: 'D7', bars: 1 },
                { chord: 'Dm7', bars: 0.5 },
                { chord: 'G7', bars: 0.5 },
            ],
        })
        assert.deepEqual(uniqueSymbols, ['Cmaj7', 'D7', 'Dm7', 'G7'])
        assert.deepEqual(triggers, [
            { index: 0, bars: 1 },
            { index: 1, bars: 1 },
            { index: 2, bars: 0.5 },
            { index: 3, bars: 0.5 },
        ])
    })
})

describe('demoSequenceMml', () => {
    it('returns an empty pattern for no steps', () => {
        assert.equal(demoSequenceMml([]), '')
    })

    it('walks triggers in order with one bar each', () => {
        assert.equal(
            demoSequenceMml([
                { index: 0, bars: 1 },
                { index: 1, bars: 1 },
                { index: 2, bars: 1 },
            ]),
            `t${DEMO_PATTERN_TEMPO}o4c1d1e1`,
        )
    })

    it('points repeats back at earlier rows', () => {
        assert.equal(
            demoSequenceMml([
                { index: 0, bars: 1 },
                { index: 1, bars: 1 },
                { index: 0, bars: 1 },
            ]),
            `t${DEMO_PATTERN_TEMPO}o4c1d1c1`,
        )
    })

    it('uses half notes for half bars', () => {
        assert.equal(
            demoSequenceMml([
                { index: 2, bars: 0.5 },
                { index: 3, bars: 0.5 },
            ]),
            `t${DEMO_PATTERN_TEMPO}o4e2f2`,
        )
    })

    it('ties multi-bar holds instead of retriggering', () => {
        assert.equal(demoSequenceMml([{ index: 0, bars: 2 }]), `t${DEMO_PATTERN_TEMPO}o4c1&c1`)
        assert.equal(demoSequenceMml([{ index: 0, bars: 4 }]), `t${DEMO_PATTERN_TEMPO}o4c1&c1&c1&c1`)
    })

    it('continues past seven triggers in the next octave', () => {
        assert.equal(
            demoSequenceMml([
                { index: 6, bars: 1 },
                { index: 7, bars: 1 },
            ]),
            `t${DEMO_PATTERN_TEMPO}o4b1o5c1`,
        )
    })
})

describe('demoEntryForTriggers', () => {
    it('fits the loop to the total bars', () => {
        const entry = demoEntryForTriggers([
            { index: 0, bars: 1 },
            { index: 1, bars: 0.5 },
            { index: 2, bars: 0.5 },
        ])
        assert.equal(entry.markstart, 0)
        assert.equal(entry.markend, 2 * DEMO_PATTERN_TIMEBASE)
        assert.equal(entry.tempo, DEMO_PATTERN_TEMPO)
        assert.equal(entry.enabled, false)
        assert.equal(entry.loopManual, false)
    })

    it('stores a tempo and an optional label', () => {
        const entry = demoEntryForTriggers([{ index: 0, bars: 1 }], 96, 'Full form')
        assert.equal(entry.tempo, 96)
        assert.ok(entry.mml.startsWith('t96'))
        assert.equal(entry.label, 'Full form')
    })
})

describe('normalizeSequences', () => {
    it('treats a legacy single sequence as default', () => {
        const authored = normalizeSequences({ chords: ['C'], sequence: [{ chord: 'C', bars: 1 }] })
        assert.deepEqual(Object.keys(authored), ['default'])
    })

    it('keeps named sequences and ignores non-arrays', () => {
        const authored = normalizeSequences({
            chords: ['C'],
            sequences: { full: [{ chord: 'C', bars: 1 }], bogus: null },
        })
        assert.deepEqual(Object.keys(authored), ['full'])
    })
})

describe('planDemoSequences', () => {
    it('builds a union grid and one loop per named sequence', () => {
        const { uniqueSymbols, sequences } = planDemoSequences({
            chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
            sequences: {
                default: [
                    { chord: 'Cmaj7', bars: 1 },
                    { chord: 'Am7', bars: 1 },
                ],
                full: [
                    { chord: 'Cmaj7', bars: 1 },
                    { chord: 'Am7', bars: 1 },
                    { chord: 'Dm7', bars: 1 },
                    { chord: 'G7', bars: 1 },
                    { chord: 'Em7', bars: 1 },
                ],
            },
        })
        // Em7 is new, so it joins the grid after the excerpt chords.
        assert.deepEqual(uniqueSymbols, ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7'])
        assert.deepEqual(sequences.default.map((entry) => entry.index), [0, 1])
        assert.deepEqual(sequences.full.map((entry) => entry.index), [0, 1, 2, 3, 4])
    })

    it('reuses rows for chords shared between sequences', () => {
        const { uniqueSymbols } = planDemoSequences({
            chords: ['C', 'F', 'G'],
            sequences: {
                default: [{ chord: 'C', bars: 1 }, { chord: 'G', bars: 1 }],
                full: [{ chord: 'F', bars: 1 }, { chord: 'C', bars: 1 }],
            },
        })
        assert.deepEqual(uniqueSymbols, ['C', 'F', 'G'])
    })

    it('derives a default loop when nothing is authored', () => {
        const { sequences } = planDemoSequences({ chords: ['C', 'C', 'F'] })
        assert.deepEqual(sequences.default, [
            { index: 0, bars: 2 },
            { index: 1, bars: 1 },
        ])
    })

    it('keeps the chord-order excerpt as default when only full is authored', () => {
        const { sequences } = planDemoSequences({
            chords: ['C', 'F', 'G'],
            sequences: { full: [{ chord: 'C', bars: 1 }, { chord: 'F', bars: 1 }, { chord: 'G', bars: 1 }, { chord: 'Am', bars: 1 }] },
        })
        assert.deepEqual(Object.keys(sequences), ['default', 'full'])
        assert.deepEqual(sequences.default, [
            { index: 0, bars: 1 },
            { index: 1, bars: 1 },
            { index: 2, bars: 1 },
        ])
    })
})

describe('defaultSequenceLabel', () => {
    it('names the conventional sequences and appends the bar count', () => {
        assert.equal(defaultSequenceLabel('default', 8 * DEMO_PATTERN_TIMEBASE), 'Excerpt (8 bars)')
        assert.equal(defaultSequenceLabel('medium', 16 * DEMO_PATTERN_TIMEBASE), 'Middle section (16 bars)')
        assert.equal(defaultSequenceLabel('full', 32 * DEMO_PATTERN_TIMEBASE), 'Full form (32 bars)')
    })

    it('falls back to the key for unknown names', () => {
        assert.equal(defaultSequenceLabel('bridge', 4 * DEMO_PATTERN_TIMEBASE), 'bridge (4 bars)')
    })
})
