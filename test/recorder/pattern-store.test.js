import assert from 'assert'
import { savePattern, loadPattern, clearPattern } from '@/lib/midi/pattern-store.js'

const STORAGE_KEY = 'onekeyjam.pattern'

function fakeStorage() {
    const map = new Map()
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key),
    }
}

describe('pattern store', () => {
    it('saves and loads a pattern', () => {
        const storage = fakeStorage()
        savePattern({ mml: 't100o4l8c1', markstart: 0, markend: 64, tempo: 100, enabled: true }, storage)

        assert.deepEqual(loadPattern(storage), {
            mml: 't100o4l8c1',
            markstart: 0,
            markend: 64,
            tempo: 100,
            enabled: true,
        })
    })

    it('returns null for missing, corrupt or wrong-version data', () => {
        const storage = fakeStorage()
        assert.equal(loadPattern(storage), null)

        storage.setItem(STORAGE_KEY, 'not json')
        assert.equal(loadPattern(storage), null)

        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, mml: 'x' }))
        assert.equal(loadPattern(storage), null)
    })

    it('clears the saved pattern', () => {
        const storage = fakeStorage()
        savePattern({ mml: 'x', markstart: 0, markend: 16, tempo: 100, enabled: false }, storage)
        assert.ok(storage.getItem(STORAGE_KEY))

        clearPattern(storage)
        assert.equal(loadPattern(storage), null)
    })
})
