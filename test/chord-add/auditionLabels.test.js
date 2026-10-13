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

function buttonByTitle(wrapper, prefix) {
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

    it('names the normalised speaker, the custom speaker and the switch link', async () => {
        installFmaj9Row()
        const wrapper = mount(ChordInspector, { attachTo: document.body })
        try {
            await nextTick()
            await nextTick()

            // The panel opened on the custom Fmaj9 row.
            assert.equal(globals.chordInspector.voicingMode, 'custom')
            assert.deepEqual(globals.chordInspector.notes, ['C3', 'E3', 'G3', 'A3', 'F3'])

            const expectedAutoNotes = autoNotesFor(
                globals.chordPicker.currentRoot,
                globals.chordPicker.currentChord,
                0,
            )
            assert.notDeepEqual(expectedAutoNotes, ['C3', 'E3', 'G3', 'A3', 'F3'], 'normalised voicing differs from the draft')

            // The chord-row speaker plays the normalised voicing.
            const normalisedSpeaker = buttonByTitle(wrapper, 'Hear the normalised voicing')
            assert.ok(normalisedSpeaker, 'normalised speaker exists')
            assert.match(normalisedSpeaker.attributes('title'), new RegExp(expectedAutoNotes.join(' ')))

            // The notes-row speaker plays the custom voicing.
            const customSpeaker = buttonByTitle(wrapper, 'Hear the custom voicing')
            assert.ok(customSpeaker, 'custom speaker exists')
            assert.match(customSpeaker.attributes('title'), /C3 E3 G3 A3 F3/)

            // The switch link names the normalised voicing it will use.
            const link = wrapper.findAll('button').find(button => button.text().startsWith('Use normalised voicing'))
            assert.ok(link, 'switch link exists')
            assert.equal(link.text(), `Use normalised voicing (${expectedAutoNotes.join(' ')})`)

            // The tag now says Normalised, not Auto.
            assert.ok(wrapper.text().includes('Normalised'), 'normalised wording is used')
            assert.ok(!wrapper.text().includes('Revert to auto'), 'old wording is gone')
        }
        finally {
            wrapper.unmount()
        }
    })
})
