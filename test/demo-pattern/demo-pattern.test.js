import assert from 'assert'
import {
    demoPatternMml,
    demoPatternForChordCount,
    triggerRowCountFor,
    DEMO_PATTERN_TIMEBASE,
    DEMO_PATTERN_TEMPO,
} from '@/lib/demo-pattern.js'

describe('demoPatternMml', () => {
    it('returns an empty pattern for zero chords', () => {
        assert.equal(demoPatternMml(0), '')
    })

    it('maps the first three triggers to C D E with one bar each', () => {
        assert.equal(demoPatternMml(3), `t${DEMO_PATTERN_TEMPO}o4c1d1e1`)
    })

    it('maps seven triggers to one octave of white notes', () => {
        assert.equal(demoPatternMml(7), `t${DEMO_PATTERN_TEMPO}o4c1d1e1f1g1a1b1`)
    })

    it('continues an eight chord song into the next octave', () => {
        assert.equal(demoPatternMml(8), `t${DEMO_PATTERN_TEMPO}o4c1d1e1f1g1a1b1o5c1`)
    })

    it('continues past two octaves without dropping chords', () => {
        assert.equal(
            demoPatternMml(15),
            `t${DEMO_PATTERN_TEMPO}o4c1d1e1f1g1a1b1o5c1d1e1f1g1a1b1o6c1`,
        )
    })
})

describe('demoPatternForChordCount', () => {
    it('covers every chord with a one bar loop', () => {
        const entry = demoPatternForChordCount(8)
        assert.equal(entry.mml, demoPatternMml(8))
        assert.equal(entry.markstart, 0)
        assert.equal(entry.markend, 8 * DEMO_PATTERN_TIMEBASE)
        assert.equal(entry.tempo, DEMO_PATTERN_TEMPO)
        assert.equal(entry.enabled, false)
        assert.equal(entry.loopManual, false)
    })

    it('scales the loop end with the song length', () => {
        assert.equal(demoPatternForChordCount(3).markend, 3 * DEMO_PATTERN_TIMEBASE)
        assert.equal(demoPatternForChordCount(4).markend, 4 * DEMO_PATTERN_TIMEBASE)
    })
})

describe('triggerRowCountFor', () => {
    it('keeps seven rows for small songs so there is room to grow', () => {
        assert.equal(triggerRowCountFor(0), 7)
        assert.equal(triggerRowCountFor(3), 7)
        assert.equal(triggerRowCountFor(7), 7)
    })

    it('extends into higher octaves instead of dropping chords', () => {
        assert.equal(triggerRowCountFor(8), 8)
        assert.equal(triggerRowCountFor(11), 11)
    })
})
