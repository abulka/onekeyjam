// With a custom voicing selected, Transpose & invert reshape the notes instead
// of destroying them. Quality steps and reset inversion are disabled, since
// they would replace the voicing. With Normalised selected, nothing changes.
import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    setNotes,
    setBass,
    transposeDraft,
    fifthDraft,
    invertDraft,
    chooseCustom,
    headerSymbol,
    resetInspector,
} from '@/lib/chordInspector.js'
import { auditionNotes } from '@/lib/auditionNotes'
import ChordInspector from '@/components/ChordInspector.vue'

vi.mock('@/lib/auditionNotes', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, auditionNotes: vi.fn() }
})

function install() {
    globals.project = buildProject([
        ['C3', 'E3', 'G3'],
        ['D3', 'F3', 'A3'],
    ])
    globals.maxChordConfigs = 3
    globals.idsToDelete = []
    globals.chordTriggerMap = {}
    globals.currentChordTriggerNote = undefined
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    resetInspector()
    rebuildTriggerMap()
}

describe('custom voicing transpose and invert', () => {
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
        auditionNotes.mockClear()
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

    it('inverts the custom notes up and down instead of replacing them', () => {
        install()
        openForSlot('C3')
        setNotes(['C3', 'E3', 'G3'])
        assert.equal(globals.chordInspector.voicingMode, 'custom')

        invertDraft(1)
        assert.deepEqual(globals.chordInspector.notes, ['E3', 'G3', 'C4'], 'up lifts the lowest note an octave')
        assert.equal(globals.chordInspector.voicingMode, 'custom', 'still a custom voicing')

        setNotes(['C3', 'E3', 'G3'])
        invertDraft(-1)
        assert.deepEqual(globals.chordInspector.notes, ['G2', 'C3', 'E3'], 'down drops the highest note an octave')
    })

    it('transposes the custom notes and the explicit slash bass', () => {
        install()
        openForSlot('C3')
        setNotes(['C3', 'E3', 'G3'])
        setBass('G')

        transposeDraft(1)
        assert.deepEqual(globals.chordInspector.notes, ['C#3', 'F3', 'G#3'])
        assert.equal(globals.chordPicker.currentBass, 'G#', 'the slash bass transposes too')

        setNotes(['C3', 'E3', 'G3'])
        setBass('G')
        fifthDraft(1)
        assert.deepEqual(globals.chordInspector.notes, ['G3', 'B3', 'D4'])
        assert.equal(globals.chordPicker.currentBass, 'D', 'the slash bass moves by a fifth too')
    })

    it('never invents a slash bass when inverting or transposing a custom voicing', () => {
        install()
        openForSlot('C3')
        // D F Bb Eb, the reported case: inversions put a non-root note lowest,
        // and Tonal can detect a slash, but the bass must stay the user's own.
        setNotes(['D3', 'F3', 'Bb3', 'Eb4'])
        assert.equal(globals.chordPicker.currentBass, '', 'blank to start')

        invertDraft(1)
        assert.equal(globals.chordPicker.currentBass, '', 'invert invents no slash bass')
        assert.ok(!headerSymbol().includes('/'), 'header has no slash after invert')

        invertDraft(1)
        assert.equal(globals.chordPicker.currentBass, '', 'still blank after another invert')

        transposeDraft(1)
        assert.equal(globals.chordPicker.currentBass, '', 'transpose invents no slash bass')
        assert.ok(!headerSymbol().includes('/'), 'header has no slash after transpose')
    })

    it('keeps an explicit slash bass through an invert', () => {
        install()
        openForSlot('C3')
        setNotes(['C3', 'E3', 'G3'])
        setBass('G')
        invertDraft(1)
        assert.equal(globals.chordPicker.currentBass, 'G', 'the explicit bass is kept')
    })

    it('leaves a custom voicing alone when the quality steps (disabled in the UI)', () => {
        install()
        openForSlot('C3')
        setNotes(['C3', 'E3', 'G3'])
        chooseCustom()
        // The UI disables step/reset in Custom mode; calling reset inversion
        // directly must not touch the custom notes either.
        invertDraft(0)
        assert.deepEqual(globals.chordInspector.notes, ['C3', 'E3', 'G3'])
        assert.equal(globals.chordInspector.voicingMode, 'custom')
    })
})

describe('ChordInspector custom-mode buttons', () => {
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
        auditionNotes.mockClear()
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

    function buttonByText(wrapper, text) {
        return wrapper.findAll('button').find(button => button.text().trim() === text)
    }

    it('disables the quality-step and reset buttons in Custom mode only', async () => {
        install()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()

            // Normalised on load: everything enabled.
            for (const text of ['Previous chord', 'Next chord', 'Random 🎲', 'Reset inversion']) {
                const button = buttonByText(wrapper, text)
                assert.ok(button, `${text} exists`)
                assert.ok(!('disabled' in button.attributes()), `${text} is enabled when Normalised`)
            }

            // Type a voicing to select Custom.
            await wrapper.find('.notes-input').setValue('C3 E3 G3')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom')

            for (const text of ['Previous chord', 'Next chord', 'Random 🎲', 'Reset inversion']) {
                const button = buttonByText(wrapper, text)
                assert.ok('disabled' in button.attributes(), `${text} is disabled when Custom`)
            }
        }
        finally {
            wrapper.unmount()
        }
    })

    it('hides the inversion tag while Custom is selected', async () => {
        install()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()

            // Invert once in Normalised mode to raise the counter, then the tag shows.
            const invertUp = wrapper.findAll('button').filter(button => button.text().trim() === 'Invert')[1]
            await invertUp.trigger('mousedown')
            await nextTick()
            assert.equal(globals.chordPicker.currentChordInversion, 1)
            assert.ok(wrapper.find('.inv-tag').exists(), 'tag shows for the normalised inversion')

            await wrapper.find('.voicing-row input[value="custom"]').setValue(true)
            await nextTick()
            assert.ok(!wrapper.find('.inv-tag').exists(), 'tag hidden for a custom voicing')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('presses Invert to reshape the custom notes and auditions the result', async () => {
        install()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()
            await wrapper.find('.notes-input').setValue('C3 E3 G3')
            await nextTick()

            const invertUp = wrapper.findAll('button').filter(button => button.text().trim() === 'Invert')[1]
            auditionNotes.mockClear()
            await invertUp.trigger('mousedown')
            await nextTick()
            assert.deepEqual(globals.chordInspector.notes, ['E3', 'G3', 'C4'], 'the custom notes inverted')
            assert.deepEqual(auditionNotes.mock.calls.at(-1)[0], ['E3', 'G3', 'C4'], 'the inverted notes auditioned')
        }
        finally {
            wrapper.unmount()
        }
    })
})
