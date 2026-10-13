import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { resetInspector, autoNotesFor } from '@/lib/chordInspector.js'
import { auditionNotes } from '@/lib/auditionNotes'
import ChordInspector from '@/components/ChordInspector.vue'

// Record what each audition control actually asks to play, so no speaker can
// silently point at the wrong voicing.
vi.mock('@/lib/auditionNotes', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, auditionNotes: vi.fn() }
})

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

function installFmaj9Row() {
    globals.project = {
        name: 'Audition wiring test',
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

function buttonByTitle(wrapper, prefix) {
    return wrapper.findAll('button').find(button => (button.attributes('title') || '').startsWith(prefix))
}

function notesOfLastAudition() {
    const calls = auditionNotes.mock.calls
    assert.ok(calls.length > 0, 'an audition was requested')
    return calls[calls.length - 1][0]
}

describe('ChordInspector audition wiring', () => {
    let saved

    beforeEach(() => {
        // @ts-ignore
        document.broadcastEvent = () => {}
        saved = {
            project: globals.project,
            chordTriggerMap: globals.chordTriggerMap,
            currentChordTriggerNote: globals.currentChordTriggerNote,
            chordPicker: JSON.parse(JSON.stringify(globals.chordPicker)),
            inspector: JSON.parse(JSON.stringify(globals.chordInspector)),
            jammed: JSON.parse(JSON.stringify(globals.currentChordBeingJammed)),
        }
        auditionNotes.mockClear()
    })

    afterEach(() => {
        globals.project = saved.project
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

    it('plays the normalised voicing from the chord row and the custom voicing from the notes row', async () => {
        installFmaj9Row()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()

            const expectedAutoNotes = autoNotesFor(
                globals.chordPicker.currentRoot,
                globals.chordPicker.currentChord,
                0,
            )
            const customNotes = ['C3', 'E3', 'G3', 'A3', 'F3']

            // Chord-row speaker: the normalised voicing.
            auditionNotes.mockClear()
            await buttonByTitle(wrapper, 'Hear the normalised voicing').trigger('mouseenter')
            assert.deepEqual(notesOfLastAudition(), expectedAutoNotes, 'chord-row speaker plays the normalised voicing')

            // Notes-row speaker: the custom voicing.
            auditionNotes.mockClear()
            await buttonByTitle(wrapper, 'Hear the custom voicing').trigger('mouseenter')
            assert.deepEqual(notesOfLastAudition(), customNotes, 'notes-row speaker plays the custom voicing')

            // Use normalised voicing link hover: the normalised voicing.
            auditionNotes.mockClear()
            const link = wrapper.findAll('button').find(button => button.text().startsWith('Use normalised voicing'))
            await link.trigger('mouseenter')
            assert.deepEqual(notesOfLastAudition(), expectedAutoNotes, 'switch link auditions the normalised voicing')
        }
        finally {
            wrapper.unmount()
        }
    })
})
