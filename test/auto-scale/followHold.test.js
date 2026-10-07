import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { scaleNameToNotes } from '@/lib/scaleToNotes.js'
import {
    chooseFollowCandidate,
    chordShapeFor,
    pitchClassSet,
} from '@/lib/autoScale.js'
import { onNoteOn, onNoteOff, calculateRhBlackNoteModifierNotes } from '@/lib/midi/wire-events.js'
import { Note } from '@/lib/midi/webmidi.js'

/*
 * Follow repeat hold, the steady prefer-primary term and the dominant-gated
 * tension palette. These pin the behaviours the referee harness measured.
 */

function configFor(id, chord, chordNotes, scales) {
    const config = { id, name: chord, chord, chordNotes, scaleNotesOfChord: chordNotes, bassNote: '', bass: '', symbols: chord, scale1: scales[0], scale2: scales[1], scale3: scales[2] }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

function candidatesFor(scales) {
    return scales.map((name, index) => ({ slot: `scale${index + 1}`, name, pcs: pitchClassSet(scaleNameToNotes(name)) }))
}

function triggerChord(note) {
    onNoteOn({ note: new Note(note, { attack: 0.5 }) })
    onNoteOff({ note: new Note(note, { attack: 0.5 }) })
}

describe('follow repeat hold and steady/tension behaviours', () => {

    beforeEach(() => {
        document.broadcastEvent = () => { }
        globals.keyboard = { name: 'test', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
        globals.lhMetaKeys = { lhCsharp: 'C#3', lhDsharp: 'D#3', lhFsharp: 'F#3', lhGsharp: 'G#3', lhAsharp: 'A#3' }
        calculateRhBlackNoteModifierNotes()
        globals.enableLhChordTriggers = true
        globals.scaleFilteringEnabled = true
        globals.GM = false
        globals.channel = undefined
        globals.channel2 = undefined
        globals.channel3 = undefined
        globals.pendingChordNoteOffs = {}
        globals.pendingChordBassNoteOffs = {}
        globals.pendingNoteOffs = {}
        globals.chordTriggerMap = {
            C3: configFor(1, 'Cmaj7', ['C3', 'E3', 'G3', 'B3'], ['C major', 'C lydian', 'C mixolydian']),
            D3: configFor(2, 'Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D aeolian', 'D minor pentatonic']),
            G3: configFor(3, 'G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6']),
        }
        globals.currentChordTriggerNote = 'C3'
        globals.currentScaleFilter = 'scale1'
        globals.scaleFiltering.policy = 'follow'
        globals.scaleFiltering.frozen = false
        globals.scaleFiltering.autoScaleName = ''
        globals.scaleFiltering.autoScaleNotes = []
        globals.scaleFiltering.autoReason = ''
        globals.scaleFiltering.manualScaleNote = ''
        globals.scaleFiltering.manualScaleFilter = ''
        globals.scaleFiltering.followChordId = null
        Object.assign(globals.scaleFiltering.policyOptions, {
            contextChords: 1, phraseBias: false, phraseStrength: 1, palette: 'primary', preferPrimary: 0,
        })
        globals.chordHistory = []
        globals.project = { options: {}, songs: { default: { ids: [1, 2, 3], favourites: [], blacklist: [] } } }
    })

    afterEach(() => {
        globals.scaleFiltering.policy = 'manual'
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        globals.currentScaleFilter = 'scale1'
        globals.chordHistory = []
    })

    it('holds the same scale when one chord config is stabbed twice', () => {
        globals.scaleFiltering.policyOptions.palette = 'bold'
        triggerChord('C3')
        assert.equal(globals.currentScaleFilter, 'scale1', 'the first stab picks the primary scale')
        triggerChord('C3')
        assert.equal(globals.currentScaleFilter, 'scale1', 'the repeat hold keeps the stab choice')
        assert.equal(globals.scaleFiltering.followChordId, 1)
    })

    it('re-picks when a different chord arrives', () => {
        globals.scaleFiltering.policyOptions.palette = 'bold'
        triggerChord('C3')
        triggerChord('C3')
        triggerChord('D3')
        assert.equal(globals.currentChordTriggerNote, 'D3')
        assert.equal(globals.scaleFiltering.followChordId, 2, 'the follow choice now belongs to the new chord')
    })

    it('holds a repeated dominant under the tension palette', () => {
        globals.scaleFiltering.policyOptions.palette = 'tension'
        globals.currentChordTriggerNote = 'G3'
        triggerChord('G3')
        assert.equal(globals.currentScaleFilter, 'scale1', 'the first hit takes the natural scale')
        triggerChord('G3')
        assert.equal(globals.currentScaleFilter, 'scale1', 'the repeat hold keeps the natural scale')
    })

    it('flips the modal return to dorian with the steady preference', () => {
        const candidates = candidatesFor(['D dorian', 'D aeolian', 'D minor pentatonic'])
        const current = chordShapeFor(configFor(1, 'Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D aeolian', 'D minor pentatonic']))
        const previous = chordShapeFor(configFor(2, 'Ebm7', ['Eb3', 'Gb3', 'Bb3', 'Db4'], ['Eb dorian', 'Eb aeolian', 'Eb minor pentatonic']))
        const context = {
            current,
            previous,
            previous2: undefined,
            previousScalePcs: pitchClassSet(scaleNameToNotes('Eb dorian')),
            previousScaleName: 'Eb dorian',
            previous2ScalePcs: new Set(),
            recentScaleSets: [],
            contextChords: 1,
            phraseBias: false,
            phraseStrength: 1,
            palette: 'primary',
            preferPrimary: 0,
            lastSoloPc: undefined,
            lastSoloName: '',
        }
        const plain = chooseFollowCandidate(candidates, context)
        assert.equal(candidates[plain.index].name, 'D aeolian', 'continuity alone smooths to aeolian')
        const steady = chooseFollowCandidate(candidates, { ...context, preferPrimary: 1 })
        assert.equal(candidates[steady.index].name, 'D dorian', 'the steady term returns to the stored primary')
    })

    it('gates the tension palette on dominant chords', () => {
        const dominantCandidates = candidatesFor(['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])
        const dominantContext = {
            current: chordShapeFor(configFor(1, 'G7', ['G3', 'B3', 'D4', 'F4'], ['G mixolydian', 'G lydian dominant', 'G mixolydian b6'])),
            previous: chordShapeFor(configFor(2, 'Cmaj7', ['C3', 'E3', 'G3', 'B3'], ['C major', 'C lydian', 'C harmonic major'])),
            previousScalePcs: pitchClassSet(scaleNameToNotes('C major')),
            previousScaleName: 'C major',
            previous2: undefined,
            previous2ScalePcs: new Set(),
            recentScaleSets: [],
            contextChords: 1,
            phraseBias: false,
            phraseStrength: 1,
            palette: 'tension',
            preferPrimary: 0,
            lastSoloPc: undefined,
            lastSoloName: '',
        }
        const tensionPick = chooseFollowCandidate(dominantCandidates, dominantContext)
        assert.notEqual(dominantCandidates[tensionPick.index].name, 'G mixolydian', 'a dominant takes a differing tension scale')

        const majorCandidates = candidatesFor(['C major', 'C lydian', 'C harmonic major'])
        const majorContext = {
            ...dominantContext,
            current: chordShapeFor(configFor(3, 'Cmaj7', ['C3', 'E3', 'G3', 'B3'], ['C major', 'C lydian', 'C harmonic major'])),
            previous: dominantContext.current,
            previousScalePcs: pitchContextPcs(),
            previousScaleName: 'G mixolydian',
        }
        const majorPick = chooseFollowCandidate(majorCandidates, majorContext)
        assert.equal(majorCandidates[majorPick.index].name, 'C major', 'a non-dominant keeps the natural scale')
    })
})

/** The pitch classes of G mixolydian, the same set as C major. */
function pitchContextPcs() {
    return pitchClassSet(scaleNameToNotes('G mixolydian'))
}
