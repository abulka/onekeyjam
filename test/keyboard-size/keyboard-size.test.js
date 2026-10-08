import assert from 'assert'
import { computeKeyboardWidth, whiteKeysForOctaves, SCROLL_REFERENCE_OCTAVES } from '@/lib/keyboard-size.js'

describe('keyboard-size', () => {

    it('counts white keys with a top C', () => {
        assert.equal(SCROLL_REFERENCE_OCTAVES, 2)
        assert.equal(whiteKeysForOctaves(2), 15)
        assert.equal(whiteKeysForOctaves(3), 22)
        assert.equal(whiteKeysForOctaves(4), 29)
    })

    it('fits the container at or below the fit limit', () => {
        assert.equal(computeKeyboardWidth(1036, 2, 3), 1036)
        assert.equal(computeKeyboardWidth(1036, 3, 3), 1036)
        assert.equal(computeKeyboardWidth(2000, 2, 6, { small: 710, large: 1130 }), 1130)
        assert.equal(computeKeyboardWidth(300, 2, 3, { small: 710, large: 1130 }), 710)
    })

    it('grows past the fit limit to keep the 2-octave key size', () => {
        const width = computeKeyboardWidth(1036, 4, 3)
        assert.equal(width, Math.round(1036 * whiteKeysForOctaves(4) / whiteKeysForOctaves(2)))
        assert.ok(width > 1036)
    })

    it('always fits when the limit covers the shown octaves', () => {
        assert.equal(computeKeyboardWidth(1036, 6, 6), 1036)
    })

    it('falls back to the fitted width for invalid input', () => {
        assert.equal(computeKeyboardWidth(1036, Number.NaN, 3), 1036)
        assert.equal(computeKeyboardWidth(1036, 4, undefined), 1036)
    })
})
