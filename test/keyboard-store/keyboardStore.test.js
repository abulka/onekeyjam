import assert from 'assert'
import {
    readCustomKeyboards,
    listCustomKeyboards,
    fetchCustomKeyboard,
    saveCustomKeyboard,
    deleteCustomKeyboard,
    suggestConfigName,
    keyboardSaveActionLabel,
    readDisabledKeyboards,
    saveDisabledKeyboards,
} from '@/lib/keyboardStore.js'

function fakeStorage() {
    const map = new Map()
    return {
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: (key) => map.delete(key),
    }
}

describe('keyboardStore', () => {
    it('starts empty', () => {
        const storage = fakeStorage()
        assert.deepEqual(readCustomKeyboards(storage), {})
        assert.deepEqual(listCustomKeyboards(storage), [])
        assert.equal(fetchCustomKeyboard('LPK25', storage), null)
    })

    it('saves and reads a custom config', () => {
        const storage = fakeStorage()
        saveCustomKeyboard({ name: 'My Keys', lhTriggerOctave: 2, rhJamSoundOctave: 5, description: 'test' }, storage)
        assert.deepEqual(listCustomKeyboards(storage), ['My Keys'])
        assert.deepEqual(fetchCustomKeyboard('My Keys', storage), {
            name: 'My Keys',
            description: 'test',
            lhTriggerOctave: 2,
            rhJamSoundOctave: 5,
        })
    })

    it('applies defaults for missing octaves', () => {
        const storage = fakeStorage()
        saveCustomKeyboard({ name: 'Bare' }, storage)
        const config = fetchCustomKeyboard('Bare', storage)
        assert.equal(config.lhTriggerOctave, 3)
        assert.equal(config.rhJamSoundOctave, 4)
    })

    it('overwrites an existing config', () => {
        const storage = fakeStorage()
        saveCustomKeyboard({ name: 'Keys', lhTriggerOctave: 3, rhJamSoundOctave: 4 }, storage)
        saveCustomKeyboard({ name: 'Keys', lhTriggerOctave: 1, rhJamSoundOctave: 6 }, storage)
        assert.equal(fetchCustomKeyboard('Keys', storage).lhTriggerOctave, 1)
        assert.equal(fetchCustomKeyboard('Keys', storage).rhJamSoundOctave, 6)
    })

    it('deletes a config', () => {
        const storage = fakeStorage()
        saveCustomKeyboard({ name: 'Keys' }, storage)
        deleteCustomKeyboard('Keys', storage)
        assert.equal(fetchCustomKeyboard('Keys', storage), null)
        assert.deepEqual(listCustomKeyboards(storage), [])
    })

    it('recovers from corrupt storage', () => {
        const storage = fakeStorage()
        storage.setItem('onekeyjam.keyboards', 'not json')
        assert.deepEqual(readCustomKeyboards(storage), {})
    })

    it('suggests a short description from the device name', () => {
        assert.equal(suggestConfigName('LPK25'), 'My LPK25')
        assert.equal(suggestConfigName('Arturia MiniLab mkII'), 'My Arturia MiniLab')
        assert.equal(suggestConfigName('Axiom A.I.R. Mini32 MIDI'), 'My Axiom Mini32')
        assert.equal(suggestConfigName('SL MkII Port 1'), 'My SL')
        assert.equal(suggestConfigName(''), '')
    })

    it('uses the suggested name when saving without a description', () => {
        const storage = fakeStorage()
        saveCustomKeyboard({ name: 'LPK25' }, storage)
        assert.equal(fetchCustomKeyboard('LPK25', storage).description, 'My LPK25')
    })

    it('labels the save button for each situation', () => {
        assert.equal(keyboardSaveActionLabel({ hasCustom: false, hasBuiltin: false }), 'Add config for this keyboard')
        assert.equal(keyboardSaveActionLabel({ hasCustom: false, hasBuiltin: true }), 'Save as custom config (replaces built-in)')
        assert.equal(keyboardSaveActionLabel({ hasCustom: true, hasBuiltin: true }), 'Save config')
        assert.equal(keyboardSaveActionLabel({ hasCustom: true, hasBuiltin: false }), 'Save config')
    })

    it('starts with no disabled keyboards', () => {
        assert.deepEqual(readDisabledKeyboards(fakeStorage()), [])
    })

    it('remembers which keyboards are switched off', () => {
        const storage = fakeStorage()
        saveDisabledKeyboards(['LPK25', 'SL MkII Port 1'], storage)
        assert.deepEqual(readDisabledKeyboards(storage), ['LPK25', 'SL MkII Port 1'])
    })

    it('ignores corrupt disabled-keyboard storage', () => {
        const storage = fakeStorage()
        storage.setItem('onekeyjam.keyboardsDisabled', 'not json')
        assert.deepEqual(readDisabledKeyboards(storage), [])
    })
})
