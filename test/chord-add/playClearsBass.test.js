// @ts-check
// A slash bass must not linger: playing a chord or changing the chord identity
// clears it, while note edits and voicing switches keep it.
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    autoApplyCaptured,
    setNotesFromText,
    setBass,
    setIdentity,
    renameDraft,
    chooseCustom,
    transposeDraft,
    headerSymbol,
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

function play(chord, notes, symbols) {
    globals.currentChordBeingJammed.chord = chord
    globals.currentChordBeingJammed.chordNotes = [...notes]
    globals.currentChordBeingJammed.symbols = [...symbols]
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = 'midi'
}

describe('a played or replaced chord clears the bass', () => {
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

    it('playing a new chord clears an explicit slash bass', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        setBass('F')
        assert.equal(headerSymbol(), 'CM/F')

        play('Em7no5', ['D4', 'E4', 'G4'], ['Em7no5'])
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordPicker.currentBass, '', 'the stale /F is cleared')
        assert.ok(!headerSymbol().includes('/'), 'the header no longer shows a slash')
    })

    it('playing a new chord clears an automatically applied slash bass', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        assert.equal(setNotesFromText('G3 C4 E4'), true)
        assert.equal(globals.chordPicker.currentBass, 'G', 'typed notes applied the detected slash')

        play('Em7no5', ['D4', 'E4', 'G4'], ['Em7no5'])
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordPicker.currentBass, '', 'the automatic slash is cleared on a new play')
    })

    it('changing the chord identity clears the bass', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true

        setBass('F')
        setIdentity('G', 'M')
        assert.equal(globals.chordPicker.currentBass, '', 'a Root/Chord change clears the bass')

        setBass('F')
        chooseCustom()
        renameDraft('A', 'm')
        assert.equal(globals.chordPicker.currentBass, '', 'a rename clears the bass')

        setBass('F')
        transposeDraft(1)
        assert.equal(globals.chordPicker.currentBass, '', 'a transpose clears the bass')
    })
})
