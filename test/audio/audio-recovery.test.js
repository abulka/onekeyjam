import assert from 'assert'
import { ensureAudioReady, recoverAudio } from '@/lib/audio/general-midi.js'

function fakeContext(state, hooks = {}) {
    return {
        state,
        resume: async () => {
            hooks.resumed = (hooks.resumed || 0) + 1
            hooks.order.push('resume')
        },
        suspend: async () => {
            hooks.suspended = (hooks.suspended || 0) + 1
            hooks.order.push('suspend')
        },
        ...hooks.extra,
    }
}

describe('audio recovery', () => {
    it('resolves false with no context', async () => {
        assert.equal(await ensureAudioReady(), false)
        assert.equal(await recoverAudio(), false)
        assert.equal(await recoverAudio(null), false)
        assert.equal(await recoverAudio(undefined), false)
    })

    it('resumes a suspended context without a restart cycle', async () => {
        const hooks = { order: [] }
        const ctx = fakeContext('suspended', hooks)
        ctx.resume = async () => {
            hooks.order.push('resume')
            ctx.state = 'running'
        }
        assert.equal(await recoverAudio(ctx), true)
        assert.deepEqual(hooks.order, ['resume'])
    })

    it('restarts a running context with suspend then resume', async () => {
        const hooks = { order: [] }
        const ctx = fakeContext('running', hooks)
        assert.equal(await recoverAudio(ctx), true)
        assert.deepEqual(hooks.order, ['suspend', 'resume'])
    })

    it('returns false when resume throws', async () => {
        const ctx = {
            state: 'suspended',
            resume: async () => { throw new Error('denied') },
            suspend: async () => {},
        }
        assert.equal(await recoverAudio(ctx), false)
    })
})
