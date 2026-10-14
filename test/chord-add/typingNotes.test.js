import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import { resetInspector } from '@/lib/chordInspector.js'
import ChordInspector from '@/components/ChordInspector.vue'

// Committing a row touches the MIDI linking, which is heavy in jsdom.
vi.mock('@/lib/boot-project.js', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, linkProjectToKeyboard: vi.fn() }
})

function installRow() {
    globals.project = buildProject([['C3', 'E3', 'G3']])
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

function customInput(wrapper) {
    return wrapper.find('.voicing-row input[type="text"]')
}

describe('typing chord notes', () => {
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

    it('keeps the raw text while typing and parses it on blur', async () => {
        installRow()
        const trigger = Object.keys(globals.chordTriggerMap)[0]
        globals.currentChordTriggerNote = trigger
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            const input = customInput(wrapper)

            // Focus does not seed the empty custom row.
            await input.trigger('focus')
            assert.equal(input.element.value, '', 'focus leaves the empty field empty')
            assert.equal(globals.chordInspector.voicingMode, 'auto', 'focus alone does not select Custom')

            // Type character by character: the field must not reformat.
            for (const text of ['c', 'c ', 'c e', 'c e ', 'c e g']) {
                await input.setValue(text)
                await nextTick()
                assert.equal(input.element.value, text, `the field keeps the raw text ${JSON.stringify(text)}`)
            }
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'typing selects Custom')
            assert.deepEqual(globals.chordInspector.customNotes, ['C3', 'E3', 'G3'], 'the draft parses the typed notes')

            // Blur reformats to the stored form.
            await input.trigger('blur')
            await nextTick()
            assert.equal(input.element.value, 'C3 E3 G3', 'the field is reformatted on blur')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('reverts to Normalised when an emptied Custom row loses focus', async () => {
        installRow()
        const trigger = Object.keys(globals.chordTriggerMap)[0]
        globals.currentChordTriggerNote = trigger
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            const input = customInput(wrapper)

            await input.trigger('focus')
            await input.setValue('c e g')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom')

            await input.setValue('')
            await input.trigger('blur')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'auto', 'empty custom falls back to Normalised')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Enter keeps a typed voicing that matches the generated one', async () => {
        installRow()
        const trigger = Object.keys(globals.chordTriggerMap)[0]
        globals.currentChordTriggerNote = trigger
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            const input = customInput(wrapper)

            // C E G A is the C6 chord, and the voicing generated for C6 is exactly
            // these notes, so the stored row alone cannot tell the typed voicing
            // apart from the generated one. The panel must still keep the typed one.
            await input.trigger('focus')
            await input.setValue('c e g a')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'typing selects Custom')
            assert.deepEqual(globals.chordInspector.customNotes, ['C3', 'E3', 'G3', 'A3'])

            input.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
            await nextTick()
            await nextTick()

            assert.equal(globals.chordInspector.voicingMode, 'custom', 'the panel keeps Custom after the save')
            assert.deepEqual(globals.chordInspector.customNotes, ['C3', 'E3', 'G3', 'A3'], 'the custom row is kept')
            assert.deepEqual(globals.project.chords[0].chordNotes, ['C3', 'E3', 'G3', 'A3'], 'the row keeps the typed notes')
        }
        finally {
            wrapper.unmount()
        }
    })
})
