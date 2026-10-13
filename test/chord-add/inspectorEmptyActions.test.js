import assert from 'assert'
import { mount } from '@vue/test-utils'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import { autoApplyCaptured, resetInspector } from '@/lib/chordInspector.js'
import ChordInspector from '@/components/ChordInspector.vue'

function installEmpty() {
    globals.project = buildProject([])
    globals.maxChordConfigs = 7
    globals.chordTriggerMap = {}
    globals.idsToDelete = []
    globals.currentChordTriggerNote = undefined
    globals.chordPicker.currentRoot = 'C'
    globals.chordPicker.currentChord = 'M'
    globals.chordPicker.currentBass = 'C'
    globals.chordPicker.currentChordInversion = 0
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    resetInspector()
    rebuildTriggerMap()
}

describe('ChordInspector empty-project actions', () => {
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

    it('shows only Add as new chord when no slot exists', () => {
        installEmpty()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            const buttons = wrapper.findAll('button').map((button) => button.text())
            assert.ok(buttons.some((text) => text.includes('Add as new chord')), 'Add as new chord is shown')
            assert.ok(!buttons.some((text) => text.includes('Save changes')), 'Save changes is hidden with no slot')
            assert.ok(wrapper.text().includes('No chord selected'), 'header shows no selection')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('enables Add after playing with no rows yet', () => {
        installEmpty()
        globals.currentChordBeingJammed.chord = 'G'
        globals.currentChordBeingJammed.chordNotes = ['G3', 'B3', 'D4']
        globals.currentChordBeingJammed.symbols = ['G']
        globals.currentChordBeingJammed.source = 'midi'
        assert.equal(autoApplyCaptured(), true)
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            const add = wrapper.findAll('button').find((button) => button.text().includes('Add as new chord'))
            assert.ok(add, 'Add button exists')
            assert.equal(add.attributes('disabled'), undefined, 'Add is enabled after playing')
            assert.ok(wrapper.text().includes('New chord'), 'header shows the pending chord')
        }
        finally {
            wrapper.unmount()
        }
    })
})
