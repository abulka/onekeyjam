import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { listKeyboardConfigDetails } from '@/lib/projectLibrary.js'
import { saveCustomKeyboard } from '@/lib/keyboardStore.js'

// A config is identified by its name, which matches a detected device name.
// A saved custom config shadows a built-in config of the same name; there is
// one config per device.
describe('listKeyboardConfigDetails', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
        localStorage.clear()
        globals.keyboardsManifest = [
            { text: 'LPK25', value: '/keyboards/LPK25.json', file: 'LPK25.json' },
        ]
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ name: 'LPK25', description: 'Akai LPK25', lhTriggerOctave: 3, rhJamSoundOctave: 4 }),
        })
    })

    afterEach(() => {
        global.fetch = originalFetch
        localStorage.clear()
    })

    it('lists a built-in config with its description', async () => {
        const details = await listKeyboardConfigDetails()
        assert.equal(details.length, 1)
        assert.equal(details[0].name, 'LPK25')
        assert.equal(details[0].source, 'builtin')
        assert.equal(details[0].description, 'Akai LPK25')
        assert.equal(details[0].overridesBuiltin, false)
    })

    it('a custom config shadows the built-in of the same name', async () => {
        saveCustomKeyboard({ name: 'LPK25', description: 'my settings', lhTriggerOctave: 2, rhJamSoundOctave: 5 })
        const details = await listKeyboardConfigDetails()
        assert.equal(details.length, 1)
        assert.equal(details[0].source, 'custom')
        assert.equal(details[0].overridesBuiltin, true)
        assert.equal(details[0].description, 'my settings')
        assert.equal(details[0].lhTriggerOctave, 2)
        assert.equal(details[0].rhJamSoundOctave, 5)
    })

    it('lists a custom config for an unknown device', async () => {
        saveCustomKeyboard({ name: 'My Keys', lhTriggerOctave: 1, rhJamSoundOctave: 6 })
        const details = await listKeyboardConfigDetails()
        const custom = details.find(detail => detail.name === 'My Keys')
        assert.ok(custom)
        assert.equal(custom.source, 'custom')
        assert.equal(custom.overridesBuiltin, false)
    })
})
