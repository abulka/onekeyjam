import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { resetInspector, autoNotesFor, previewTranspose } from '@/lib/chordInspector.js'
import { auditionNotes } from '@/lib/auditionNotes'
import { clearHoveredPreview, getHoveredPreview } from '@/lib/auditionHover.js'
import ChordInspector from '@/components/ChordInspector.vue'
import ButtonAudition from '@/components/ButtonAudition.vue'

// Record what each audition control actually asks to play.
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

function installMajorRow() {
    const config = {
        id: 1,
        name: '',
        chord: 'C',
        chordNotes: ['C3', 'E3', 'G3'],
        symbols: 'C',
        bass: '',
        scale1: '',
        scale2: '',
        scale3: '',
        scaleNotesOfChord: [],
    }
    globals.project = {
        name: 'Audition wiring test',
        chords: [config],
        options: {},
        songs: { default: { ids: [1], favourites: [], blacklist: [] } },
    }
    globals.chordTriggerMap = { C3: config }
    globals.currentChordTriggerNote = 'C3'
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
        clearHoveredPreview()
    })

    afterEach(() => {
        clearHoveredPreview()
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

    it('each row speaker plays its own voicing, whichever radio is selected', async () => {
        installFmaj9Row()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()

            const expectedAuto = autoNotesFor(
                globals.chordPicker.currentRoot,
                globals.chordPicker.currentChord,
                0,
            )
            const customNotes = ['C3', 'E3', 'G3', 'A3', 'F3']

            // Custom is selected on load; both speakers still target their own row.
            auditionNotes.mockClear()
            await buttonByTitle(wrapper, 'Hear the normalised voicing').trigger('mouseenter')
            assert.deepEqual(notesOfLastAudition(), expectedAuto, 'normalised speaker plays the normalised voicing')
            auditionNotes.mockClear()
            await buttonByTitle(wrapper, 'Hear the custom voicing').trigger('mouseenter')
            assert.deepEqual(notesOfLastAudition(), customNotes, 'custom speaker plays the custom voicing')

            // Switch to Normalised: the speakers keep their own targets.
            await wrapper.find('.voicing-row input[value="normalised"]').setValue(true)
            await nextTick()
            auditionNotes.mockClear()
            await buttonByTitle(wrapper, 'Hear the custom voicing').trigger('mouseenter')
            assert.deepEqual(notesOfLastAudition(), customNotes, 'custom speaker unchanged by the radio')
            auditionNotes.mockClear()
            await buttonByTitle(wrapper, 'Hear the normalised voicing').trigger('mouseenter')
            assert.deepEqual(notesOfLastAudition(), expectedAuto, 'normalised speaker unchanged by the radio')

            // A played voicing that differs offers Capture, which auditions it.
            globals.chordInspector.playedNotes = ['D4', 'F4', 'B4', 'C5']
            globals.chordInspector.playedChord = 'Bdim'
            globals.chordInspector.playedBass = 'D'
            await nextTick()
            const capture = wrapper.findAll('button').find(button => button.text().includes('Capture played notes'))
            assert.ok(capture, 'Capture button appears for differing played notes')
            auditionNotes.mockClear()
            await capture.trigger('mouseenter')
            assert.deepEqual(notesOfLastAudition(), ['D4', 'F4', 'B4', 'C5'], 'Capture auditions the played notes')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('auditions the new chord when a picker combo changes', async () => {
        installFmaj9Row()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            const selects = wrapper.findAll('.identity-row select')

            auditionNotes.mockClear()
            await selects[0].setValue('G')
            await nextTick()
            const expectedAfterRoot = autoNotesFor(globals.chordPicker.currentRoot, globals.chordPicker.currentChord, 0)
            assert.deepEqual(notesOfLastAudition(), expectedAfterRoot, 'root change plays the new normalised chord')
            assert.deepEqual(globals.chordInspector.customNotes, [], 'the old custom voicing is dropped')

            const chordSelect = selects[1]
            const otherChord = chordSelect.findAll('option')
                .map(option => option.element.value)
                .find(value => value !== globals.chordPicker.currentChord)
            auditionNotes.mockClear()
            await chordSelect.setValue(otherChord)
            await nextTick()
            const expectedAfterChord = autoNotesFor(globals.chordPicker.currentRoot, globals.chordPicker.currentChord, 0)
            assert.deepEqual(notesOfLastAudition(), expectedAfterChord, 'chord change plays the new normalised chord')

            auditionNotes.mockClear()
            await selects[2].setValue('G')
            await nextTick()
            assert.ok(auditionNotes.mock.calls.length > 0, 'bass change auditions the chord')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('plays the typed notes, not the normalised voicing, when note entry renames the chord', async () => {
        installMajorRow()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'auto', 'starts on the normalised C major row')

            // C E A is detected as Am, so the picker changes. The typed notes
            // are the custom voicing and are what should sound.
            auditionNotes.mockClear()
            await wrapper.find('.notes-input').setValue('C3 E3 A3')
            await nextTick()
            assert.equal(globals.chordPicker.currentRoot, 'A', 'note entry renamed the chord')
            assert.deepEqual(notesOfLastAudition(), ['C3', 'E3', 'A3'], 'the typed notes play, not the normalised Am')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('auditions when the Random chord button changes the picker', async () => {
        installMajorRow()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            const random = wrapper.findAll('button').find(button => button.text().includes('Random'))
            assert.ok(random, 'Random button exists')

            auditionNotes.mockClear()
            await random.trigger('click')
            await nextTick()
            assert.ok(auditionNotes.mock.calls.length > 0, 'Random auditions the chord it picked')
            assert.ok(notesOfLastAudition().length > 0, 'a chord actually sounds')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('re-resolves a hovered transform against the draft after the click applies it', async () => {
        installMajorRow()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()

            // Hover +1: the preview is "draft plus one semitone".
            const plusOne = buttonByTitle(wrapper, 'Hover to hear one semitone up')
            assert.ok(plusOne, '+1 button exists')
            await plusOne.trigger('mouseenter')

            // Click applies it: the draft moves up, and the applied result is auditioned.
            await plusOne.trigger('mousedown')
            await plusOne.trigger('mouseup')
            await nextTick()
            assert.equal(globals.chordPicker.currentRoot, 'C#', 'the draft moved up a semitone')

            // Releasing backquote stops the draft and resumes the hovered preview.
            auditionNotes.mockClear()
            document.dispatchEvent(new CustomEvent('chord-play', { detail: { state: 'off' } }))
            const resumed = notesOfLastAudition()
            assert.deepEqual(resumed, previewTranspose(1).notes, 'resumes the transform the button now proposes')
            assert.notDeepEqual(
                resumed,
                autoNotesFor(globals.chordPicker.currentRoot, globals.chordPicker.currentChord, 0),
                'not simply the new draft (the stale pre-click preview)',
            )
        }
        finally {
            wrapper.unmount()
        }
    })

    it('a draft-following speaker resumes the current notes after the draft moves', async () => {
        const wrapper = mount(ButtonAudition, {
            attachTo: document.body,
            props: { notes: ['C3', 'E3', 'G3'], bass: 'C' },
        })
        try {
            await nextTick()
            await wrapper.trigger('mouseenter')
            assert.deepEqual(getHoveredPreview(), { notes: ['C3', 'E3', 'G3'], bass: 'C' })

            // The draft moves under the pointer, for example by stepping the
            // trigger with the arrow keys: the prop follows reactively.
            await wrapper.setProps({ notes: ['D3', 'F3', 'A3'], bass: 'D' })
            await nextTick()
            assert.deepEqual(
                getHoveredPreview(),
                { notes: ['D3', 'F3', 'A3'], bass: 'D' },
                'the resume follows the live prop, not the entry snapshot',
            )
        }
        finally {
            wrapper.unmount()
        }
    })
})
