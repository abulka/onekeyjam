import assert from 'assert'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { globals } from '@/lib/globals.js'
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

function installFmaj9Row() {
    globals.project = {
        name: 'Audition labels test',
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

function speaker(wrapper, prefix) {
    return wrapper.findAll('button').find(button => (button.attributes('title') || '').startsWith(prefix))
}

describe('ChordInspector audition labels', () => {
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

    it('names both speakers and keeps the old mode clutter out', async () => {
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
            const normalisedSpeaker = speaker(wrapper, 'Hear the normalised voicing')
            const customSpeaker = speaker(wrapper, 'Hear the custom voicing')
            assert.ok(normalisedSpeaker, 'normalised speaker exists')
            assert.ok(customSpeaker, 'custom speaker exists')
            assert.equal(normalisedSpeaker.attributes('title'), `Hear the normalised voicing: ${expectedAuto.join(' ')}`)
            assert.equal(customSpeaker.attributes('title'), 'Hear the custom voicing: C3 E3 G3 A3 F3')

            // Radio labels rather than tags or chips.
            const labels = wrapper.findAll('.radio-label').map(label => label.text())
            assert.deepEqual(labels, ['Normalised', 'Custom'])
            assert.ok(!wrapper.find('.mode-chip').exists(), 'no header chip')
            assert.ok(!wrapper.find('.voicing-tag').exists(), 'no mode tag')
            assert.ok(!wrapper.text().includes('store as'), 'no store-as dropdown')

            // Both speakers stay after switching, so the other voicing is
            // always audible without switching.
            await wrapper.find('.voicing-row input[value="normalised"]').setValue(true)
            await nextTick()
            assert.equal(speaker(wrapper, 'Hear the normalised voicing').attributes('title'), `Hear the normalised voicing: ${expectedAuto.join(' ')}`)
            assert.equal(speaker(wrapper, 'Hear the custom voicing').attributes('title'), 'Hear the custom voicing: C3 E3 G3 A3 F3')
        }
        finally {
            wrapper.unmount()
        }
    })
})
