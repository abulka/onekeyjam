import assert from 'assert'
import { mount } from '@vue/test-utils'
import { beforeEach, afterEach, describe, it, vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { openForSlot, resetInspector } from '@/lib/chordInspector.js'
import ChordInspector from '@/components/ChordInspector.vue'

const Dm7_CONFIG = {
    id: 1,
    name: '',
    chord: 'Dm7',
    chordNotes: ['D3', 'F3', 'A3', 'C4'],
    symbols: 'Dm7',
    bass: 'D',
    scale1: '',
    scale2: '',
    scale3: '',
    scaleNotesOfChord: [],
}

const Gm7_CONFIG = {
    id: 2,
    name: '',
    chord: 'Gm7',
    chordNotes: ['G3', 'Bb3', 'D4', 'F4'],
    symbols: 'Gm7',
    bass: 'G',
    scale1: '',
    scale2: '',
    scale3: '',
    scaleNotesOfChord: [],
}

const AM7B5_CONFIG = {
    id: 3,
    name: '',
    chord: 'Am7b5',
    chordNotes: ['A3', 'C4', 'Eb4', 'G4'],
    symbols: 'Am7b5',
    bass: 'A',
    scale1: '',
    scale2: '',
    scale3: '',
    scaleNotesOfChord: [],
}

function installRows() {
    globals.project = {
        name: 'Delete confirm test',
        chords: [Dm7_CONFIG, Gm7_CONFIG, AM7B5_CONFIG],
        options: {},
        songs: { default: { ids: [1, 2, 3], favourites: [], blacklist: [] } },
    }
    globals.chordTriggerMap = { C3: Dm7_CONFIG, D3: Gm7_CONFIG, E3: AM7B5_CONFIG }
    globals.maxChordConfigs = 3
    globals.idsToDelete = []
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    resetInspector()
}

function rowCount() {
    return globals.project.chords.length
}

describe('ChordInspector delete confirmation', () => {
    let saved

    beforeEach(() => {
        // @ts-ignore
        document.broadcastEvent = () => {}
        saved = {
            project: globals.project,
            chordTriggerMap: globals.chordTriggerMap,
            idsToDelete: globals.idsToDelete,
            chordPicker: JSON.parse(JSON.stringify(globals.chordPicker)),
            inspector: JSON.parse(JSON.stringify(globals.chordInspector)),
            jammed: JSON.parse(JSON.stringify(globals.currentChordBeingJammed)),
        }
    })

    afterEach(() => {
        vi.useRealTimers()
        globals.project = saved.project
        globals.chordTriggerMap = saved.chordTriggerMap
        globals.idsToDelete = saved.idsToDelete
        globals.chordPicker = saved.chordPicker
        globals.chordInspector = saved.inspector
        globals.currentChordBeingJammed.chord = saved.jammed.chord
        globals.currentChordBeingJammed.chordNotes = saved.jammed.chordNotes
        globals.currentChordBeingJammed.symbols = saved.jammed.symbols
        globals.currentChordBeingJammed.bass = saved.jammed.bass
        globals.currentChordBeingJammed.source = saved.jammed.source
    })

    it('asks before deleting and names the row', async () => {
        installRows()
        openForSlot('C3')
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            assert.equal(wrapper.find('.delete-confirm').exists(), false, 'no confirmation at rest')
            await wrapper.find('.delete-action > button').trigger('click')
            const confirm = wrapper.find('.delete-confirm')
            assert.ok(confirm.exists(), 'the confirmation appeared')
            assert.ok(confirm.text().includes('Dm7'), 'it names the chord')
            assert.ok(confirm.text().includes('id 1'), 'it names the row id')
            assert.equal(rowCount(), 3, 'nothing was deleted yet')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('deletes only when the confirmation itself is confirmed', async () => {
        installRows()
        openForSlot('C3')
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await wrapper.find('.delete-action > button').trigger('click')
            await wrapper.find('.delete-confirm-yes').trigger('click')
            assert.equal(rowCount(), 2, 'the row was deleted')
            assert.equal(globals.project.chords[0].id, 2, 'the other rows survived')
            assert.equal(wrapper.find('.delete-confirm').exists(), false, 'the confirmation closed')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('selects the row that follows the deleted one', async () => {
        installRows()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            openForSlot('D3')
            await wrapper.vm.$nextTick()
            await wrapper.find('.delete-action > button').trigger('click')
            await wrapper.find('.delete-confirm-yes').trigger('click')
            assert.equal(rowCount(), 2, 'the row was deleted')
            assert.equal(globals.chordInspector.triggerNote, 'D3', 'the following row took the deleted row\'s trigger')
            assert.equal(globals.chordInspector.slotId, 3, 'the following row (Am7b5) is selected, not the first')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('selects the previous row when the last row is deleted', async () => {
        installRows()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            openForSlot('E3')
            await wrapper.vm.$nextTick()
            await wrapper.find('.delete-action > button').trigger('click')
            await wrapper.find('.delete-confirm-yes').trigger('click')
            assert.equal(rowCount(), 2, 'the row was deleted')
            assert.equal(globals.chordInspector.triggerNote, 'D3', 'the row before it is selected')
            assert.equal(globals.chordInspector.slotId, 2, 'the previous row (Gm7) is selected')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Keep closes the confirmation without deleting', async () => {
        installRows()
        openForSlot('C3')
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await wrapper.find('.delete-action > button').trigger('click')
            const keep = wrapper.find('.delete-confirm-actions button:last-child')
            assert.equal(keep.text(), 'Keep', 'Keep is the second action')
            await keep.trigger('click')
            assert.equal(wrapper.find('.delete-confirm').exists(), false, 'the confirmation closed')
            assert.equal(rowCount(), 3, 'nothing was deleted')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Escape closes the confirmation without deleting or reverting', async () => {
        installRows()
        openForSlot('C3')
        globals.chordPicker.currentRoot = 'G'
        const dirtyRoot = globals.chordPicker.currentRoot
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await wrapper.find('.delete-action > button').trigger('click')
            await wrapper.find('.chord-inspector').trigger('keydown', { key: 'Escape' })
            assert.equal(wrapper.find('.delete-confirm').exists(), false, 'the confirmation closed')
            assert.equal(rowCount(), 3, 'nothing was deleted')
            assert.equal(globals.chordPicker.currentRoot, dirtyRoot, 'the draft was not reverted')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('closes itself after the timeout', async () => {
        installRows()
        openForSlot('C3')
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            vi.useFakeTimers()
            await wrapper.find('.delete-action > button').trigger('click')
            assert.ok(wrapper.find('.delete-confirm').exists(), 'the confirmation appeared')
            vi.advanceTimersByTime(5000)
            await wrapper.vm.$nextTick()
            assert.equal(wrapper.find('.delete-confirm').exists(), false, 'the confirmation timed out')
            assert.equal(rowCount(), 3, 'nothing was deleted')
        }
        finally {
            wrapper.unmount()
        }
    })
})
