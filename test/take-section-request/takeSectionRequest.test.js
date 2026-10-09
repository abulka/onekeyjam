import assert from 'assert'
import { requestTakeSectionOpen, consumeTakeSectionOpenRequest } from '@/lib/takeSectionRequest.js'

describe('take section request', () => {
    it('starts with no pending request', () => {
        assert.equal(consumeTakeSectionOpenRequest(), false)
    })

    it('delivers a request exactly once', () => {
        requestTakeSectionOpen()
        assert.equal(consumeTakeSectionOpenRequest(), true)
        assert.equal(consumeTakeSectionOpenRequest(), false)
    })

    it('keeps a request until it is consumed', () => {
        requestTakeSectionOpen()
        requestTakeSectionOpen()
        assert.equal(consumeTakeSectionOpenRequest(), true)
        assert.equal(consumeTakeSectionOpenRequest(), false)
    })
})
