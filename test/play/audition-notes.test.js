import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { auditionNotes, normaliseAuditionBass } from '@/lib/auditionNotes.js'
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

    it('sounds the derived bass when given a bare pitch class', () => {
        const bassNotes = []
        globals.channel3 = { playNote: (note) => bassNotes.push(note), stopNote() {} }
        auditionNotes(['E4', 'G4'], 'E', true)
        assert.deepEqual(bassNotes, ['E2'])
    })

    it('sounds the derived bass when no bass is given', () => {
        const bassNotes = []
        globals.channel3 = { playNote: (note) => bassNotes.push(note), stopNote() {} }
        auditionNotes(['F3', 'A3', 'C4'], '', true)
        assert.deepEqual(bassNotes, ['F2'])
    })
})

describe('normaliseAuditionBass', () => {
    it('keeps a bass that already has an octave', () => {
        assert.equal(normaliseAuditionBass('C2', ['C3', 'E3', 'G3']), 'C2')
        assert.equal(normaliseAuditionBass('C#1', ['C3']), 'C#1')
    })

    it('adds the fixed bass octave to a bare pitch class', () => {
        assert.equal(normaliseAuditionBass('C', ['C3', 'E3', 'G3']), 'C2')
        assert.equal(normaliseAuditionBass('D#', []), 'D#2')
    })

    it('derives the bass from the lowest note when none is given', () => {
        assert.equal(normaliseAuditionBass('', ['E4', 'G4']), 'E2')
        assert.equal(normaliseAuditionBass(undefined, ['F3', 'A3', 'C4']), 'F2')
    })

    it('returns empty when there is no bass and no notes', () => {
        assert.equal(normaliseAuditionBass('', []), '')
        assert.equal(normaliseAuditionBass(undefined, undefined), '')
    })
})
