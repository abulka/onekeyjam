import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import { isDirty, resetInspector } from '@/lib/chordInspector.js'
import ChordInspector from '@/components/ChordInspector.vue'

/*
 * What each commit writes, and what the panel shows afterwards.
 *
 * Both halves matter. A commit could store the right row and still leave the
 * panel claiming the other voicing, which is a bug the user sees even though the
 * saved data is correct. Every case here therefore asserts the row and the panel.
 */

// Committing touches the MIDI linking, which is heavy in jsdom.
vi.mock('@/lib/boot-project.js', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, linkProjectToKeyboard: vi.fn() }
})

function install() {
    globals.project = buildProject([['C3', 'E3', 'G3'], ['D3', 'F3', 'A3']])
    globals.maxChordConfigs = 7
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

/** Type into the custom notes field, one keystroke at a time like a person. */
async function typeNotes(wrapper, text) {
    const input = wrapper.find('.notes-input')
    input.element.focus()
    for (let i = 1; i <= text.length; i++) {
        await input.setValue(text.slice(0, i))
        await nextTick()
    }
    return input
}

function storedRow(slotId) {
    return globals.project.chords.find(chord => chord.id === slotId)
}

describe('commit outcomes in Edit Chords', () => {
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

    it('Enter stores a typed voicing that differs from the generated one, and stays Custom', async () => {
        install()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            const slotId = globals.chordInspector.slotId

            const input = await typeNotes(wrapper, 'c4 e4 g4 a4')
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'typing selects Custom')

            input.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
            await nextTick()
            await nextTick()

            assert.deepEqual(storedRow(slotId).chordNotes, ['C4', 'E4', 'G4', 'A4'], 'the typed notes are the row')
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'the panel still shows Custom')
            assert.deepEqual(globals.chordInspector.customNotes, ['C4', 'E4', 'G4', 'A4'], 'the custom row is kept')
            assert.equal(isDirty(), false, 'the saved row is not left looking modified')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('the Save button stores a typed voicing, and stays Custom', async () => {
        install()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            const slotId = globals.chordInspector.slotId

            await typeNotes(wrapper, 'c4 e4 g4 a4')
            const save = wrapper.findAll('button').find(button => button.text() === 'Save')
            assert.ok(save, 'the Save button is offered for a dirty row')
            await save.trigger('click')
            await nextTick()
            await nextTick()

            assert.deepEqual(storedRow(slotId).chordNotes, ['C4', 'E4', 'G4', 'A4'], 'the typed notes are the row')
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'the panel still shows Custom')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Enter on a clean row changes nothing', async () => {
        install()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            const slotId = globals.chordInspector.slotId
            const before = JSON.stringify(storedRow(slotId))
            const rowCount = globals.project.chords.length

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
            await nextTick()
            await nextTick()

            assert.equal(globals.project.chords.length, rowCount, 'no row is added')
            assert.equal(JSON.stringify(storedRow(slotId)), before, 'the row is untouched')
            assert.equal(isDirty(), false, 'the row is still clean')
        }
        finally {
            wrapper.unmount()
        }
    })
})
