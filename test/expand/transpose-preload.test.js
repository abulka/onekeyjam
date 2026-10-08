import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { transposeChordTriggerMap } from '@/lib/transpose.js'
import { patternOnNote, clearPatternTimers } from '@/lib/pattern-playback.js'
import { expandChordConfig } from '@/lib/expandChordConfig.js'
import { audioContext } from '@/lib/audio/general-midi.js'
import { clearBackgroundCapture, backgroundNoteCount } from '@/lib/midi/background-recorder.js'

vi.mock('@/lib/audio/general-midi.js', async (importOriginal) => {
    const actual = await importOriginal()
    if (!globalThis.__fakeAudioClock)
        globalThis.__fakeAudioClock = { currentTime: 1000, state: 'running' }
    return {
        ...actual,
        audioContext: globalThis.__fakeAudioClock,
    }
})

/*
 * The widget calls patternOnNote about a second before the chord sounds. A
 * transpose pressed in that window must retune the upcoming chord: previously
 * the audio was scheduled immediately from the old map while only the scale
 * state was deferred, so the next chord played in the old key and only the
 * chord after it moved.
 */

function setup() {
    // @ts-ignore test shim
    document.broadcastEvent = () => {}
    globals.GM = false
    globals.channel = undefined
    const chordPlayed = []
    const bassPlayed = []
    globals.channel2 = {
        playNote: (note) => { chordPlayed.push(note) },
        stopNote() {},
    }
    globals.channel3 = {
        playNote: (note) => { bassPlayed.push(note) },
        stopNote() {},
    }
    globals.project = { name: 'test', chords: [], songs: {}, options: {}, chordSequences: { default: { mml: '', tempo: 120 } } }
    globals.projectKey = null
    globals.keyboard.lhTriggerOctave = 2
    globals.keyboard.rhJamSoundOctave = 4
    globals.playBassOnly = false
    globals.playChordOnly = false
    globals.playChordBass = false
    globals.transpositionSemitones = 0
    globals.scaleFilteringEnabled = true
    globals.scaleFiltering.frozen = false
    globals.scaleFiltering.frozenScaleNotes = []
    globals.scaleFiltering.policy = 'manual'
    globals.scaleFiltering.autoScaleName = ''
    globals.scaleFiltering.autoScaleNotes = []
    globals.scaleFiltering.autoReason = ''
    globals.scaleFiltering.manualScaleFilter = ''
    globals.scaleFiltering.manualScaleNote = ''
    globals.scaleOverrideName = ''
    globals.scaleOverrideNotes = []
    globals.currentScaleFilter = 'scale1'
    globals.pendingNoteOffs = {}
    globals.pendingChordNoteOffs = {}
    globals.pendingChordBassNoteOffs = {}
    globals.currentJamNote = { real: '', mapped: '' }
    globals.heldNoteRepair = { enabled: true, windowMs: 40 }
    if (!globals.recording)
        globals.recording = { isRecording: false }
    globals.recording.isRecording = false
    globals.recording.suppressCapture = false
    globals.recording.live = { chords: 0, jam: 0 }
    globals.recording.background = { enabled: true, windowSec: 120 }
    clearBackgroundCapture()

    const cCfg = { id: 1, name: 'C', chord: 'C', scale1: 'C major', scale2: 'C major', scale3: 'C major' }
    expandChordConfig(cCfg)
    globals.chordTriggerMap = { C2: cCfg }
    globals.currentChordTriggerNote = 'C2'
    return { chordPlayed, bassPlayed }
}

describe('transpose during the sequencer preload window', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        globalThis.__fakeAudioClock.currentTime = 1000
    })

    afterEach(() => {
        clearPatternTimers()
        vi.useRealTimers()
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        globals.transpositionSemitones = 0
        globals.pendingNoteOffs = {}
        globals.pendingChordNoteOffs = {}
        globals.pendingChordBassNoteOffs = {}
        globals.scaleTriggerMap = {}
        clearBackgroundCapture()
    })

    it('retunes the upcoming chord instead of playing one more old chord', () => {
        const { chordPlayed, bassPlayed } = setup()
        assert.ok(audioContext)

        // The widget pre-schedules the chord half a second ahead.
        patternOnNote({ t: 1000.5, g: 1002.5, n: 60 })
        // Nothing has sounded yet: audio, counts and capture wait for sound time.
        assert.deepEqual(chordPlayed, [])
        assert.equal(globals.recording.live.chords, 0)
        assert.equal(backgroundNoteCount(), 0)

        // Transpose before the chord sounds, as with the H shortcut.
        transposeChordTriggerMap(1)
        assert.equal(globals.chordTriggerMap.C2.chord, 'DbM')

        // Let the sound time arrive; the audio clock reaches the note time too.
        globalThis.__fakeAudioClock.currentTime = 1000.5
        vi.advanceTimersByTime(600)
        vi.advanceTimersByTime(600)

        // The upcoming chord sounds transposed, not in the old key.
        assert.ok(chordPlayed.length > 0)
        assert.ok(chordPlayed.every(note => ['Db3', 'F3', 'Ab3'].includes(note)), `chord played ${chordPlayed}`)
        assert.deepEqual(bassPlayed, ['Db2'])
        // Scale state agrees with the sounded chord.
        assert.deepEqual([...globals.currentScaleNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])
        assert.equal(globals.currentChordTriggerNote, 'C2')
        // The live count and background capture reflect the sounded chord.
        assert.equal(globals.recording.live.chords, 1)
        assert.ok(backgroundNoteCount() > 0)
    })

    it('defers external MIDI notes to their sound time', () => {
        const { chordPlayed } = setup()

        patternOnNote({ t: 1000.5, g: 1002.5, n: 60 })
        // The hardware synth must not fire a second early from the preload.
        assert.deepEqual(chordPlayed, [])

        globalThis.__fakeAudioClock.currentTime = 1000.5
        vi.advanceTimersByTime(600)
        vi.advanceTimersByTime(600)

        assert.ok(chordPlayed.length > 0)
    })
})
