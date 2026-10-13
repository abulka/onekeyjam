import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import { resetInspector } from '@/lib/chordInspector.js'
import ChordInspector from '@/components/ChordInspector.vue'

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
})
