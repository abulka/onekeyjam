import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { scaleNameToNotes } from '@/lib/scaleToNotes.js'
import { keyDownListener } from '@/lib/midi/livePianoKeyboardShortcuts.js'
import { calculateRhBlackNoteModifierNotes } from '@/lib/midi/wire-events.js'

/*
 * The Alt+1..8 app shortcuts (magic/normal piano, live transpose, invert and
 * circle of fifths). See src/lib/midi/livePianoKeyboardShortcuts.js.
 */

function configFor(id, chord, chordNotes, scales) {
    const config = { id, name: chord, chord, chordNotes, bassNote: '', bass: '', symbols: chord, scale1: scales[0], scale2: scales[1], scale3: scales[2], scaleNotesOfChord: chordNotes }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

function pressAltDigit(digit, overrides = {}) {
    const event = new KeyboardEvent('keydown', { code: `Digit${digit}`, altKey: true, ...overrides })
    event.preventDefault = () => {}
    keyDownListener(event)
    return event
}

describe('Alt+1..8 app shortcuts', () => {

    let chordConfig

    beforeEach(() => {
        document.broadcastEvent = () => { }
        globals.keyboard = { name: 'test', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        globals.lhMetaKeys = { lhCsharp: 'C#3', lhDsharp: 'D#3', lhFsharp: 'F#3', lhGsharp: 'G#3', lhAsharp: 'A#3' }
        calculateRhBlackNoteModifierNotes()
        globals.GM = false
        globals.channel = undefined
        globals.channel2 = undefined
        globals.channel3 = undefined
        globals.pendingChordNoteOffs = {}
        globals.pendingChordBassNoteOffs = {}
        globals.pendingNoteOffs = {}
        globals.enableLhChordTriggers = true
        globals.scaleFilteringEnabled = true
        globals.projectKey = { tonic: 'C', type: 'major', source: 'user' }
        globals.project = { options: {}, chords: [], songs: { default: { favourites: [], blacklist: [] } } }
        chordConfig = configFor(1, 'Cmaj7', ['C3', 'E3', 'G3', 'B3'], ['C major', 'C lydian', 'C mixolydian'])
        globals.chordTriggerMap = { C3: chordConfig }
        globals.currentChordTriggerNote = 'C3'
        globals.currentScaleFilter = 'scale1'
        globals.transpositionSemitones = 0
        globals.scaleOverrideName = ''
        globals.scaleOverrideNotes = []
        globals.scaleFiltering.policy = 'manual'
        globals.scaleFiltering.frozen = false
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
        globals.scaleFiltering.manualScaleNote = ''
        globals.scaleFiltering.manualScaleFilter = ''
        globals.chordHistory = []
    })

    it('Alt+1 is magic mode and Alt+2 is normal piano', () => {
        globals.bypass = true
        pressAltDigit(1)
        assert.equal(globals.bypass, false)
        assert.equal(globals.scaleFilteringEnabled, true)
        assert.equal(globals.enableLhChordTriggers, true)

        pressAltDigit(2)
        assert.equal(globals.bypass, true)
        assert.equal(globals.scaleFilteringEnabled, false)
        assert.equal(globals.enableLhChordTriggers, false)
    })

    it('Alt+3 and Alt+4 transpose the live project down and up', () => {
        pressAltDigit(4)
        assert.equal(globals.transpositionSemitones, 1)
        assert.equal(chordConfig.chord, 'Dbmaj7')

        pressAltDigit(3)
        assert.equal(globals.transpositionSemitones, 0)
        assert.equal(chordConfig.chord, 'Cmaj7')
    })

    it('Alt+7 and Alt+8 move down and up the circle of fifths', () => {
        pressAltDigit(8)
        assert.equal(globals.transpositionSemitones, 7)
        assert.equal(chordConfig.chord, 'Gmaj7')

        pressAltDigit(7)
        assert.equal(globals.transpositionSemitones, 2)
        assert.equal(chordConfig.chord, 'Cmaj7')
    })

    it('Alt+6 lifts the lowest note and Alt+5 drops the highest', () => {
        pressAltDigit(6)
        assert.deepEqual(chordConfig.chordNotes, ['E3', 'G3', 'B3', 'C4'])
        assert.equal(chordConfig.bass, 'E')
        assert.equal(globals.transpositionSemitones, 0)

        pressAltDigit(5)
        assert.deepEqual(chordConfig.chordNotes, ['C3', 'E3', 'G3', 'B3'])
        assert.equal(chordConfig.bass, 'C')
    })

    it('ignores Ctrl and Shift variants', () => {
        pressAltDigit(4, { ctrlKey: true })
        pressAltDigit(4, { shiftKey: true })
        assert.equal(globals.transpositionSemitones, 0)
        assert.equal(chordConfig.chord, 'Cmaj7')
    })
})
