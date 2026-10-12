// @ts-check
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    loadDraftFromSlot,
    openForSlot,
    setNotes,
    setNotesFromText,
    revertToAuto,
    setIdentity,
    isDirty,
    saveDraft,
    revertDraft,
    addRow,
    duplicateDraft,
    deleteDraft,
    capturedInfo,
    useCapturedNotes,
    autoNotesFor,
    fifthDraft,
    transposeDraft,
} from '@/lib/chordInspector.js'

function makeProject() {
    const project = buildProject([
        ['C3', 'E3', 'G3'],
        ['F3', 'A3', 'C4'],
        ['G3', 'B3', 'D4'],
    ])
    project.name = 'inspector test'
    return project
}

function install(project, maxChordConfigs = 3) {
    globals.project = project
    globals.maxChordConfigs = maxChordConfigs
    globals.chordTriggerMap = {}
    globals.idsToDelete = []
    globals.currentChordTriggerNote = undefined
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    rebuildTriggerMap()
}

describe('chordInspector draft', () => {
    let saved

    beforeEach(() => {
        // jsdom has no custom event helper; the scale engine broadcasts through it.
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

    it('loads the selected slot into the draft as Auto', () => {
        const project = makeProject()
        install(project)
        const ok = loadDraftFromSlot('C3')
        assert.equal(ok, true)
        assert.equal(globals.chordInspector.slotId, project.chords[0].id)
        assert.deepEqual(globals.chordInspector.notes, project.chords[0].chordNotes)
        assert.equal(globals.chordInspector.voicingMode, 'auto')
        assert.equal(isDirty(), false)
    })

    it('flips to Custom when the notes change and back with Revert to auto', () => {
        install(makeProject())
        loadDraftFromSlot('C3')
        setNotes(['C3', 'F3', 'Bb3'])
        assert.equal(globals.chordInspector.voicingMode, 'custom')
        assert.deepEqual(globals.chordInspector.notes, ['C3', 'F3', 'Bb3'])
        assert.equal(isDirty(), true)

        // The picker follows typed notes, so Revert to auto rebuilds the
        // normalised voicing of the chord those notes spell.
        const expectedAuto = autoNotesFor(
            globals.chordPicker.currentRoot,
            globals.chordPicker.currentChord,
            0,
        )
        revertToAuto()
        assert.equal(globals.chordInspector.voicingMode, 'auto')
        assert.deepEqual(globals.chordInspector.notes, expectedAuto)
    })

    it('parses typed notes without octaves and re-names them', () => {
        install(makeProject())
        loadDraftFromSlot('C3')
        assert.equal(setNotesFromText('F3 A3 C4'), true)
        assert.deepEqual(globals.chordInspector.notes, ['F3', 'A3', 'C4'])
        assert.equal(globals.chordInspector.voicingMode, 'custom')
        assert.equal(globals.chordInspector.symbol, 'FM')
    })

    it('points the picker combos at the notes when they are typed', () => {
        install(makeProject())
        openForSlot('C3')
        assert.equal(setNotesFromText('C Eb G'), true)
        assert.equal(globals.chordPicker.currentRoot, 'C')
        assert.equal(globals.chordPicker.currentChord, 'm')
        assert.equal(globals.chordPicker.currentChordInversion, 0)
        assert.deepEqual(globals.chordInspector.notes, ['C3', 'Eb3', 'G3'])
        assert.equal(globals.chordInspector.voicingMode, 'custom')
    })

    it('moves the picker root when typed notes are a different chord', () => {
        install(makeProject())
        openForSlot('C3')
        setNotesFromText('F A C')
        assert.equal(globals.chordPicker.currentRoot, 'F')
        assert.equal(globals.chordPicker.currentChord, 'M')
    })

    it('simplifies theoretical spellings typed in the notes', () => {
        install(makeProject())
        openForSlot('C3')
        assert.equal(setNotesFromText('E# G# B#'), true)
        // E# -> F and B# -> C, so the chord is F minor, not E#m.
        assert.deepEqual(globals.chordInspector.notes, ['F3', 'G#3', 'C4'])
        assert.equal(globals.chordInspector.symbol, 'Fm')
        assert.equal(globals.chordPicker.currentRoot, 'F')
        assert.equal(globals.chordPicker.currentChord, 'm')
    })

    it('normalises a fifth transposition into the twelve spellings', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordPicker.currentRoot = 'A#'
        globals.chordPicker.currentChord = 'm'
        fifthDraft(1)
        // A# up a fifth is E# before normalisation; it must land on F.
        assert.equal(globals.chordPicker.currentRoot, 'F')
        assert.equal(globals.chordPicker.currentChord, 'm')
    })

    it('normalises a semitone transposition that lands on a theoretical note', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordPicker.currentRoot = 'B#'
        globals.chordPicker.currentChord = 'M'
        transposeDraft(-1)
        assert.equal(globals.chordPicker.currentRoot, 'B')
    })

    it('points the picker at the captured chord when it is applied', () => {
        install(makeProject())
        openForSlot('C3')
        globals.currentChordBeingJammed.chord = 'Dm7'
        globals.currentChordBeingJammed.chordNotes = ['D4', 'F4', 'A4', 'C5']
        globals.currentChordBeingJammed.symbols = ['Dm7']
        globals.currentChordBeingJammed.source = 'midi'
        assert.equal(useCapturedNotes(), true)
        assert.equal(globals.chordPicker.currentRoot, 'D')
        assert.equal(globals.chordPicker.currentChord, 'm7')
    })

    it('resets the voicing to Auto when the identity changes', () => {
        install(makeProject())
        loadDraftFromSlot('C3')
        setNotes(['C3', 'F3', 'Bb3'])
        assert.equal(globals.chordInspector.voicingMode, 'custom')
        setIdentity('D', 'm7')
        assert.equal(globals.chordInspector.voicingMode, 'auto')
        assert.notDeepEqual(globals.chordInspector.notes, ['C3', 'F3', 'Bb3'])
    })

    it('saves in place without changing the row count and never aliases the draft', () => {
        const project = makeProject()
        install(project)
        openForSlot('C3')
        setNotes(['C3', 'F3', 'Bb3', 'Eb4'])
        const draftNotes = globals.chordInspector.notes
        const rowCountBefore = project.chords.length

        assert.equal(saveDraft(), true)
        assert.equal(project.chords.length, rowCountBefore)
        const stored = project.chords.find(chord => chord.id === globals.chordInspector.slotId)
        assert.deepEqual(stored.chordNotes, ['C3', 'F3', 'Bb3', 'Eb4'])
        assert.notStrictEqual(stored.chordNotes, draftNotes)
        assert.equal(isDirty(), false)
    })

    it('reverts an unsaved edit back to the stored chord', () => {
        install(makeProject())
        openForSlot('C3')
        const stored = [...globals.chordInspector.notes]
        setNotes(['C3', 'F3', 'Bb3'])
        assert.equal(isDirty(), true)
        assert.equal(revertDraft(), true)
        assert.deepEqual(globals.chordInspector.notes, stored)
        assert.equal(isDirty(), false)
    })

    it('adds exactly one row and selects it', () => {
        const project = makeProject()
        install(project)
        const rowCountBefore = project.chords.length
        const trigger = addRow()
        assert.equal(project.chords.length, rowCountBefore + 1)
        assert.equal(globals.chordInspector.triggerNote, trigger)
        assert.equal(globals.chordInspector.slotId, project.chords[project.chords.length - 1].id)
        assert.equal(globals.currentChordTriggerNote, trigger)
    })

    it('duplicates the selected slot as a new row', () => {
        const project = makeProject()
        install(project)
        openForSlot('C3')
        setNotes(['C3', 'F3', 'Bb3'])
        const rowCountBefore = project.chords.length
        duplicateDraft()
        assert.equal(project.chords.length, rowCountBefore + 1)
        const added = project.chords[project.chords.length - 1]
        assert.deepEqual(added.chordNotes, ['C3', 'F3', 'Bb3'])
        assert.notStrictEqual(added.chordNotes, globals.chordInspector.notes)
    })

    it('deletes the selected slot and selects a remaining one', () => {
        const project = makeProject()
        install(project)
        openForSlot('C3')
        const rowCountBefore = project.chords.length
        assert.equal(deleteDraft(), true)
        assert.equal(project.chords.length, rowCountBefore - 1)
        assert.equal(globals.chordInspector.open, true)
        assert.ok(globals.chordInspector.triggerNote)
    })

    it('offers a played chord as Captured and applies it only on request', () => {
        install(makeProject())
        openForSlot('C3')
        const before = [...globals.chordInspector.notes]
        globals.currentChordBeingJammed.chord = 'Dm7'
        globals.currentChordBeingJammed.chordNotes = ['D4', 'F4', 'A4', 'C5']
        globals.currentChordBeingJammed.symbols = ['Dm7']
        globals.currentChordBeingJammed.bass = 'D'
        globals.currentChordBeingJammed.source = 'midi'

        assert.equal(capturedInfo().available, true)
        assert.deepEqual(globals.chordInspector.notes, before)
        assert.equal(useCapturedNotes(), true)
        assert.deepEqual(globals.chordInspector.notes, ['D4', 'F4', 'A4', 'C5'])
        assert.equal(globals.chordInspector.voicingMode, 'custom')
        // Once applied it is no longer offered.
        assert.equal(capturedInfo().available, false)
    })

    it('ignores notes that were played before the row was selected', () => {
        install(makeProject())
        globals.currentChordBeingJammed.chord = 'Dm7'
        globals.currentChordBeingJammed.chordNotes = ['D4', 'F4', 'A4', 'C5']
        globals.currentChordBeingJammed.symbols = ['Dm7']
        globals.currentChordBeingJammed.source = 'midi'
        openForSlot('C3')
        assert.equal(capturedInfo().available, false)

        // A fresh play while the row is open is offered.
        globals.currentChordBeingJammed.chordNotes = ['E4', 'G4', 'B4']
        assert.equal(capturedInfo().available, true)
    })
})
