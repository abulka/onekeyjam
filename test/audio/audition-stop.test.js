import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { auditionNotes } from '@/lib/auditionNotes.js'
import { clearTake } from '@/lib/midi/recorder.js'
import { clearBackgroundCapture } from '@/lib/midi/background-recorder.js'

describe('auditionNotes start/stop', () => {
    beforeEach(() => {
        // @ts-ignore test shim
        document.broadcastEvent = () => {}
        clearTake()
        clearBackgroundCapture()
        globals.GM = false
        globals.channel2 = undefined
        globals.channel3 = undefined
        delete globals.pendingChordNoteOffs['C21']
        delete globals.pendingChordBassNoteOffs['C21']
    })

    afterEach(() => {
        clearTake()
        clearBackgroundCapture()
        globals.GM = true
        delete globals.pendingChordNoteOffs['C21']
        delete globals.pendingChordBassNoteOffs['C21']
    })

    it('stops the auditioned chord without throwing', () => {
        assert.doesNotThrow(() => auditionNotes(['D3', 'F3', 'A3', 'C4'], 'D2', true))
        assert.ok('C21' in globals.pendingChordNoteOffs)
        assert.doesNotThrow(() => auditionNotes(['D3', 'F3', 'A3', 'C4'], 'D2', false))
        assert.ok(!('C21' in globals.pendingChordNoteOffs))
        assert.ok(!('C21' in globals.pendingChordBassNoteOffs))
    })

    it('stopping when nothing is sounding is safe', () => {
        assert.doesNotThrow(() => auditionNotes(['D3', 'F3', 'A3', 'C4'], 'D2', false))
    })
})
