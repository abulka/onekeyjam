// @ts-check
// A played chord either matches the normalised voicing (Normalised selected)
// or becomes the custom voicing (Custom selected).
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    autoApplyCaptured,
    resetInspector,
} from '@/lib/chordInspector.js'

function install() {
    globals.project = buildProject([
        ['C3', 'E3', 'G3'],
        ['D3', 'F3', 'A3'],
    ])
    globals.maxChordConfigs = 3
    globals.chordTriggerMap = {}
    globals.currentChordTriggerNote = undefined
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    resetInspector()
    rebuildTriggerMap()
}

function play(chord, notes, symbols, bass = '') {
    globals.currentChordBeingJammed.chord = chord
    globals.currentChordBeingJammed.chordNotes = [...notes]
    globals.currentChordBeingJammed.symbols = [...symbols]
    globals.currentChordBeingJammed.bass = bass
    globals.currentChordBeingJammed.source = 'midi'
}

describe('playing selects a voicing', () => {
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

    it('selects Normalised when the played notes are the normalised voicing', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        // B D F is exactly the normalised Bdim voicing.
        play('Bdim', ['B3', 'D4', 'F4'], ['Bdim'])
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordInspector.voicingMode, 'auto', 'matching notes select Normalised')
    })

    it('selects Custom with the played notes when they differ', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        // D F B is Bdim in the first inversion, so not the normalised voicing.
        play('Bdim', ['D4', 'F4', 'B4'], ['Bdim/D'], 'D')
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordInspector.voicingMode, 'custom', 'differing notes select Custom')
        assert.deepEqual(globals.chordInspector.customNotes, ['D4', 'F4', 'B4'], 'the played notes become the custom voicing')
    })
})
