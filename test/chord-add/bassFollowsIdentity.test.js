// @ts-check
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    autoApplyCaptured,
    setNotesFromText,
    setIdentity,
    revertToAuto,
    useCapturedNotes,
    saveDraft,
    resetInspector,
} from '@/lib/chordInspector.js'

function makeProject() {
    const project = buildProject([
        ['C3', 'E3', 'G3'],
        ['F3', 'A3', 'C4'],
        ['G3', 'B3', 'D4'],
    ])
    project.name = 'bass follows identity test'
    return project
}

function resetJammed() {
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
}

function install(project) {
    globals.project = project
    globals.maxChordConfigs = 3
    globals.chordTriggerMap = {}
    globals.idsToDelete = []
    globals.currentChordTriggerNote = undefined
    resetJammed()
    resetInspector()
    rebuildTriggerMap()
}

function play(chord, notes, symbols, bass = '') {
    globals.currentChordBeingJammed.chord = chord
    globals.currentChordBeingJammed.chordNotes = [...notes]
    globals.currentChordBeingJammed.symbols = [...symbols]
    globals.currentChordBeingJammed.bass = bass
    globals.currentChordBeingJammed.source = 'midi'
}

describe('bass follows the chord identity', () => {
    let saved

    beforeEach(() => {
        // jsdom has no custom event helper; the scale engine broadcasts through it.
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

    it('typing C E G after a played Bdim/D moves the bass off the played D', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        // Play D F B: Tonal names it Bdim/D, so the played bass is D.
        play('Bdim', ['D4', 'F4', 'B4'], ['Bdim/D'], 'D')
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordPicker.currentBass, 'D', 'played slash bass kept')

        // Now type a completely different chord.
        assert.equal(setNotesFromText('C E G'), true)
        assert.equal(globals.chordPicker.currentRoot, 'C')
        assert.equal(globals.chordPicker.currentChord, 'M')
        assert.equal(globals.chordPicker.currentBass, 'C', 'bass follows the typed chord')

        // And the stored row must not keep the old D bass.
        saveDraft()
        const stored = globals.chordTriggerMap['C3']
        assert.equal(stored.bass, 'C', 'saved config stores the new bass')
    })

    it('changing the chord type keeps the bass on the root', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        globals.chordPicker.currentBass = 'D'  // simulate a stale bass

        setIdentity('C', 'm')
        assert.equal(globals.chordPicker.currentBass, 'C', 'minor follows the root')
        setIdentity('C', 'M')
        assert.equal(globals.chordPicker.currentBass, 'C', 'back to major still follows the root')
    })

    it('typed notes that imply a slash keep that slash bass', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        assert.equal(setNotesFromText('G3 C4 E4'), true)
        assert.equal(globals.chordPicker.currentRoot, 'C')
        assert.equal(globals.chordPicker.currentBass, 'G', 'C/G keeps the G bass')
    })

    it('revert to auto resets the bass while the played voicing restores it', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        play('Bdim', ['D4', 'F4', 'B4'], ['Bdim/D'], 'D')
        assert.equal(autoApplyCaptured(), true)

        revertToAuto()
        assert.equal(globals.chordPicker.currentRoot, 'B')
        assert.equal(globals.chordPicker.currentBass, 'B', 'normalised voicing uses the root bass')

        assert.equal(useCapturedNotes(), true)
        assert.deepEqual(globals.chordInspector.notes, ['D4', 'F4', 'B4'])
        assert.equal(globals.chordPicker.currentBass, 'D', 'played voicing restores the played bass')
    })

    it('an unnamed played voicing uses its lowest note as the bass', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        globals.chordPicker.currentBass = 'F'  // stale bass from before
        play('', ['C4', 'C#4'], [])
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordInspector.voicingMode, 'custom')
        assert.equal(globals.chordPicker.currentBass, 'C', 'bass follows the lowest played note')
    })

    it('typed notes Tonal cannot name also use their lowest note', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true
        globals.chordPicker.currentBass = 'F'
        assert.equal(setNotesFromText('C4 C#4'), true)
        assert.equal(globals.chordInspector.voicingMode, 'custom')
        assert.equal(globals.chordPicker.currentBass, 'C', 'unnamed typed notes follow their lowest note')
    })
})
