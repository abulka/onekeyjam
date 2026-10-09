import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { playChord, playChordOff } from '@/lib/midi/play-chord.js'
import { clearTake } from '@/lib/midi/recorder.js'
import { captureBufferedTake, clearBackgroundCapture } from '@/lib/midi/background-recorder.js'

// Capturing far in the future turns any note that is never closed into an
// obvious stuck note.
const FUTURE_OFFSET_SEC = 100

function chord(id, chordNotes, bassNote) {
    return {
        id,
        name: chordNotes.join(','),
        chord: '',
        chordNotes,
        symbols: [],
        bass: bassNote.replace(/[0-9]/g, ''),
        bassNote,
        scale1: 'C major',
        scale2: 'C major',
        scale3: 'C major',
        scaleNotesOfChord: [],
    }
}

function setupTwoOverlappingChords() {
    // @ts-ignore test shim
    document.broadcastEvent = () => {}
    globals.GM = false
    globals.channel2 = { playNote() {}, stopNote() {} }
    globals.channel3 = { playNote() {}, stopNote() {} }
    globals.project = { name: 'test', chords: [], songs: {}, options: {}, chordSequences: { default: { mml: '', tempo: 120 } } }
    globals.chordTriggerMap = {
        'C3': chord(1, ['C3', 'E3', 'G3'], 'C2'),
        'D3': chord(2, ['A3', 'E3', 'C3'], 'A1'),
    }
    globals.currentChordTriggerNote = 'C3'
    globals.currentScaleFilter = 'scale1'
}

function captureAfter() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000 + FUTURE_OFFSET_SEC
    return captureBufferedTake({ now, windowSec: 120 })
}

describe('play-chord overlapping chords', () => {
    beforeEach(() => {
        clearTake()
        clearBackgroundCapture()
        setupTwoOverlappingChords()
    })

    afterEach(() => {
        clearTake()
        clearBackgroundCapture()
        globals.GM = true
        globals.channel2 = undefined
        globals.channel3 = undefined
    })

    it('buffers the shared note and both basses when chords overlap', () => {
        // Roll from C3 into D3 without releasing C3 first.
        playChord('C3', { originNote: { attack: 0.8 } })
        playChord('D3', { originNote: { attack: 0.8 } })
        // Release C3 while D3 is still held, then release D3.
        playChordOff('C3')
        playChordOff('D3')

        const take = captureAfter()
        assert.ok(take)

        const sharedE3 = take.chords.filter(note => note.midi === 52)  // E3
        assert.equal(sharedE3.length, 2, 'E3 should be buffered for each chord')

        const bassC = take.chords.find(note => note.midi === 36)  // C2
        const bassA = take.chords.find(note => note.midi === 33)  // A1
        assert.ok(bassC, 'first chord bass should be buffered')
        assert.ok(bassA, 'second chord bass should be buffered')

        for (const note of take.chords)
            assert.ok(note.durationTicks < FUTURE_OFFSET_SEC, `note ${note.midi} should be released, not stuck`)
    })
})
