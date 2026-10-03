import assert from 'assert'
import { readPrefs, writePrefs, loadUiPrefs, currentPrefs, KEYBOARD_HELP_MODES } from '@/lib/uiPrefs.js'
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

    it('reads and validates the shortcut badge flag', () => {
        const on = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showKeyShortcuts: true }) })
        assert.equal(readPrefs(on).showKeyShortcuts, true)
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showKeyShortcuts: 'yes' }) })
        assert.equal(readPrefs(bad).showKeyShortcuts, undefined)
    })

    it('defaults the welcome dialog to shown', () => {
        assert.equal(globals.showWelcomeDialog, true)
    })

    it('reads and validates the welcome dialog flag', () => {
        const off = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showWelcomeDialog: false }) })
        assert.equal(readPrefs(off).showWelcomeDialog, false)
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showWelcomeDialog: 'no' }) })
        assert.equal(readPrefs(bad).showWelcomeDialog, undefined)
    })

    it('loads the welcome dialog flag into globals', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showWelcomeDialog: false }) })
        loadUiPrefs(storage)
        assert.equal(globals.showWelcomeDialog, false)
        globals.showWelcomeDialog = true
    })

    it('loads the shortcut badge flag into globals', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showKeyShortcuts: true }) })
        loadUiPrefs(storage)
        assert.equal(globals.showKeyShortcuts, true)
        globals.showKeyShortcuts = false
    })

    it('round-trips the shortcut badge flag', () => {
        const storage = fakeStorage()
        writePrefs({ keyboardHelpMode: 'all', showKeyShortcuts: true }, storage)
        const prefs = readPrefs(storage)
        assert.equal(prefs.keyboardHelpMode, 'all')
        assert.equal(prefs.showKeyShortcuts, true)
    })

    it('reports the current prefs from globals', () => {
        globals.keyboardHelpMode = 'white'
        globals.showKeyShortcuts = true
        globals.showWelcomeDialog = false
        assert.deepEqual(currentPrefs(), { keyboardHelpMode: 'white', showKeyShortcuts: true, showWelcomeDialog: false })
        globals.showWelcomeDialog = true
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
