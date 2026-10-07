import assert from 'assert'
import { triggerRowCountFor } from '@/lib/demo-pattern.js'

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
