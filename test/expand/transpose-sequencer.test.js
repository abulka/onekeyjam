import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { transposeChordTriggerMap, circleOfFifthsChordTriggerMap } from '@/lib/transpose.js'
import { resetTranspositionsEtc } from '@/lib/resetState.js'
import { patternOnNote } from '@/lib/pattern-playback.js'
import { rowToTakeNotes } from '@/lib/sequencer-notes.js'
import { expandChordConfig } from '@/lib/expandChordConfig.js'

/*
 * Transposing while the chord sequencer loops must move the chords and the
 * solo together. The sequencer rows are trigger positions, so they sound
 * through globals.chordTriggerMap and already move; the bug was the locked
 * solo states that changeScaleFilter leaves alone. A frozen scale stayed on
 * the old notes while the loop played the new chords, and held solo notes
 * outside the short repair window were left behind.
 */

function setup() {
    // @ts-ignore test shim
    document.broadcastEvent = () => {}
    globals.GM = false
    globals.channel = undefined
    globals.channel2 = { playNote() {}, stopNote() {} }
    globals.channel3 = { playNote() {}, stopNote() {} }
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

    const cCfg = { id: 1, name: 'C', chord: 'C', scale1: 'C major', scale2: 'C major', scale3: 'C major' }
    const gCfg = { id: 2, name: 'G', chord: 'G', scale1: 'G mixolydian', scale2: 'G mixolydian', scale3: 'G mixolydian' }
    expandChordConfig(cCfg)
    expandChordConfig(gCfg)
    globals.chordTriggerMap = { C2: cCfg, D2: gCfg }
    globals.currentChordTriggerNote = 'C2'
}

describe('transpose while the sequencer plays', () => {
    beforeEach(setup)

    afterEach(() => {
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        globals.transpositionSemitones = 0
        globals.scaleFiltering.frozen = false
        globals.scaleFiltering.frozenScaleNotes = []
        globals.scaleOverrideName = ''
        globals.scaleOverrideNotes = []
        globals.pendingNoteOffs = {}
        globals.scaleTriggerMap = {}
    })

    it('moves the sequenced chord and the live scale together', () => {
        patternOnNote({ t: 1000, g: 1001, n: 60 })
        assert.deepEqual([...globals.currentScaleNotes], ['C', 'D', 'E', 'F', 'G', 'A', 'B'])

        transposeChordTriggerMap(1)

        assert.equal(globals.chordTriggerMap.C2.chord, 'DbM')
        assert.deepEqual([...globals.currentScaleNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])
        // Row 60 is the C2 trigger; it now sounds Db.
        const midis = rowToTakeNotes(60).map(note => note.midi).sort((a, b) => a - b)
        assert.deepEqual(midis, [37, 49, 53, 56])

        patternOnNote({ t: 1001, g: 1002, n: 60 })
        assert.deepEqual([...globals.currentScaleNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])
    })

    it('moves a frozen scale with the chords', () => {
        patternOnNote({ t: 1000, g: 1001, n: 60 })
        globals.scaleFiltering.frozen = true
        assert.deepEqual([...globals.scaleFiltering.frozenScaleNotes], ['C', 'D', 'E', 'F', 'G', 'A', 'B'])

        transposeChordTriggerMap(1)

        assert.equal(globals.chordTriggerMap.C2.chord, 'DbM')
        assert.equal(globals.scaleFiltering.frozen, true)
        assert.deepEqual([...globals.scaleFiltering.frozenScaleNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])
        assert.deepEqual([...globals.currentScaleNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])

        patternOnNote({ t: 1001, g: 1002, n: 60 })
        assert.deepEqual([...globals.currentScaleNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])
    })

    it('moves a ScalePicker override instead of clearing it', () => {
        patternOnNote({ t: 1000, g: 1001, n: 60 })
        globals.scaleOverrideName = 'C major'
        globals.scaleOverrideNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

        transposeChordTriggerMap(1)

        assert.equal(globals.scaleOverrideName, 'Db major')
        assert.deepEqual([...globals.scaleOverrideNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])
        assert.deepEqual([...globals.currentScaleNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])
    })

    it('moves a held solo note even outside the short repair window', () => {
        patternOnNote({ t: 1000, g: 1001, n: 60 })
        const before = globals.scaleTriggerMap.E4
        assert.ok(before)
        // A solo note held long before the transpose, well outside 40 ms.
        globals.pendingNoteOffs = {
            E4: { allowedNote: before, velocity: 0.7, startedAt: performance.now() - 5000 },
        }

        transposeChordTriggerMap(1)

        const after = globals.scaleTriggerMap.E4
        assert.notEqual(after, before)
        assert.equal(globals.pendingNoteOffs.E4.allowedNote, after)
    })

    it('moves a frozen scale on a circle-of-fifths transpose', () => {
        patternOnNote({ t: 1000, g: 1001, n: 60 })
        globals.scaleFiltering.frozen = true

        circleOfFifthsChordTriggerMap(1)

        // C major up a fifth is G major.
        assert.deepEqual([...globals.scaleFiltering.frozenScaleNotes], ['G', 'A', 'B', 'C', 'D', 'E', 'F#'])
        assert.deepEqual([...globals.currentScaleNotes], ['G', 'A', 'B', 'C', 'D', 'E', 'F#'])
    })

    it('restores a frozen scale on reset', () => {
        // Reset restores from the written project chords, so keep them.
        globals.project.chords = Object.values(globals.chordTriggerMap).map(config => JSON.parse(JSON.stringify(config)))
        patternOnNote({ t: 1000, g: 1001, n: 60 })
        globals.scaleFiltering.frozen = true

        transposeChordTriggerMap(1)
        assert.deepEqual([...globals.scaleFiltering.frozenScaleNotes], ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])

        resetTranspositionsEtc()

        assert.equal(globals.transpositionSemitones, 0)
        assert.deepEqual([...globals.scaleFiltering.frozenScaleNotes], ['C', 'D', 'E', 'F', 'G', 'A', 'B'])
        assert.deepEqual([...globals.currentScaleNotes], ['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    })
})
