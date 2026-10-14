import assert from 'assert'
import { mount } from '@vue/test-utils'
import { beforeEach, afterEach, describe, it, vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { openForSlot, isDirty, resetInspector } from '@/lib/chordInspector.js'
import { closeEditChordsAccordion } from '@/lib/editChordsAccordion.js'
import ChordInspector from '@/components/ChordInspector.vue'

// Cancel must discard the draft like Revert and then close the accordion. The
// closing itself is Fomantic/jQuery work, so it is stubbed and spied here.
vi.mock('@/lib/editChordsAccordion.js', () => ({
    openEditChordsAccordion: vi.fn(),
    closeEditChordsAccordion: vi.fn(),
}))

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

function installRow() {
    globals.project = {
        name: 'Cancel action test',
        chords: [FMAJ9_CONFIG],
        options: {},
        songs: { default: { ids: [2], favourites: [], blacklist: [] } },
    }
    globals.chordTriggerMap = { D3: FMAJ9_CONFIG }
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    resetInspector()
}

function buttonByText(wrapper, text) {
    return wrapper.findAll('button').find(button => button.text().trim() === text)
}

describe('ChordInspector Cancel action', () => {
    let saved

    beforeEach(() => {
        // @ts-ignore
        document.broadcastEvent = () => {}
        saved = {
            project: globals.project,
            chordTriggerMap: globals.chordTriggerMap,
            chordPicker: JSON.parse(JSON.stringify(globals.chordPicker)),
            inspector: JSON.parse(JSON.stringify(globals.chordInspector)),
            jammed: JSON.parse(JSON.stringify(globals.currentChordBeingJammed)),
        }
        closeEditChordsAccordion.mockClear()
    })

    afterEach(() => {
        globals.project = saved.project
        globals.chordTriggerMap = saved.chordTriggerMap
        globals.chordPicker = saved.chordPicker
        globals.chordInspector = saved.inspector
        globals.currentChordBeingJammed.chord = saved.jammed.chord
        globals.currentChordBeingJammed.chordNotes = saved.jammed.chordNotes
        globals.currentChordBeingJammed.symbols = saved.jammed.symbols
        globals.currentChordBeingJammed.bass = saved.jammed.bass
        globals.currentChordBeingJammed.source = saved.jammed.source
    })

    it('discards the draft and closes Edit Chords', async () => {
        installRow()
        openForSlot('D3')
        const storedRoot = globals.chordPicker.currentRoot
        // A draft change, exactly what Revert undoes.
        globals.chordPicker.currentRoot = 'G'
        assert.equal(isDirty(), true, 'the draft is dirty before Cancel')

        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            const cancel = buttonByText(wrapper, 'Cancel')
            assert.ok(cancel, 'Cancel button exists')
            await cancel.trigger('click')
            assert.equal(closeEditChordsAccordion.mock.calls.length, 1, 'Edit Chords was told to close')
            assert.equal(globals.chordInspector.open, false, 'the inspector is marked closed')
            assert.equal(isDirty(), false, 'the draft was discarded')
            assert.equal(globals.chordPicker.currentRoot, storedRoot, 'the saved chord is shown again')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('sits to the right of Revert', async () => {
        installRow()
        openForSlot('D3')
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            const actions = wrapper.find('.actions-row')
            const labels = actions.findAll('button').map(button => button.text().trim())
            assert.ok(labels.includes('Revert'), 'Revert is present')
            assert.equal(labels[labels.indexOf('Revert') + 1], 'Cancel', 'Cancel follows Revert')
        }
        finally {
            wrapper.unmount()
        }
    })
})
