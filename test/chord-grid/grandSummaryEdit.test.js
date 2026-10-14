import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, afterEach, describe, it, vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { openForSlot, selectSlot } from '@/lib/chordInspector.js'
import GrandSummary from '@/components/GrandSummary.vue'

// The grid must not open the inspector itself: only the chord cell's pencil
// does. onNoteOn/onNoteOff are stubbed so a grid click does not touch MIDI.
vi.mock('@/lib/chordInspector.js', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, openForSlot: vi.fn(), selectSlot: vi.fn() }
})

vi.mock('@/lib/midi/wire-events.js', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, onNoteOn: vi.fn(), onNoteOff: vi.fn() }
})

const CHORDS = [
    {
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
    },
    {
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
    },
]

function installProject() {
    globals.project = {
        name: 'Grid pencil test',
        chords: CHORDS,
        options: {},
        songs: { default: { ids: [1, 2], favourites: [], blacklist: [] } },
    }
    globals.chordTriggerMap = { C3: CHORDS[0], D3: CHORDS[1] }
    globals.currentChordTriggerNote = 'C3'
}

describe('GrandSummary row click vs edit pencil', () => {
    let saved

    beforeEach(() => {
        // @ts-ignore
        document.broadcastEvent = () => {}
        saved = {
            project: globals.project,
            chordTriggerMap: globals.chordTriggerMap,
            currentChordTriggerNote: globals.currentChordTriggerNote,
        }
        openForSlot.mockClear()
        selectSlot.mockClear()
        installProject()
    })

    afterEach(() => {
        globals.project = saved.project
        globals.chordTriggerMap = saved.chordTriggerMap
        globals.currentChordTriggerNote = saved.currentChordTriggerNote
    })

    it('a row click selects the row but never opens the inspector', async () => {
        const wrapper = mount(GrandSummary, { attachTo: document.body })
        try {
            await nextTick()
            const row = wrapper.find('#grand-summary > tbody > tr')
            await row.trigger('click')
            assert.equal(selectSlot.mock.calls.length, 1, 'the row was selected')
            assert.equal(selectSlot.mock.calls[0][0], 'C3', 'the clicked row was selected')
            assert.equal(openForSlot.mock.calls.length, 0, 'the inspector did not open')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('the chord cell pencil opens the inspector on its own row', async () => {
        const wrapper = mount(GrandSummary, { attachTo: document.body })
        try {
            await nextTick()
            const rows = wrapper.findAll('#grand-summary > tbody > tr')
            const pencil = rows[1].find('.chord-edit')
            assert.ok(pencil.exists(), 'every row has an edit pencil')
            await pencil.trigger('click')
            assert.equal(openForSlot.mock.calls.length, 1, 'the pencil opened the inspector')
            assert.equal(openForSlot.mock.calls[0][0], 'D3', 'opened on the pencil row')
            assert.equal(selectSlot.mock.calls.length, 0, 'the row click did not also fire')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('hides the pencil on the Perform page, which has no inspector', async () => {
        const wrapper = mount(GrandSummary, {
            attachTo: document.body,
            props: { openInspectorOnSelect: false },
        })
        try {
            await nextTick()
            assert.equal(wrapper.findAll('.chord-edit').length, 0, 'no pencil on Perform')
        }
        finally {
            wrapper.unmount()
        }
    })
})
