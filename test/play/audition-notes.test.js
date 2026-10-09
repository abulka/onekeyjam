import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { auditionNotes } from '@/lib/auditionNotes.js'
import { clearTake } from '@/lib/midi/recorder.js'
import { backgroundNoteCount, clearBackgroundCapture } from '@/lib/midi/background-recorder.js'

// Auditions are previews: they must never reach the live take or the hidden
// Flashback Capture buffer, otherwise the grey audition buttons and the Chord
// Picker's chordPlay() would record notes the user never triggered.
describe('auditionNotes does not record', () => {
    beforeEach(() => {
        clearTake()
        clearBackgroundCapture()
        globals.recording.background.enabled = true
        globals.recording.suppressCapture = false
        globals.recording.bpm = 120
        globals.recording.ppq = 480
        globals.GM = false
        globals.channel2 = { playNote() {}, stopNote() {} }
        globals.channel3 = { playNote() {}, stopNote() {} }
        globals.pendingChordNoteOffs = {}
        globals.pendingChordBassNoteOffs = {}
    })

    afterEach(() => {
        clearTake()
        clearBackgroundCapture()
        globals.GM = true
        globals.channel2 = undefined
        globals.channel3 = undefined
    })

    it('leaves the hidden background buffer empty', () => {
        auditionNotes(['C3', 'E3', 'G3'], 'C2', true)
        auditionNotes(['C3', 'E3', 'G3'], 'C2', false)
        assert.equal(backgroundNoteCount(), 0)
    })

    it('adds nothing to the live take while recording', () => {
        globals.recording.isRecording = true
        globals.recording.take = { chords: [], jam: [] }
        globals.recording.held = { chords: {}, jam: {} }
        globals.recording.startedAt = 0

        auditionNotes(['C3', 'E3', 'G3'], 'C2', true)
        auditionNotes(['C3', 'E3', 'G3'], 'C2', false)

        assert.equal(globals.recording.take.chords.length, 0)
        globals.recording.isRecording = false
    })

    it('restores the previous suppression state', () => {
        globals.recording.suppressCapture = false
        auditionNotes(['C3'], 'C2', true)
        assert.equal(globals.recording.suppressCapture, false)
    })
})
