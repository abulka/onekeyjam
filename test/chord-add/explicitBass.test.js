// @ts-check
// The Bass field is the user's own: nothing auto-fills it. A blank bass still
// sounds as the voicing's low root, derived when the chord is saved.
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    setNotesFromText,
    setBass,
    setIdentity,
    chooseNormalised,
    chooseCustom,
    saveDraft,
    resetInspector,
} from '@/lib/chordInspector.js'

function makeProject() {
    const project = buildProject([
        ['C3', 'E3', 'G3'],
        ['F3', 'A3', 'C4'],
        ['G3', 'B3', 'D4'],
    ])
    project.name = 'explicit bass test'
    return project
}

function install(project) {
    globals.project = project
    globals.maxChordConfigs = 3
    globals.chordTriggerMap = {}
    globals.idsToDelete = []
    globals.currentChordTriggerNote = undefined
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    resetInspector()
    rebuildTriggerMap()
}

describe('the Bass field is explicit', () => {
    let saved

    beforeEach(() => {
        // @ts-ignore
        document.broadcastEvent = () => {}
        saved = {
            project: globals.project,
            maxChordConfigs: globals.maxChordConfigs,
            chordTriggerMap: globals.chordTriggerMap,
            currentChordTriggerNote: globals.currentChordTriggerNote,
            chordPicker: JSON.parse(JSON.stringify(globals.chordPicker)),
            inspector: JSON.parse(JSON.stringify(globals.chordInspector)),
            jammed: JSON.parse(JSON.stringify(globals.currentChordBeingJammed)),
        }
    })

    afterEach(() => {
        globals.project = saved.project
        globals.maxChordConfigs = saved.maxChordConfigs
        globals.chordTriggerMap = saved.chordTriggerMap
        globals.currentChordTriggerNote = saved.currentChordTriggerNote
        globals.chordPicker = saved.chordPicker
        globals.chordInspector = saved.inspector
        globals.currentChordBeingJammed.chord = saved.jammed.chord
        globals.currentChordBeingJammed.chordNotes = saved.jammed.chordNotes
        globals.currentChordBeingJammed.symbols = saved.jammed.symbols
        globals.currentChordBeingJammed.bass = saved.jammed.bass
        globals.currentChordBeingJammed.source = saved.jammed.source
    })

    it('starts blank and typing notes never fills it', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        assert.equal(globals.chordPicker.currentBass, '', 'blank after loading a derived-bass row')

        assert.equal(setNotesFromText('C#3 E3 A3 F3'), true)
        assert.equal(globals.chordPicker.currentBass, '', 'typing notes leaves the bass blank')
        assert.equal(globals.chordInspector.customNotes.length, 4)
    })

    it('an explicit bass survives note edits and voicing switches but not a chord change', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        setBass('D')
        assert.equal(globals.chordPicker.currentBass, 'D')

        // Notes for the same C major chord keep it.
        setNotesFromText('C3 E3 G3')
        assert.equal(globals.chordPicker.currentBass, 'D', 'typing the same chord keeps the explicit bass')

        chooseNormalised()
        chooseCustom()
        assert.equal(globals.chordPicker.currentBass, 'D', 'switching voicings keeps the explicit bass')

        // A different chord clears it: the bass belongs to the chord.
        setIdentity('F', 'M')
        assert.equal(globals.chordPicker.currentBass, '', 'changing the chord clears the bass')

        setBass('D')
        setNotesFromText('C#3 E3 A3 F3')
        assert.equal(globals.chordPicker.currentBass, '', 'typing a different chord clears the bass')
    })

    it('adding to the grid fills in the derived low root', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        assert.equal(setNotesFromText('C3 E3 G3'), true)
        assert.equal(globals.chordPicker.currentBass, '', 'the field is still blank before saving')
        assert.equal(saveDraft(), true)

        const stored = globals.chordTriggerMap['C3']
        assert.equal(stored.bassNote, 'C2', 'the grid row gets the derived low root')
        assert.ok(!stored.bass, 'the explicit Bass field stays blank')
    })

    it('saving an explicit bass stores it as the chosen bass', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        setBass('D')
        assert.equal(setNotesFromText('C3 E3 G3'), true)
        assert.equal(saveDraft(), true)

        const stored = globals.chordTriggerMap['C3']
        assert.equal(stored.bass, 'D', 'the chosen bass is stored')
        assert.equal(stored.bassNote, 'D2')
    })
})
