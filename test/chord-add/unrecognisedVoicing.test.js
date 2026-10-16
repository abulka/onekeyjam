// @ts-check
// Regression: a played voicing Tonal cannot recognise (E4 F4 B4) must not
// inherit the selected grid row's chord name or symbol list. It is named from
// its lowest played note instead (EM), and the exact notes are kept.
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    autoApplyCaptured,
    saveDraft,
    headerSymbol,
    resetInspector,
} from '@/lib/chordInspector.js'

function install() {
    globals.project = buildProject([
        ['C3', 'E3', 'G3'],
        ['F#3', 'A#3', 'C#4'],
    ])
    globals.maxChordConfigs = 3
    globals.chordTriggerMap = {}
    globals.currentChordTriggerNote = undefined
    const j = globals.currentChordBeingJammed
    j.chord = ''
    j.chordNotes = []
    j.symbols = []
    j.bass = ''
    j.tonic = ''
    j.type = ''
    j.source = ''
    j.stale = true
    resetInspector()
    rebuildTriggerMap()
}

/** The state the detection module leaves for a voicing Tonal cannot name. */
function playUnrecognised(notes = ['E4', 'F4', 'B4']) {
    const j = globals.currentChordBeingJammed
    j.chord = ''
    j.symbols = []
    j.bass = ''
    j.tonic = ''
    j.type = ''
    j.chordNotes = notes
    j.source = 'midi'
    j.stale = true
}

function playRecognised(chord, notes) {
    const j = globals.currentChordBeingJammed
    j.chord = chord
    j.symbols = [chord]
    j.tonic = chord[0]
    j.type = ''
    j.bass = ''
    j.chordNotes = notes
    j.source = 'midi'
    j.stale = false
}

/** The unrecognised voicing's row, identified by its F: no other row has one. */
function unrecognisedRow() {
    return Object.values(globals.chordTriggerMap)
        .find(c => c.chordNotes.includes('F4') && c.chordNotes.includes('B4'))
}

describe('unrecognised voicing naming', () => {
    let saved

    beforeEach(() => {
        // @ts-ignore jsdom has no custom event helper; the inspector broadcasts through it.
        document.broadcastEvent = () => {}
        saved = {
            project: globals.project,
            maxChordConfigs: globals.maxChordConfigs,
            chordTriggerMap: globals.chordTriggerMap,
            currentChordTriggerNote: globals.currentChordTriggerNote,
            chordPicker: JSON.parse(JSON.stringify(globals.chordPicker)),
            inspector: JSON.parse(JSON.stringify(globals.chordInspector)),
        }
    })

    afterEach(() => {
        globals.project = saved.project
        globals.maxChordConfigs = saved.maxChordConfigs
        globals.chordTriggerMap = saved.chordTriggerMap
        globals.currentChordTriggerNote = saved.currentChordTriggerNote
        globals.chordPicker = saved.chordPicker
        globals.chordInspector = saved.inspector
    })

    it('names the voicing from its lowest note, not the selected row', () => {
        install()
        const rows = Object.keys(globals.chordTriggerMap)
        openForSlot(rows[1])            // select the F# row
        globals.chordInspector.open = true

        playUnrecognised()
        autoApplyCaptured()

        assert.equal(headerSymbol(), 'EM', 'the header names it from the lowest played note')

        saveDraft()
        const row = unrecognisedRow()
        assert.deepEqual(row.chordNotes, ['E4', 'F4', 'B4'], 'the exact notes are kept')
        assert.equal(row.chord, 'EM', 'named from the lowest note, not the F# row')
        assert.equal(row.symbols, 'EM', 'the symbol list does not inherit the F# row aliases')
    })

    it('does not inherit a previously played chord name', () => {
        install()
        const rows = Object.keys(globals.chordTriggerMap)
        openForSlot(rows[0])
        globals.chordInspector.open = true

        playRecognised('Cmaj7', ['C4', 'E4', 'G4', 'B4'])
        autoApplyCaptured()
        assert.equal(headerSymbol(), 'Cmaj7')
        saveDraft()

        playUnrecognised()
        autoApplyCaptured()
        assert.equal(headerSymbol(), 'EM', 'the Cmaj7 name must not linger')

        saveDraft()
        assert.equal(unrecognisedRow().chord, 'EM')
    })

    it('keeps the detected name for a recognised voicing', () => {
        install()
        const rows = Object.keys(globals.chordTriggerMap)
        openForSlot(rows[1])            // select the F# row
        globals.chordInspector.open = true

        playRecognised('Em', ['E4', 'G4', 'B4'])
        autoApplyCaptured()

        assert.equal(headerSymbol(), 'Em', 'a recognised voicing keeps its detected name')
    })
})
