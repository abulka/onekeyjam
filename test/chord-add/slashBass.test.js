// @ts-check
// Slash basses: typed notes that imply one, an explicit '/bass' token, the
// shared picker value, and the header label.
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    setNotesFromText,
    applyNotesEntry,
    applyBassEntry,
    setBass,
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

describe('slash basses', () => {
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

    it('typed notes that imply a slash set the bass and the header shows it', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        assert.equal(globals.chordPicker.currentBass, '', 'starts blank')

        assert.equal(setNotesFromText('G3 C4 E4'), true)
        assert.equal(globals.chordPicker.currentBass, 'G', 'the detected CM/G applies the G bass')
        assert.equal(headerSymbol(), 'CM/G', 'the header names the slash bass')
    })

    it('dropping the slash clears an automatic bass but not an explicit one', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        setNotesFromText('G3 C4 E4')
        assert.equal(globals.chordPicker.currentBass, 'G')

        setNotesFromText('C3 E3 G3')
        assert.equal(globals.chordPicker.currentBass, '', 'the automatic bass is cleared')
        assert.equal(headerSymbol(), 'CM', 'a root or blank bass is omitted')

        // An explicit pick survives later note edits.
        setBass('E')
        setNotesFromText('C3 E3 G3')
        assert.equal(globals.chordPicker.currentBass, 'E', 'the picked bass is kept')
        assert.equal(headerSymbol(), 'CM/E')
    })

    it('an explicit /bass token wins and syncs the shared field', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        const result = applyNotesEntry('C3 E3 G3 /E')
        assert.equal(result.recognised, true)
        assert.equal(result.invalidBass, '')
        assert.deepEqual(globals.chordInspector.customNotes, ['C3', 'E3', 'G3'])
        assert.equal(globals.chordPicker.currentBass, 'E', 'the token sets the shared bass')
        assert.equal(headerSymbol(), 'CM/E')
    })

    it('a root bass is omitted from the header', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        setBass('C')
        assert.equal(headerSymbol(), 'CM', 'CM/C is redundant')
        setNotesFromText('C3 E3 G3')
        assert.equal(headerSymbol(), 'CM')
    })

    it('an unreadable bass entry is reported and leaves the bass alone', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true
        setBass('E')
        assert.equal(applyBassEntry('xyz'), false, 'not a note')
        assert.equal(globals.chordPicker.currentBass, 'E', 'the previous bass is kept')
        assert.equal(applyBassEntry(''), true, 'blank clears it')
        assert.equal(globals.chordPicker.currentBass, '')
    })
})
