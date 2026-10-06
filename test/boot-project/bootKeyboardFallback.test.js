import assert from 'assert'
import { bootKeyboard } from '@/lib/boot-project.js'
import { globals } from '@/lib/globals.js'

// Any keyboard should be usable even without a bundled config: it is selected
// under its own device name with default octaves, and can be saved later.
describe('bootKeyboard selection', () => {
    let savedDetected
    let savedKeyboard
    let savedAvailable
    let savedOutput

    beforeEach(() => {
        savedDetected = globals.keyboardsDetected
        savedKeyboard = globals.keyboard
        savedAvailable = globals.keyboardsAvailable
        savedOutput = globals.myOutput
    })

    afterEach(() => {
        globals.keyboardsDetected = savedDetected
        globals.keyboard = savedKeyboard
        globals.keyboardsAvailable = savedAvailable
        globals.myOutput = savedOutput
    })

    it('selects a detected device that has no config', async () => {
        globals.keyboardsDetected = ['Some Unknown Keyboard']
        globals.keyboard = { name: '', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        await bootKeyboard()
        assert.equal(globals.keyboard.name, 'Some Unknown Keyboard')
        assert.equal(globals.keyboard.lhTriggerOctave, 3)
        assert.equal(globals.keyboard.rhJamSoundOctave, 4)
    })

    it('keeps the current choice when it is still connected', async () => {
        globals.keyboardsDetected = ['Some Unknown Keyboard']
        globals.keyboard = { name: 'Some Unknown Keyboard', lhTriggerOctave: 2, rhJamSoundOctave: 5 }
        await bootKeyboard()
        assert.equal(globals.keyboard.name, 'Some Unknown Keyboard')
        assert.equal(globals.keyboard.lhTriggerOctave, 2)
        assert.equal(globals.keyboard.rhJamSoundOctave, 5)
    })

    it('does nothing when no devices are detected', async () => {
        globals.keyboardsDetected = []
        globals.keyboard = { name: 'Kept', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        await bootKeyboard()
        assert.equal(globals.keyboard.name, 'Kept')
    })

    it('prefers a real keyboard over the app output device', async () => {
        globals.myOutput = { name: 'IAC Driver Bus 1' }
        globals.keyboardsDetected = ['IAC Driver Bus 1', 'LPK25']
        globals.keyboard = { name: '', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        await bootKeyboard()
        assert.equal(globals.keyboard.name, 'LPK25')
    })

    it('falls back to the app output device when it is the only input', async () => {
        globals.myOutput = { name: 'IAC Driver Bus 1' }
        globals.keyboardsDetected = ['IAC Driver Bus 1']
        globals.keyboard = { name: '', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        await bootKeyboard()
        assert.equal(globals.keyboard.name, 'IAC Driver Bus 1')
    })
})
