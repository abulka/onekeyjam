import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { scaleNameToNotes } from '@/lib/scaleToNotes.js'
import { getNoteKeyForCode } from '@/lib/midi/piano-key-map.js'
import { keyDownListener } from '@/lib/midi/livePianoKeyboardShortcuts.js'
import { calculateRhBlackNoteModifierNotes } from '@/lib/midi/wire-events.js'

/*
 * The redundant transpose shortcuts: Minus transposes the live chords down a
 * semitone, Shift+Equal (+) transposes up, and Backspace resets all
 * transpositions. Plain = keeps playing the top-octave F# note, and all three
 * keys leave keystrokes alone while typing in a form field. See
 * src/lib/midi/livePianoKeyboardShortcuts.js and src/lib/midi/piano-key-map.js.
 */

function configFor(id, chord, chordNotes, scales) {
    const config = { id, name: chord, chord, chordNotes, bassNote: '', bass: '', symbols: chord, scale1: scales[0], scale2: scales[1], scale3: scales[2], scaleNotesOfChord: chordNotes }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

function press(code, overrides = {}, target = null) {
    const event = new KeyboardEvent('keydown', { code, bubbles: true, ...overrides })
    if (target)
        Object.defineProperty(event, 'target', { value: target })
    let prevented = false
    event.preventDefault = () => { prevented = true }
    keyDownListener(event)
    return { prevented }
}

function textInput() {
    const input = document.createElement('input')
    input.setAttribute('type', 'text')
    return input
}

describe('transpose keys (- / + / Backspace)', () => {

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
        globals.bypass = false  // magic mode
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

    afterEach(() => {
        globals.bypass = false
    })

    it('Minus transposes the live project down a semitone', () => {
        press('Minus')
        assert.equal(globals.transpositionSemitones, -1)
        assert.equal(chordConfig.chord, 'Bmaj7')
    })

    it('Shift+Equal transposes the live project up a semitone', () => {
        press('Equal', { shiftKey: true })
        assert.equal(globals.transpositionSemitones, 1)
        assert.equal(chordConfig.chord, 'Dbmaj7')
    })

    it('holding Minus or Shift+Equal walks several semitones', () => {
        press('Minus', { repeat: true })
        press('Minus', { repeat: true })
        assert.equal(globals.transpositionSemitones, -2)

        press('Equal', { shiftKey: true, repeat: true })
        assert.equal(globals.transpositionSemitones, -1)
    })

    it('plain Equal does not transpose (it plays the F# note)', () => {
        const { prevented } = press('Equal')
        assert.equal(globals.transpositionSemitones, 0)
        assert.equal(chordConfig.chord, 'Cmaj7')
        assert.equal(prevented, false)
        assert.equal(getNoteKeyForCode('Equal', 'magic').offset, 30)
    })

    it('Backspace resets transpositions', () => {
        const events = []
        document.broadcastEvent = (name, detail) => { events.push({ name, detail }) }
        press('Minus')
        assert.equal(globals.transpositionSemitones, -1)

        press('Backspace')
        assert.equal(globals.transpositionSemitones, 0)
        assert.ok(events.some(event => event.name === 'chord-changed'), 'reset broadcasts a chord change')
    })

    it('holding Backspace does not re-reset', () => {
        press('Minus')
        press('Backspace')
        press('Backspace', { repeat: true })
        assert.equal(globals.transpositionSemitones, 0)
    })

    it('transpose works in normal piano mode too', () => {
        globals.bypass = true  // normal piano mode
        press('Minus')
        assert.equal(globals.transpositionSemitones, -1)
        press('Equal', { shiftKey: true })
        assert.equal(globals.transpositionSemitones, 0)
    })

    it('leaves keystrokes alone while typing in a field', () => {
        for (const target of [textInput(), document.createElement('textarea')]) {
            press('Minus', {}, target)
            press('Equal', { shiftKey: true }, target)
            press('Backspace', {}, target)
        }
        assert.equal(globals.transpositionSemitones, 0)
        assert.equal(chordConfig.chord, 'Cmaj7')
    })

    it('ignores Ctrl and Alt variants', () => {
        press('Minus', { ctrlKey: true })
        press('Equal', { shiftKey: true, ctrlKey: true })
        press('Backspace', { altKey: true })
        assert.equal(globals.transpositionSemitones, 0)
        assert.equal(chordConfig.chord, 'Cmaj7')
    })

    it('prevents the default so the keys never type or navigate', () => {
        assert.equal(press('Minus').prevented, true)
        assert.equal(press('Equal', { shiftKey: true }).prevented, true)
        assert.equal(press('Backspace').prevented, true)
    })
})
