import assert from 'assert'
import { enabledKeyboardNames, isKeyboardEnabled } from '@/lib/boot-project.js'
import { globals } from '@/lib/globals.js'

// Several external keyboards can be live at once, but only those with a config:
// a keyboard with no known octaves cannot be aligned, so the UI offers to add a
// config instead. A config-having keyboard is on unless the user switches it
// off, and the app's own output device is never treated as an input keyboard.
describe('enabled keyboards', () => {
    let savedDetected
    let savedDisabled
    let savedOutput
    let savedAvailable

    beforeEach(() => {
        savedDetected = globals.keyboardsDetected
        savedDisabled = globals.keyboardsDisabled
        savedOutput = globals.myOutput
        savedAvailable = globals.keyboardsAvailable
        globals.keyboardsDetected = []
        globals.keyboardsDisabled = []
        globals.myOutput = undefined
        globals.keyboardsAvailable = ['LPK25', 'SL MkII Port 1']
    })

    afterEach(() => {
        globals.keyboardsDetected = savedDetected
        globals.keyboardsDisabled = savedDisabled
        globals.myOutput = savedOutput
        globals.keyboardsAvailable = savedAvailable
    })

    it('enables every connected keyboard that has a config by default', () => {
        globals.keyboardsDetected = ['LPK25', 'SL MkII Port 1']
        assert.deepEqual(enabledKeyboardNames(), ['LPK25', 'SL MkII Port 1'])
    })

    it('does not enable a connected keyboard that has no config', () => {
        globals.keyboardsDetected = ['Arturia KeyStep 37']
        assert.deepEqual(enabledKeyboardNames(), [])
        assert.equal(isKeyboardEnabled('Arturia KeyStep 37'), false)
    })

    it('excludes keyboards the user switched off', () => {
        globals.keyboardsDetected = ['LPK25', 'SL MkII Port 1']
        globals.keyboardsDisabled = ['LPK25']
        assert.deepEqual(enabledKeyboardNames(), ['SL MkII Port 1'])
        assert.equal(isKeyboardEnabled('LPK25'), false)
        assert.equal(isKeyboardEnabled('SL MkII Port 1'), true)
    })

    it('never treats the app output device as a keyboard', () => {
        globals.myOutput = { name: 'IAC Driver Bus 1' }
        globals.keyboardsAvailable = ['IAC Driver Bus 1', 'LPK25']
        globals.keyboardsDetected = ['IAC Driver Bus 1', 'LPK25']
        assert.deepEqual(enabledKeyboardNames(), ['LPK25'])
        assert.equal(isKeyboardEnabled('IAC Driver Bus 1'), false)
    })
})
