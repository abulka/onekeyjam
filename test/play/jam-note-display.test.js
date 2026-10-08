import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { jam, jamOff } from '@/lib/midi/jam.js'
import { detectChordsBeingPlayed } from '@/lib/detectChordsBeingPlayed.js'

vi.mock('@/lib/detectChordsBeingPlayed.js', () => ({
    detectChordsBeingPlayed: vi.fn(),
}))

// The live readout (JamNote) shows globals.currentJamNote while a solo note
// sounds. Releasing the note must clear it, otherwise the note and its
// mapping sit on screen misleadingly after the sound has stopped.

describe('jam live readout', () => {
    let savedRecording

    beforeEach(() => {
        savedRecording = globals.recording
        // @ts-ignore test shim
        document.broadcastEvent = () => {}
        globals.GM = false
        globals.channel = { playNote() {}, stopNote() {}, sendNoteOff() {} }
        globals.keyState = { meta: false }
        globals.scaleFilteringEnabled = true
        globals.scaleOverrideName = 'test scale'
        globals.scaleOverrideNotes = ['A', 'C', 'D', 'E', 'G']
        globals.scaleTriggerMap = { A4: 'A3', B4: 'B3' }
        globals.pendingNoteOffs = {}
        globals.currentJamNote = { real: '', mapped: '' }
        globals.recording = { isRecording: false }
        detectChordsBeingPlayed.mockClear()
    })

    afterEach(() => {
        globals.recording = savedRecording
        globals.pendingNoteOffs = {}
        globals.currentJamNote = { real: '', mapped: '' }
        globals.scaleOverrideName = ''
        globals.scaleOverrideNotes = []
    })

    function note(id) {
        return { identifier: id, attack: 0.8 }
    }

    it('shows the mapped note while sounding and clears it on release', () => {
        jam(note('A4'))
        assert.deepEqual({ ...globals.currentJamNote }, { real: 'A4', mapped: 'A3' })
        jamOff(note('A4'))
        assert.deepEqual({ ...globals.currentJamNote }, { real: '', mapped: '' })
    })

    it('keeps the latest note showing when an older legato note is released', () => {
        jam(note('A4'))
        jam(note('B4'))
        assert.equal(globals.currentJamNote.real, 'B4')
        jamOff(note('A4'))
        assert.equal(globals.currentJamNote.real, 'B4')
        assert.equal(globals.currentJamNote.mapped, 'B3')
        jamOff(note('B4'))
        assert.equal(globals.currentJamNote.real, '')
    })

    it('releasing a note that never sounded changes nothing', () => {
        jam(note('A4'))
        jamOff(note('B4'))
        assert.equal(globals.currentJamNote.real, 'A4')
    })
})
