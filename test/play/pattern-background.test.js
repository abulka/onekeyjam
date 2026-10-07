import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { patternOnNote } from '@/lib/pattern-playback.js'
import { clearTake, captureTakeFromBackground } from '@/lib/midi/recorder.js'
import {
    recordBackgroundNoteOn,
    recordBackgroundNoteOff,
    clearBackgroundCapture,
    backgroundNoteCount,
} from '@/lib/midi/background-recorder.js'

// The pattern loop writes each chord it sounds straight into the hidden
// background buffer, so Flashback Capture recovers exactly what was heard:
// three sounded chords give three chords, never the whole loop.
function wallNow() {
    return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000
}

function setupChords() {
    // The scale-change path broadcasts a document event; jsdom has no such helper.
    // @ts-ignore test shim
    document.broadcastEvent = () => {}
    globals.GM = false
    globals.channel2 = { playNote() {}, stopNote() {} }
    globals.channel3 = { playNote() {}, stopNote() {} }
    globals.project = { name: 'test', chords: [], songs: {}, options: {}, chordSequences: { default: { mml: '', tempo: 120 } } }
    globals.keyboard.lhTriggerOctave = 3
    globals.playBassOnly = false
    globals.playChordOnly = false
    globals.playChordBass = false
    globals.chordTriggerMap = {
        C3: {
            id: 1,
            name: 'C chord',
            chord: 'C',
            chordNotes: ['C4', 'E4', 'G4'],
            symbols: ['C'],
            bass: 'C2',
            bassNote: 'C2',
            scale1: 'C major',
            scale2: 'C major',
            scale3: 'C major',
            scaleNotesOfChord: [],
        },
        D3: {
            id: 2,
            name: 'D chord',
            chord: 'Dm',
            chordNotes: ['D4', 'F4', 'A4'],
            symbols: ['Dm'],
            bass: 'D2',
            bassNote: 'D2',
            scale1: 'D dorian',
            scale2: 'D dorian',
            scale3: 'D dorian',
            scaleNotesOfChord: [],
        },
    }
    globals.currentChordTriggerNote = 'C3'
    globals.currentScaleFilter = 'scale1'
}

describe('pattern background capture', () => {
    beforeEach(() => {
        clearTake()
        clearBackgroundCapture()
        setupChords()
        globals.recording.bpm = 120
        globals.recording.ppq = 480
        globals.recording.suppressCapture = false
        globals.recording.background.enabled = true
        globals.recording.background.windowSec = 120
    })

    afterEach(() => {
        clearTake()
        clearBackgroundCapture()
        globals.GM = true
        globals.channel2 = undefined
        globals.channel3 = undefined
        globals.recording.background.enabled = true
        globals.recording.background.windowSec = 120
    })

    it('captures only the pattern chord that actually sounded', () => {
        const at = wallNow()
        // Row 60 is the C3 trigger with the trigger octave at 3. The D3 row
        // never sounds, so its chord must not appear in the capture.
        patternOnNote({ t: at, g: at + 1, n: 60 })
        recordBackgroundNoteOn('jam', 'E5', 0.8, undefined, at + 0.1)
        recordBackgroundNoteOff('jam', 'E5', at + 0.5)

        const result = captureTakeFromBackground(120, at + 1)
        assert.equal(result.ok, true)
        assert.equal(globals.recording.take.jam.length, 1)
        const midis = globals.recording.take.chords.map(note => note.midi).sort((a, b) => a - b)
        // C chord tones plus the C2 bass; nothing from the unsounded D chord.
        assert.deepEqual(midis, [36, 60, 64, 67])
        for (const note of globals.recording.take.chords)
            assert.equal(note.playedMidi, 48)
        assert.equal(result.noteCount, 5)
    })

    it('captures each sounded chord once, in order', () => {
        const at = wallNow()
        patternOnNote({ t: at, g: at + 1, n: 60 })
        // Row 62 is the D3 trigger.
        patternOnNote({ t: at + 1, g: at + 2, n: 62 })

        const result = captureTakeFromBackground(120, at + 2)
        assert.equal(result.ok, true)
        assert.equal(globals.recording.take.chords.length, 8)
        const starts = [...new Set(globals.recording.take.chords.map(note => note.startTick))].sort((a, b) => a - b)
        assert.equal(starts.length, 2)
        // The D chord starts a second after the C chord at 120 BPM (960 ticks).
        assert.ok(starts[1] - starts[0] >= 900 && starts[1] - starts[0] <= 1020)
    })

    it('keeps the pattern out of the live take while recording', () => {
        const at = wallNow()
        // @ts-ignore test shim for the broadcast the recorder emits
        document.broadcastEvent = () => {}
        globals.recording.isRecording = true
        globals.recording.take = { chords: [], jam: [] }
        globals.recording.held = { chords: {}, jam: {} }
        patternOnNote({ t: at, g: at + 1, n: 60 })
        globals.recording.isRecording = false

        assert.equal(globals.recording.take.chords.length, 0)
        assert.ok(backgroundNoteCount() > 0)
    })
})
