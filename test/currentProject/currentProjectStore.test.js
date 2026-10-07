import assert from 'assert'
import { nextTick } from 'vue'
import { vi } from 'vitest'
import {
    readCurrentProject,
    writeCurrentProject,
    clearCurrentProject,
    saveCurrentProject,
    restoreCurrentProject,
    initCurrentProjectAutosave,
} from '@/lib/currentProjectStore.js'
import { globals } from '@/lib/globals.js'

const STORAGE_KEY = 'onekeyjam.currentProject'

function fakeStorage() {
    const map = new Map()
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key),
    }
}

function emptyProject(name) {
    return {
        name,
        chords: [],
        options: {},
        songs: { default: { ids: [], favourites: [], blacklist: [] } },
    }
}

describe('current project store', () => {
    it('saves and loads a snapshot', () => {
        const storage = fakeStorage()
        const record = {
            name: 'My Jam',
            category: 'user',
            currentChordTriggerNote: 'C3',
            currentScaleFilter: 'scale2',
            currentChordSequenceName: 'full',
            maxChordConfigs: 14,
            project: emptyProject('My Jam'),
        }
        writeCurrentProject(record, storage)

        const loaded = readCurrentProject(storage)
        assert.equal(loaded.name, 'My Jam')
        assert.equal(loaded.category, 'user')
        assert.equal(loaded.currentChordTriggerNote, 'C3')
        assert.equal(loaded.currentScaleFilter, 'scale2')
        assert.equal(loaded.currentChordSequenceName, 'full')
        assert.equal(loaded.maxChordConfigs, 14)
        assert.deepEqual(loaded.project, record.project)
    })

    it('returns null for missing, corrupt or wrong-version data', () => {
        const storage = fakeStorage()
        assert.equal(readCurrentProject(storage), null)

        storage.setItem(STORAGE_KEY, 'not json')
        assert.equal(readCurrentProject(storage), null)

        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, name: 'x', project: {} }))
        assert.equal(readCurrentProject(storage), null)

        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, name: 'x' }))
        assert.equal(readCurrentProject(storage), null)
    })

    it('falls back to safe defaults for odd fields', () => {
        const storage = fakeStorage()
        storage.setItem(STORAGE_KEY, JSON.stringify({
            version: 1,
            name: 'x',
            category: 'nonsense',
            currentChordTriggerNote: '',
            currentScaleFilter: 'nope',
            maxChordConfigs: 'many',
            project: {},
        }))

        const loaded = readCurrentProject(storage)
        assert.equal(loaded.category, 'user')
        assert.equal(loaded.currentScaleFilter, 'scale1')
        assert.equal(loaded.currentChordTriggerNote, undefined)
        assert.equal(loaded.maxChordConfigs, undefined)
    })

    it('clears the saved snapshot', () => {
        const storage = fakeStorage()
        saveCurrentProject(storage)
        assert.ok(storage.getItem(STORAGE_KEY))

        clearCurrentProject(storage)
        assert.equal(readCurrentProject(storage), null)
    })

    it('captures and restores the working state', () => {
        const storage = fakeStorage()

        globals.project = emptyProject('Captured')
        globals.project.options.soloMode = 'key'
        globals.projectLibrary.projectName = 'Captured'
        globals.projectLibrary.projectIsUserOrFeatured = 'featured'
        globals.currentChordTriggerNote = 'E3'
        globals.currentScaleFilter = 'scale3'
        globals.currentChordSequenceName = 'medium'
        globals.maxChordConfigs = 21

        saveCurrentProject(storage)

        // Pretend the app has since moved on to something else.
        globals.project = emptyProject('Other')
        globals.projectLibrary.projectName = 'Other'
        globals.projectLibrary.projectIsUserOrFeatured = 'user'
        globals.currentChordTriggerNote = undefined
        globals.currentScaleFilter = 'scale1'
        globals.currentChordSequenceName = 'default'
        globals.maxChordConfigs = 7

        assert.equal(restoreCurrentProject(storage), true)
        assert.equal(globals.project.name, 'Captured')
        assert.equal(globals.project.options.soloMode, 'key')
        assert.equal(globals.projectLibrary.projectName, 'Captured')
        assert.equal(globals.projectLibrary.projectIsUserOrFeatured, 'featured')
        assert.equal(globals.currentChordTriggerNote, 'E3')
        assert.equal(globals.currentScaleFilter, 'scale3')
        assert.equal(globals.currentChordSequenceName, 'medium')
        assert.equal(globals.maxChordConfigs, 21)
    })

    it('reports false when there is nothing to restore', () => {
        const storage = fakeStorage()
        assert.equal(restoreCurrentProject(storage), false)
    })

    // Keep this last: initialising the autosave installs a permanent watcher.
    it('autosaves changes after the debounce', async () => {
        vi.useFakeTimers()
        try {
            const storage = fakeStorage()
            initCurrentProjectAutosave(storage)

            globals.project = emptyProject('Autosaved')
            globals.projectLibrary.projectName = 'Autosaved'
            globals.project.songs.default.ids.push(3)

            await nextTick()
            // Still inside the debounce window, so nothing written yet.
            assert.equal(storage.getItem(STORAGE_KEY), null)

            vi.advanceTimersByTime(600)
            const loaded = readCurrentProject(storage)
            assert.equal(loaded.name, 'Autosaved')
            assert.deepEqual(loaded.project.songs.default.ids, [3])
        }
        finally {
            vi.useRealTimers()
        }
    })
})
