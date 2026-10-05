import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { playChord, playChordOff } from '@/lib/midi/play-chord.js'
import { clearTake } from '@/lib/midi/recorder.js'
import { captureBufferedTake, clearBackgroundCapture } from '@/lib/midi/background-recorder.js'

// A note that is never closed would be stretched to the capture time. Capturing
// 100 seconds in the future makes a stuck note obvious while a properly closed
// note keeps its tiny real duration.
const FUTURE_OFFSET_SEC = 100

function setupChord() {
    // The scale-change path broadcasts a document event; jsdom has no such helper.
    // @ts-ignore test shim
    document.broadcastEvent = () => {}
    globals.GM = false
    globals.channel2 = { playNote() {}, stopNote() {} }
    globals.channel3 = { playNote() {}, stopNote() {} }
    globals.project = { name: 'test', chords: [], songs: {}, options: {}, chordSequences: { default: { mml: '', tempo: 120 } } }
    globals.chordTriggerMap = {
        'C3': {
            id: 1,
            name: 'test chord',
            chord: 'Cmaj7',
            chordNotes: ['E3', 'G3', 'B3', 'D4'],
            symbols: ['Cmaj7/D'],
            bass: 'D2',
            bassNote: 'D2',
            scale1: 'C major',
            scale2: 'C major',
            scale3: 'C major',
            scaleNotesOfChord: [],
        },
    }
    globals.currentChordTriggerNote = 'C3'
    globals.currentScaleFilter = 'scale1'
}

function captureAfter() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000 + FUTURE_OFFSET_SEC
    return captureBufferedTake({ now, windowSec: 120 })
}

describe('play-chord background capture', () => {
    beforeEach(() => {
        clearTake()
        clearBackgroundCapture()
        setupChord()
    })

    afterEach(() => {
        clearTake()
        clearBackgroundCapture()
        globals.GM = true
        globals.channel2 = undefined
        globals.channel3 = undefined
    })

    it('closes chord tones and the bass note in the hidden buffer when not recording', () => {
        playChord('C3', { originNote: { attack: 0.8 } })
        playChordOff('C3')

        assert.equal(globals.recording.isRecording, false)
        const take = captureAfter()
        assert.ok(take)

        const bass = take.chords.find(note => note.midi === 38)  // D2
        assert.ok(bass, 'the bass note should have been buffered')
        // A stuck bass note would run to the capture time (~100 seconds).
        assert.ok(bass.durationTicks < 100, `bass should be released, got ${bass.durationTicks} ticks`)

        const chordTones = take.chords.filter(note => note.midi !== 38)
        assert.equal(chordTones.length, 4)
        for (const note of chordTones)
            assert.ok(note.durationTicks < 100, `chord tone ${note.midi} should be released`)
    })
})
