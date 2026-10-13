import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import { resetInspector, autoNotesFor } from '@/lib/chordInspector.js'
import ChordInspector from '@/components/ChordInspector.vue'

const FMAJ9_CONFIG = {
    id: 2,
    name: 'Fmaj9 (user jam)',
    chord: 'Fmaj9',
    chordNotes: ['C3', 'E3', 'G3', 'A3', 'F3'],
    symbols: 'Fmaj9',
    bass: 'C',
    scale1: '',
    scale2: '',
    scale3: '',
    scaleNotesOfChord: [],
}

function installRows(chords) {
    const project = buildProject(chords)
    globals.project = project
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
    return project
}

function installFmaj9Row() {
    globals.project = {
        name: 'Radio model test',
        chords: [FMAJ9_CONFIG],
        options: {},
        songs: { default: { ids: [2], favourites: [], blacklist: [] } },
    }
    globals.chordTriggerMap = { D3: FMAJ9_CONFIG }
    globals.currentChordTriggerNote = 'D3'
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    resetInspector()
}

function radio(wrapper, value) {
    return wrapper.find(`.voicing-row input[type="radio"][value="${value}"]`)
}
function customInput(wrapper) {
    return wrapper.find('.voicing-row input[type="text"]')
}
function normalisedText(wrapper) {
    return wrapper.find('.voicing-notes').text()
}

describe('ChordInspector two-voicing radios', () => {
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

    it('shows both rows, the custom radio selected for a stored custom voicing', async () => {
        installFmaj9Row()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            assert.equal(radio(wrapper, 'custom').element.checked, true, 'Custom radio is selected')
            assert.equal(radio(wrapper, 'normalised').element.checked, false)
            assert.equal(customInput(wrapper).element.value, 'C3 E3 G3 A3 F3', 'custom field holds the custom notes')
            const expectedAuto = autoNotesFor(globals.chordPicker.currentRoot, globals.chordPicker.currentChord, 0)
            assert.equal(normalisedText(wrapper), expectedAuto.join(' '), 'normalised row is the computed voicing')
            const speakers = wrapper.findAll('button').filter(button => (button.attributes('title') || '').startsWith('Hear the '))
            assert.equal(speakers.length, 2, 'each row has a speaker')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('switching radios keeps both voicings', async () => {
        installFmaj9Row()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()

            await radio(wrapper, 'normalised').setValue(true)
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'auto', 'Normalised selected')
            assert.deepEqual(globals.chordInspector.customNotes, ['C3', 'E3', 'G3', 'A3', 'F3'], 'custom row kept')
            assert.equal(customInput(wrapper).element.value, 'C3 E3 G3 A3 F3', 'custom field still shows its notes')

            await radio(wrapper, 'custom').setValue(true)
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'Custom selected again')
            assert.deepEqual(globals.chordInspector.notes, ['C3', 'E3', 'G3', 'A3', 'F3'], 'custom notes are intact')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('typing in the custom field selects its radio', async () => {
        installRows([['C3', 'E3', 'G3']])
        const trigger = Object.keys(globals.chordTriggerMap)[0]
        globals.currentChordTriggerNote = trigger
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'auto', 'starts normalised')
            assert.equal(radio(wrapper, 'custom').element.checked, false)

            await customInput(wrapper).setValue('C3 E3 A3')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'typing selects Custom')
            assert.equal(radio(wrapper, 'custom').element.checked, true)
            assert.deepEqual(globals.chordInspector.customNotes, ['C3', 'E3', 'A3'])
        }
        finally {
            wrapper.unmount()
        }
    })

    it('picking a different chord regenerates only the normalised row', async () => {
        installFmaj9Row()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            await radio(wrapper, 'normalised').setValue(true)
            await nextTick()

            await wrapper.find('.identity-row select').setValue('G')
            await nextTick()
            const expectedAuto = autoNotesFor(globals.chordPicker.currentRoot, globals.chordPicker.currentChord, 0)
            assert.equal(normalisedText(wrapper), expectedAuto.join(' '), 'normalised row follows the picker')
            assert.deepEqual(globals.chordInspector.customNotes, ['C3', 'E3', 'G3', 'A3', 'F3'], 'custom row untouched')
        }
        finally {
            wrapper.unmount()
        }
    })
})
