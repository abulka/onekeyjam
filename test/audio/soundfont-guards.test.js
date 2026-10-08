import assert from 'assert'
import {
    isSoundfontReady,
    playGmNote,
    soundfontStatus,
    stopGmNote,
} from '@/lib/audio/general-midi-soundfont-player.js'
import { ensureAudioReady } from '@/lib/audio/general-midi.js'

describe('soundfont guards (iPad slow-load safety)', () => {
    it('reports not ready before instruments load', () => {
        assert.equal(isSoundfontReady('jam'), false)
        assert.equal(isSoundfontReady('chord'), false)
        assert.equal(isSoundfontReady('bass'), false)
        assert.deepEqual(soundfontStatus(), { jam: false, chord: false, bass: false, errors: {} })
    })

    it('play returns null instead of throwing when samples are missing', () => {
        const fakeContext = { currentTime: 0 }
        assert.equal(playGmNote(fakeContext, 'jam', 0, '4', 'C4', 60, 0.8), null)
        assert.equal(playGmNote(fakeContext, 'chord', 0, '4', 'E4', 64, 0.8), null)
        assert.equal(playGmNote(fakeContext, 'bass', 0, '2', 'C2', 36, 0.8), null)
    })

    it('stop is safe with a missing or finished envelope', () => {
        const fakeContext = { currentTime: 0 }
        assert.doesNotThrow(() => stopGmNote(fakeContext, {}))
        assert.doesNotThrow(() => stopGmNote(fakeContext, { envelope: null }))
        assert.doesNotThrow(() => stopGmNote(fakeContext, {
            envelope: { stop: () => { throw new Error('already stopped') } },
        }))
    })

    it('audio wake-up resolves false when booted never ran', async () => {
        assert.equal(await ensureAudioReady(), false)
    })
})
