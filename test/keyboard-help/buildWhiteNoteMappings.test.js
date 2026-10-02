import assert from 'assert'
import { buildWhiteNoteMappings } from '@/lib/keyboard-help.js'

describe('buildWhiteNoteMappings', () => {

    it('left hand chord triggers show the chord that will play', () => {
        const result = buildWhiteNoteMappings({ C3: { chord: 'Cmaj7' }, D3: { chord: 'Dm7' } }, {})
        assert.equal(result.C3, 'Cmaj7')
        assert.equal(result.D3, 'Dm7')
    })

    it('right hand keys show the scale note they map to', () => {
        const result = buildWhiteNoteMappings({}, { C4: 'C', D4: 'E', E4: 'G' })
        assert.equal(result.C4, 'C')
        assert.equal(result.D4, 'E')
        assert.equal(result.E4, 'G')
    })

    it('a chord trigger wins when the same note is in both maps', () => {
        const result = buildWhiteNoteMappings({ C4: { chord: 'Cmaj7' } }, { C4: 'C' })
        assert.equal(result.C4, 'Cmaj7')
    })

    it('handles missing maps', () => {
        assert.deepEqual(buildWhiteNoteMappings(), {})
        assert.deepEqual(buildWhiteNoteMappings(undefined, undefined), {})
    })
})
