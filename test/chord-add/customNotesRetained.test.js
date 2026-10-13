// @ts-check
// Regression: a note added to a custom voicing must survive typing and saving,
// and must not be replaced by the normalised voicing. Reproduces the
// "added an F to the C# chord" report.
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    setNotesFromText,
    saveDraft,
    previewAutoVoicing,
    autoNotesFor,
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

describe('added note is kept in the custom voicing', () => {
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

    it('keeps the added F on the draft and in the saved row', () => {
        install()
        openForSlot('C3')
        globals.chordInspector.open = true

        // Start with the chord without the F, then add it.
        assert.equal(setNotesFromText('C#3 E3 A3'), true)
        assert.equal(setNotesFromText('C#3 E3 A3 F3'), true)
        assert.deepEqual(globals.chordInspector.notes, ['C#3', 'E3', 'A3', 'F3'], 'draft keeps the added F')
        assert.equal(globals.chordInspector.voicingMode, 'custom')

        // The normalised voicing is a different register of the same chord; it
        // also contains the F. It must never replace the custom notes on save.
        const auto = autoNotesFor(globals.chordPicker.currentRoot, globals.chordPicker.currentChord, 0)
        assert.ok(auto.some(note => /^F/.test(note)), 'normalised voicing also has the F')
        assert.equal(previewAutoVoicing().notes.join(' '), auto.join(' '))

        saveDraft()
        const stored = globals.chordTriggerMap['C3']
        assert.deepEqual(stored.chordNotes, ['C#3', 'E3', 'A3', 'F3'], 'saved row keeps the added F')
        assert.ok(stored.chordNotes.some(note => note.startsWith('F')), 'the grid row will show the F')
    })
})
