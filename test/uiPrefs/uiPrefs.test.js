import assert from 'assert'
import { readPrefs, writePrefs, loadUiPrefs, KEYBOARD_HELP_MODES } from '@/lib/uiPrefs.js'
import { globals } from '@/lib/globals.js'

function fakeStorage(initial = {}) {
    const data = { ...initial }
    return {
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => { data[key] = String(value) },
        removeItem: (key) => { delete data[key] },
        _data: data,
    }
}

describe('uiPrefs', () => {

    it('defaults the keyboard help mode to black and white', () => {
        assert.equal(globals.keyboardHelpMode, 'all')
    })

    it('returns empty prefs when nothing is stored', () => {
        assert.deepEqual(readPrefs(fakeStorage()), {})
    })

    it('ignores an invalid keyboard help mode', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ keyboardHelpMode: 'nonsense' }) })
        assert.deepEqual(readPrefs(storage), {})
    })

    it('round-trips a valid keyboard help mode', () => {
        const storage = fakeStorage()
        for (const mode of KEYBOARD_HELP_MODES) {
            writePrefs({ keyboardHelpMode: mode }, storage)
            assert.equal(readPrefs(storage).keyboardHelpMode, mode)
        }
    })

    it('loads a saved mode into globals', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ keyboardHelpMode: 'black' }) })
        loadUiPrefs(storage)
        assert.equal(globals.keyboardHelpMode, 'black')
    })

    it('leaves globals untouched for invalid stored data', () => {
        globals.keyboardHelpMode = 'all'
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': 'not json' })
        loadUiPrefs(storage)
        assert.equal(globals.keyboardHelpMode, 'all')
    })

    it('tolerates missing storage', () => {
        assert.deepEqual(readPrefs(null), {})
        assert.doesNotThrow(() => writePrefs({ keyboardHelpMode: 'all' }, null))
        assert.doesNotThrow(() => loadUiPrefs(null))
    })
})
