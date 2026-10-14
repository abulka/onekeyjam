import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import { isDirty, resetInspector } from '@/lib/chordInspector.js'
import { wireScaleFilterShortcuts } from '@/lib/midi/scaleFilterShortcuts.js'
import ChordInspector from '@/components/ChordInspector.vue'

/*
 * Shift+Enter and Shift+/ commit with the Normalised voicing selected first.
 * Plain Enter and plain / keep whatever voicing the Edit Chords panel shows, so
 * a played voicing is still stored exactly when the user wants it.
 */

// The component's row actions touch the MIDI linking, which is heavy in jsdom.
vi.mock('@/lib/boot-project.js', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, linkProjectToKeyboard: vi.fn() }
})

function install(chords) {
    globals.project = buildProject(chords)
    globals.maxChordConfigs = 7
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

/** Emulate playing a chord on the MIDI keyboard. */
function play(chord, notes, symbols, bass = '') {
    globals.currentChordBeingJammed.chord = chord
    globals.currentChordBeingJammed.chordNotes = [...notes]
    globals.currentChordBeingJammed.symbols = [...symbols]
    globals.currentChordBeingJammed.bass = bass
    globals.currentChordBeingJammed.source = 'midi'
}

/** Press a key on an element so it bubbles up to the window listeners. */
function pressOn(element, init) {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
}

describe('Shift+Enter and Shift+/ commit the normalised voicing', () => {
    let saved

    beforeEach(() => {
        // The real index.html helper, so the shortcut tests can flow through a
        // genuine chord-add event instead of the panel handler alone.
        // @ts-ignore
        document.broadcastEvent = (name, detail) => {
            document.dispatchEvent(new CustomEvent(name, { detail }))
        }
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

    it('Shift+Enter updates the row with the normalised voicing', async () => {
        install([['C3', 'E3', 'G3'], ['D3', 'F3', 'A3']])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            const slotId = globals.chordInspector.slotId

            // Bdim in the first inversion, so the played notes are not the
            // normalised voicing and the panel selects Custom.
            play('Bdim', ['D4', 'F4', 'B4'], ['Bdim/D'], 'D')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'custom is selected while editing')

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }))
            await nextTick()

            const stored = globals.project.chords.find(chord => chord.id === slotId)
            assert.deepEqual(stored.chordNotes, ['B3', 'D4', 'F4'], 'Shift+Enter stored the normalised voicing')
            assert.equal(globals.project.chords.length, 2, 'Shift+Enter updates the row instead of adding one')
            assert.equal(globals.chordInspector.voicingMode, 'auto', 'the row is left on Normalised')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('plain Enter still stores the played voicing', async () => {
        install([['C3', 'E3', 'G3'], ['D3', 'F3', 'A3']])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            const slotId = globals.chordInspector.slotId

            play('Bdim', ['D4', 'F4', 'B4'], ['Bdim/D'], 'D')
            await nextTick()

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
            await nextTick()

            const stored = globals.project.chords.find(chord => chord.id === slotId)
            assert.deepEqual(stored.chordNotes, ['D4', 'F4', 'B4'], 'plain Enter kept the played voicing')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Shift+Enter does nothing when Enter would do nothing', async () => {
        install([])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }))
            await nextTick()
            assert.equal(globals.project.chords.length, 0, 'no chord is invented out of an empty draft')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Shift+Enter adds the generated chord when there is no row yet', async () => {
        install([])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()

            // A played voicing with no row: plain Enter would add it exactly, so
            // Shift+Enter must add the generated voicing instead.
            play('Bdim', ['D4', 'F4', 'B4'], ['Bdim/D'], 'D')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'custom is selected while editing')
            assert.equal(globals.project.chords.length, 0, 'no row yet')

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }))
            await nextTick()
            await nextTick()

            assert.equal(globals.project.chords.length, 1, 'one row was added')
            assert.deepEqual(globals.project.chords[0].chordNotes, ['B3', 'D4', 'F4'],
                'the generated voicing was added, not the played one')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Shift+/ adds the new chord with the normalised voicing', async () => {
        install([])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()

            play('Bdim', ['D4', 'F4', 'B4'], ['Bdim/D'], 'D')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'custom is selected while editing')

            document.dispatchEvent(new CustomEvent('chord-add', { detail: { voicing: 'normalised' } }))
            await nextTick()

            assert.equal(globals.project.chords.length, 1, 'one row was added')
            assert.deepEqual(globals.project.chords[0].chordNotes, ['B3', 'D4', 'F4'], 'the generated voicing was stored')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('plain / adds the new chord with the selected voicing', async () => {
        install([])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()

            play('Bdim', ['D4', 'F4', 'B4'], ['Bdim/D'], 'D')
            await nextTick()

            document.dispatchEvent(new CustomEvent('chord-add', { detail: {} }))
            await nextTick()

            assert.equal(globals.project.chords.length, 1, 'one row was added')
            assert.deepEqual(globals.project.chords[0].chordNotes, ['D4', 'F4', 'B4'], 'the custom voicing was stored')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Shift+Enter stores the generated voicing when the notes box text is one the panel rewrites', async () => {
        install([['C3', 'E3', 'G3'], ['D3', 'F3', 'A3']])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            const slotId = globals.chordInspector.slotId
            const input = wrapper.find('.notes-input')

            // 'D4 F4 A4 /F' becomes the custom row 'D4 F4 A4', so the raw text can
            // never equal it again. That used to make the commit re-read the box,
            // fall back to Custom and store the played notes. The notes detect Dm,
            // so the generated voicing differs from the row's C major and this
            // assertion can tell a real save apart from a no-op.
            input.element.focus()
            await input.setValue('D4 F4 A4 /F')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'typing selects Custom')
            assert.deepEqual(globals.chordInspector.customNotes, ['D4', 'F4', 'A4'])

            pressOn(input.element, { key: 'Enter', shiftKey: true })
            await nextTick()
            await nextTick()

            const stored = globals.project.chords.find(chord => chord.id === slotId)
            assert.deepEqual(stored.chordNotes, ['D3', 'F3', 'A3'], 'Shift+Enter stored the generated voicing')
            assert.equal(globals.chordInspector.voicingMode, 'auto', 'the panel stays on Normalised after the commit')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Shift+Enter rewrites a row that stores a custom voicing', async () => {
        install([['C3', 'E3', 'G3'], ['D3', 'F3', 'A3']])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            const slotId = globals.chordInspector.slotId
            const input = wrapper.find('.notes-input')

            input.element.focus()
            await input.setValue('G3 C4 E4')
            await nextTick()
            // Plain Enter stores those notes exactly, so the row is now a clean
            // Custom row and Enter on its own would do nothing.
            pressOn(input.element, { key: 'Enter' })
            await nextTick()
            await nextTick()
            assert.deepEqual(globals.project.chords.find(chord => chord.id === slotId).chordNotes,
                ['G3', 'C4', 'E4'], 'plain Enter stored the custom voicing')
            assert.equal(isDirty(), false, 'the row is clean after plain Enter')

            pressOn(input.element, { key: 'Enter', shiftKey: true })
            await nextTick()
            await nextTick()

            assert.deepEqual(globals.project.chords.find(chord => chord.id === slotId).chordNotes,
                ['C3', 'E3', 'G3'], 'Shift+Enter replaced the custom voicing with the generated one')
        }
        finally {
            wrapper.unmount()
        }
    })

    it('Shift+/ through the real keys adds the generated chord while the notes field has focus', async () => {
        wireScaleFilterShortcuts()
        install([])
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            const input = wrapper.find('.notes-input')

            input.element.focus()
            await input.setValue('G3 C4 E4')
            await nextTick()
            assert.equal(globals.chordInspector.voicingMode, 'custom', 'typing selects Custom')

            pressOn(input.element, { code: 'Slash', key: '?', shiftKey: true })
            await nextTick()

            assert.equal(globals.project.chords.length, 1, 'one row was added')
            assert.deepEqual(globals.project.chords[0].chordNotes, ['C3', 'E3', 'G3'], 'the generated voicing was added')
        }
        finally {
            wrapper.unmount()
        }
    })
})
