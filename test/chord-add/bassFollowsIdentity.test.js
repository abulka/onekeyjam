// @ts-check
// The bass follows the chord identity. A played chord's detected slash bass
// belongs to the chord, so it is stored in the Bass field and shared by both
// voicings: choosing Normalised keeps it, which is what the "Save the generated
// voicing" promise implies. A root-position play has no slash, so the field
// stays blank and the low root is derived.
//
// History: this pins the rule that 079fea6 added, 3b177c0 (the simplification)
// removed, and the current change restores in a narrower form. The old rule also
// filled the field for typed notes and unnamed voicings; the new rule does not,
// so the cases here are the new contract, not the deleted file's.
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import {
    openForSlot,
    autoApplyCaptured,
    useCapturedNotes,
    setNotesFromText,
    setBass,
    setIdentity,
    chooseNormalised,
    transposeDraft,
    fifthDraft,
    invertDraft,
    saveDraft,
    headerSymbol,
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

/** Emulate playing a chord on the MIDI keyboard, as detection would record it. */
function play(chord, notes, symbols, bass = '') {
    globals.currentChordBeingJammed.chord = chord
    globals.currentChordBeingJammed.chordNotes = [...notes]
    globals.currentChordBeingJammed.symbols = [...symbols]
    globals.currentChordBeingJammed.bass = bass
    globals.currentChordBeingJammed.source = 'midi'
}

// D4 G4 B4 is GM in the first inversion: Tonal names it GM/D, so the bass is D.
const playGmOverD = () => play('GM', ['D4', 'G4', 'B4'], ['GM/D', 'Bm#5/D'], 'D')

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

    it('a played slash bass fills the field and shows in the header', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        playGmOverD()
        assert.equal(autoApplyCaptured(), true)

        assert.equal(globals.chordPicker.currentBass, 'D', 'the detected slash is the chord bass')
        assert.equal(headerSymbol(), 'GM/D')
        assert.equal(globals.chordInspector.voicingMode, 'custom', 'the played notes are the custom voicing')
    })

    it('a root-position play leaves the field blank and clears a stale slash', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        setBass('F')  // a stale slash from before
        play('GM', ['G3', 'B3', 'D4'], ['GM', 'Bm#5/G'])
        assert.equal(autoApplyCaptured(), true)

        assert.equal(globals.chordPicker.currentBass, '', 'no slash means the low root is derived')
        assert.equal(headerSymbol(), 'GM')
        assert.equal(globals.chordInspector.voicingMode, 'auto', 'G3 B3 D4 is the normalised voicing')
    })

    it('changing the chord identity clears the captured bass', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        playGmOverD()
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordPicker.currentBass, 'D')

        setIdentity('C', 'M')
        assert.equal(globals.chordPicker.currentBass, '', 'a different chord has no slash of its own')
    })

    it('a same-chord note edit keeps the captured bass (the pin)', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        playGmOverD()
        assert.equal(autoApplyCaptured(), true)
        assert.equal(globals.chordPicker.currentBass, 'D')

        // An edit that is still a G major chord keeps the chord's bass, even
        // though the new voicing has no D at the bottom.
        assert.equal(setNotesFromText('G4 B4 D5'), true)
        assert.equal(globals.chordPicker.currentRoot, 'G')
        assert.equal(globals.chordPicker.currentBass, 'D', 'the chord bass is pinned through note edits')
        assert.equal(headerSymbol(), 'GM/D')
    })

    it('a Normalised save keeps the captured bass (the reported gap)', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        playGmOverD()
        assert.equal(autoApplyCaptured(), true)

        chooseNormalised()
        assert.equal(globals.chordPicker.currentBass, 'D', 'Normalised picks the triad, not the bass')
        assert.equal(headerSymbol(), 'GM/D')

        assert.equal(saveDraft(), true)
        const stored = globals.chordTriggerMap['C3']
        assert.deepEqual(stored.chordNotes, ['G3', 'B3', 'D4'], 'the generated voicing is stored')
        assert.equal(stored.bass, 'D', 'the detected bass is stored')
        assert.equal(stored.bassNote, 'D2')
    })

    it('a Normalised invert keeps the captured bass', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        playGmOverD()
        assert.equal(autoApplyCaptured(), true)
        chooseNormalised()

        invertDraft(1)
        assert.equal(globals.chordPicker.currentBass, 'D', 'inverting the voicing does not drop the chord bass')
        assert.equal(headerSymbol(), 'GM/D')
    })

    it('a Normalised transpose carries the captured bass with the root', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        playGmOverD()
        assert.equal(autoApplyCaptured(), true)
        chooseNormalised()

        transposeDraft(1)
        assert.deepEqual(globals.chordInspector.notes, ['G#3', 'C4', 'D#4'], 'the voicing is regenerated a semitone up')
        assert.equal(globals.chordPicker.currentBass, 'D#', 'the slash bass moves with the root, not cleared')
        assert.equal(headerSymbol(), 'G#M/D#')
    })

    it('a Normalised fifth carries the captured bass with the root', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        playGmOverD()
        assert.equal(autoApplyCaptured(), true)
        chooseNormalised()

        fifthDraft(1)
        assert.deepEqual(globals.chordInspector.notes, ['D3', 'F#3', 'A3'])
        assert.equal(globals.chordPicker.currentBass, 'A', 'the bass moves a fifth with the root')
        assert.equal(headerSymbol(), 'DM/A')
    })

    it('Capture fills a blank field but never overwrites a typed bass', () => {
        install(makeProject())
        openForSlot('C3')
        globals.chordInspector.open = true

        playGmOverD()
        assert.equal(autoApplyCaptured(), true)

        // The user cleared the field: Capture restores the played bass.
        globals.chordPicker.currentBass = ''
        assert.equal(useCapturedNotes(), true)
        assert.equal(globals.chordPicker.currentBass, 'D', 'Capture fills a blank field')

        // The user typed their own bass: Capture leaves it alone.
        setBass('E')
        assert.equal(useCapturedNotes(), true)
        assert.equal(globals.chordPicker.currentBass, 'E', 'a typed bass survives Capture')
    })
})
