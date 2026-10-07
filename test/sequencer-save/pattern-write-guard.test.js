import assert from 'assert'
import {
    storedMmlHasNotes,
    shouldPreserveStoredPattern,
    createSerialQueue,
} from '@/lib/pattern-write-guard.js'

describe('storedMmlHasNotes', () => {
    it('treats a header-only widget dump as empty', () => {
        // Exactly what getMMLString() returns for an empty sequence.
        assert.equal(storedMmlHasNotes('t84o4l8'), false)
    })

    it('finds notes in a real pattern', () => {
        assert.equal(storedMmlHasNotes('t84o4l8c2d2e2f2g2a2b2o5c2'), true)
    })

    it('handles missing or empty values', () => {
        assert.equal(storedMmlHasNotes(''), false)
        assert.equal(storedMmlHasNotes(undefined), false)
        assert.equal(storedMmlHasNotes(null), false)
    })
})

describe('shouldPreserveStoredPattern', () => {
    const stored = 't84o4l8c2d2e2f2'

    it('blocks an empty panel over stored notes on a fresh load', () => {
        assert.equal(shouldPreserveStoredPattern({
            panelNoteCount: 0,
            storedMml: stored,
            explicitClear: false,
            lastUserEditCount: null,
        }), true)
    })

    it('blocks an empty panel after ordinary edits', () => {
        assert.equal(shouldPreserveStoredPattern({
            panelNoteCount: 0,
            storedMml: stored,
            explicitClear: false,
            lastUserEditCount: 8,
        }), true)
    })

    it('lets the Clear pattern button through', () => {
        assert.equal(shouldPreserveStoredPattern({
            panelNoteCount: 0,
            storedMml: stored,
            explicitClear: true,
            lastUserEditCount: null,
        }), false)
    })

    it('lets deleting every note by hand through', () => {
        assert.equal(shouldPreserveStoredPattern({
            panelNoteCount: 0,
            storedMml: stored,
            explicitClear: false,
            lastUserEditCount: 0,
        }), false)
    })

    it('passes normal non-empty saves through', () => {
        assert.equal(shouldPreserveStoredPattern({
            panelNoteCount: 8,
            storedMml: stored,
            explicitClear: false,
            lastUserEditCount: 8,
        }), false)
    })

    it('passes saves when nothing stored is at risk', () => {
        assert.equal(shouldPreserveStoredPattern({
            panelNoteCount: 0,
            storedMml: 't84o4l8',
            explicitClear: false,
            lastUserEditCount: null,
        }), false)
    })
})

describe('createSerialQueue', () => {
    it('runs work strictly one at a time in order', async () => {
        const enqueue = createSerialQueue()
        const events = []
        const first = enqueue(async () => {
            events.push('first-start')
            await new Promise(resolve => setTimeout(resolve, 20))
            events.push('first-end')
        })
        const second = enqueue(async () => {
            events.push('second-start')
            events.push('second-end')
        })
        await Promise.all([first, second])
        assert.deepEqual(events, ['first-start', 'first-end', 'second-start', 'second-end'])
    })

    it('keeps the queue running after a failure', async () => {
        const enqueue = createSerialQueue()
        const events = []
        // Silence the expected error report for this test.
        const original = console.error
        console.error = () => {}
        try {
            const failing = enqueue(async () => {
                throw new Error('boom')
            })
            const next = enqueue(async () => {
                events.push('ran')
            })
            await failing.catch(() => {})
            await next
            assert.deepEqual(events, ['ran'])
        }
        finally {
            console.error = original
        }
    })
})
