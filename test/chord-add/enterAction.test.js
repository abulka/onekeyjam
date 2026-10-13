// @ts-check
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    autoApplyCaptured,
    resolveEnterAction,
    resetInspector,
} from '@/lib/chordInspector.js'

function makeProject() {
    const project = buildProject([
        ['C3', 'E3', 'G3'],
        ['F3', 'A3', 'C4'],
        ['G3', 'B3', 'D4'],
    ])
    project.name = 'enter action test'
    return project
}

function resetJammed() {
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
}

function install(project, maxChordConfigs = 3) {
    globals.project = project
    globals.maxChordConfigs = maxChordConfigs
    globals.chordTriggerMap = {}
    globals.idsToDelete = []
    globals.currentChordTriggerNote = undefined
    resetJammed()
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

describe('resolveEnterAction', () => {
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

    it('saves when a highlighted row was played (dirty)', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        play('Dm7', ['D4', 'F4', 'A4', 'C5'], ['Dm7'])
        assert.equal(autoApplyCaptured(), true)
        assert.equal(resolveEnterAction(), 'save')
    })

    it('does nothing on Enter for a clean highlighted row (never duplicates)', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        assert.equal(resolveEnterAction(), 'none')
    })

    it('adds when a chord was played with no rows yet', () => {
        install(buildProject([]))
        play('G', ['G3', 'B3', 'D4'], ['G'])
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordPicker.currentRoot, 'G')
        assert.equal(resolveEnterAction(), 'add')
    })

    it('does nothing on Enter for an empty project with nothing played', () => {
        install(buildProject([]))
        assert.equal(resolveEnterAction(), 'none')
    })

    it('forgets a stale row id and baseline when the project is replaced', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        play('Dm7', ['D4', 'F4', 'A4', 'C5'], ['Dm7'])
        assert.equal(autoApplyCaptured(), true)
        assert.equal(resolveEnterAction(), 'save')

        // Emulate New Project: the project object is replaced and the trigger
        // map rebuilt empty. The component's project watcher calls
        // resetInspector() at the same point.
        globals.project = buildProject([])
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        resetInspector()

        // Nothing stale must offer a save any more.
        assert.equal(resolveEnterAction(), 'none')

        // Playing with no rows offers add, never a dead-row save.
        play('G', ['G3', 'B3', 'D4'], ['G'])
        assert.equal(autoApplyCaptured(), true)
        assert.equal(resolveEnterAction(), 'add')
    })

    it('clears the draft and the played alternative in resetInspector', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        play('Dm7', ['D4', 'F4', 'A4', 'C5'], ['Dm7'])
        assert.equal(autoApplyCaptured(), true)
        resetInspector()
        assert.equal(globals.chordInspector.slotId, null)
        assert.equal(globals.chordInspector.baseline, null)
        assert.deepEqual(globals.chordInspector.notes, [])
        assert.deepEqual(globals.chordInspector.playedNotes, [])
        assert.deepEqual(globals.chordInspector.capturedIgnored, ['D4', 'F4', 'A4', 'C5'])
        assert.equal(globals.chordInspector.open, false)
    })
})
