import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import { resetInspector } from '@/lib/chordInspector.js'
import ChordInspector from '@/components/ChordInspector.vue'

// The component's row actions touch the MIDI linking, which is heavy in jsdom.
// Keep every other export of boot-project real and stub only that call.
vi.mock('@/lib/boot-project.js', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, linkProjectToKeyboard: vi.fn() }
})

function makeProject() {
    const project = buildProject([
        ['C3', 'E3', 'G3'],
        ['F3', 'A3', 'C4'],
        ['G3', 'B3', 'D4'],
    ])
    project.name = 'project reset test'
    return project
}

function resetJammed() {
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
}

function play(chord, notes, symbols) {
    globals.currentChordBeingJammed.chord = chord
    globals.currentChordBeingJammed.chordNotes = [...notes]
    globals.currentChordBeingJammed.symbols = [...symbols]
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = 'midi'
}

function install(project) {
    globals.project = project
    globals.maxChordConfigs = 3
    globals.chordTriggerMap = {}
    globals.idsToDelete = []
    globals.currentChordTriggerNote = undefined
    resetJammed()
    resetInspector()
    rebuildTriggerMap()
}

describe('ChordInspector project replacement and Enter', () => {
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

    it('shows only Add after the project is replaced with a new empty one', async () => {
        install(makeProject())
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            assert.ok(wrapper.text().includes('Row #'), 'a row is being edited first')

            // Emulate File > New: project object replaced, map rebuilt empty.
            globals.project = buildProject([])
            globals.chordTriggerMap = {}
            globals.currentChordTriggerNote = undefined
            rebuildTriggerMap()
            await nextTick()
            await nextTick()

            const buttons = wrapper.findAll('button').map((button) => button.text())
            assert.ok(!buttons.some((text) => text.includes('Save changes')), 'Save changes is gone')
            const add = wrapper.findAll('button').find((button) => button.text().includes('Add as new chord'))
            assert.ok(add, 'Add as new chord is offered')
            assert.ok('disabled' in add.attributes(), 'Add is disabled while nothing is playable')

            // Playing in the fresh project offers a pending new chord.
            play('G', ['G3', 'B3', 'D4'], ['G'])
            await nextTick()
            assert.equal(globals.chordPicker.currentRoot, 'G', 'picker follows the played chord')
            assert.ok(wrapper.text().includes('New chord'), 'header shows the pending chord')
            const addAfterPlay = wrapper.findAll('button').find((button) => button.text().includes('Add as new chord'))
            assert.equal(addAfterPlay.attributes('disabled'), undefined, 'Add is enabled after playing')
            assert.equal(globals.project.chords.length, 0, 'nothing is written without a click')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('blurs the Add button and updates the row on Enter instead of adding again', async () => {
        install(makeProject())
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            assert.equal(globals.chordInspector.slotId, globals.project.chords[0].id, 'first row opened')

            // Play a chord over the selected row, then press Add (a real click
            // leaves the button focused).
            play('Dm7', ['D4', 'F4', 'A4', 'C5'], ['Dm7'])
            await nextTick()
            const rowsAfterPlay = globals.project.chords.length
            const add = wrapper.findAll('button').find((button) => button.text().includes('Add as new chord'))
            add.element.focus()
            await add.trigger('click')
            assert.equal(globals.project.chords.length, rowsAfterPlay + 1, 'Add creates one row')
            assert.notEqual(document.activeElement, add.element, 'Add button is blurred after adding')

            // Play a different chord and commit with Enter.
            play('E7', ['E4', 'G#4', 'B4', 'D5'], ['E7'])
            await nextTick()
            const rowCountBeforeEnter = globals.project.chords.length
            const slotId = globals.chordInspector.slotId
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
            await nextTick()

            assert.equal(globals.project.chords.length, rowCountBeforeEnter, 'Enter does not add a duplicate row')
            const stored = globals.project.chords.find(chord => chord.id === slotId)
            assert.equal(stored.chord, 'E7', 'Enter saved the played chord into the selected row')
        }
        finally {
            wrapper.unmount()
        }
    })
})
