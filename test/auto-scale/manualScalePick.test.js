import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { scaleNameToNotes } from '@/lib/scaleToNotes.js'
import { onNoteOn, onNoteOff, calculateRhBlackNoteModifierNotes } from '@/lib/midi/wire-events.js'
import { setScalePolicy } from '@/lib/change-scale.js'
import { wireScaleFilterShortcuts } from '@/lib/midi/scaleFilterShortcuts.js'
import { Note } from '@/lib/midi/webmidi.js'

/*
 * A manual scale pick (a grid cell click, a 1-4 shortcut or a right-hand black
 * key) must be respected by the follow/shuffle policy for the chord it was made
 * on. Re-triggering that chord keeps the pick; moving to another chord lets the
 * policy choose again.
 */

function configFor(id, chord, chordNotes, scales) {
    const config = { id, name: chord, chord, chordNotes, bassNote: '', bass: '', symbols: chord, scale1: scales[0], scale2: scales[1], scale3: scales[2], scaleNotesOfChord: chordNotes }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

/** The sequence of events fired by clicking a scale-filter cell in the grid. */
function clickCell(triggerNote, scaleFilterNote) {
    onNoteOn({ note: new Note(triggerNote, { attack: 0.5 }) })
    onNoteOff({ note: new Note(triggerNote, { attack: 0.5 }) })
    onNoteOn({ note: new Note(scaleFilterNote, { attack: 0.1 }) })
    onNoteOff({ note: new Note(scaleFilterNote, { attack: 0.1 }) })
}

function triggerChord(note) {
    onNoteOn({ note: new Note(note, { attack: 0.5 }) })
    onNoteOff({ note: new Note(note, { attack: 0.5 }) })
}

describe('manual scale picks vs the follow/shuffle policy', () => {

    beforeEach(() => {
        document.broadcastEvent = () => { }
        globals.keyboard = { name: 'test', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        globals.lhMetaKeys = { lhCsharp: 'C#3', lhDsharp: 'D#3', lhFsharp: 'F#3', lhGsharp: 'G#3', lhAsharp: 'A#3' }
        calculateRhBlackNoteModifierNotes()
        globals.enableLhChordTriggers = true
        globals.scaleFilteringEnabled = true
        globals.GM = false
        globals.channel = undefined
        globals.channel2 = undefined
        globals.channel3 = undefined
        globals.pendingChordNoteOffs = {}
        globals.pendingChordBassNoteOffs = {}
        globals.pendingNoteOffs = {}
        globals.chordTriggerMap = {
            C3: configFor(1, 'Cmaj7', ['C3', 'E3', 'G3', 'B3'], ['C major', 'C lydian', 'C mixolydian']),
            D3: configFor(2, 'Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D minor pentatonic', 'D aeolian']),
        }
        globals.currentChordTriggerNote = 'C3'
        globals.currentScaleFilter = 'scale1'
        globals.scaleFiltering.policy = 'shuffle'
        globals.scaleFiltering.frozen = false
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
        globals.scaleFiltering.autoReason = ''
        globals.scaleFiltering.manualScaleNote = ''
        globals.chordHistory = []
        globals.project = { options: {}, songs: { default: { ids: [1, 2], favourites: [], blacklist: [] } } }
    })

    afterEach(() => {
        globals.scaleFiltering.policy = 'manual'
        globals.scaleFiltering.manualScaleNote = ''
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        globals.currentScaleFilter = 'scale1'
        globals.chordHistory = []
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
    })

    it('selects the clicked cell under shuffle', () => {
        clickCell('D3', 'D#6')
        assert.equal(globals.currentChordTriggerNote, 'D3')
        assert.equal(globals.currentScaleFilter, 'scale2')
        assert.equal(globals.scaleFiltering.autoScaleNotes.length, 0)
        assert.equal(globals.scaleFiltering.manualScaleNote, 'D3')
    })

    it('keeps the manual pick when the same chord is re-triggered', () => {
        clickCell('D3', 'D#6')
        assert.equal(globals.scaleFiltering.manualScaleNote, 'D3')
        triggerChord('D3')
        assert.equal(globals.currentChordTriggerNote, 'D3')
        assert.equal(globals.scaleFiltering.manualScaleNote, 'D3', 'the override is kept for this chord')
        assert.equal(globals.currentScaleFilter, 'scale2')
        assert.equal(globals.scaleFiltering.autoScaleNotes.length, 0, 'the policy must not override the pick')
    })

    it('keeps the manual pick under the follow policy too', () => {
        globals.scaleFiltering.policy = 'follow'
        clickCell('D3', 'F#6')  // scale3, on the F# cell
        assert.equal(globals.currentScaleFilter, 'scale3')
        assert.equal(globals.scaleFiltering.manualScaleNote, 'D3')
        triggerChord('D3')
        assert.equal(globals.currentScaleFilter, 'scale3')
        assert.equal(globals.scaleFiltering.manualScaleNote, 'D3')
    })

    it('respects a 1-4 override on the next chord hit', () => {
        wireScaleFilterShortcuts()
        globals.currentChordTriggerNote = 'D3'
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }))
        assert.equal(globals.currentScaleFilter, 'scale2')
        assert.equal(globals.scaleFiltering.manualScaleNote, 'D3')
        triggerChord('D3')
        assert.equal(globals.currentScaleFilter, 'scale2', 'the shortcut override survives the next chord hit')
        assert.equal(globals.scaleFiltering.autoScaleNotes.length, 0)
    })

    it('resumes the policy when a different chord is triggered', () => {
        clickCell('D3', 'D#6')
        triggerChord('C3')
        assert.equal(globals.currentChordTriggerNote, 'C3')
        assert.equal(globals.scaleFiltering.manualScaleNote, '', 'manual pick applies to one chord only')
        assert.ok(globals.scaleFiltering.autoScaleNotes.length > 0, 'shuffle should choose again')
    })

    it('marks a 1-4 shortcut as a manual pick', () => {
        wireScaleFilterShortcuts()
        globals.currentChordTriggerNote = 'D3'
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3' }))
        assert.equal(globals.currentScaleFilter, 'scale3')
        assert.equal(globals.scaleFiltering.manualScaleNote, 'D3')
    })

    it('releases the manual pick when the policy changes', () => {
        clickCell('D3', 'D#6')
        setScalePolicy('manual')
        assert.equal(globals.scaleFiltering.manualScaleNote, '')
        setScalePolicy('shuffle')
        assert.equal(globals.scaleFiltering.manualScaleNote, '')
    })
})
