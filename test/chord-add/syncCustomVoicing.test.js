import assert from 'assert'
import { globals } from '../../src/lib/globals.js'
import { syncCustomVoicingToCurrentChord } from '../../src/lib/chordPicker.js'

function snapshot() {
    return {
        project: globals.project,
        chordTriggerMap: globals.chordTriggerMap,
        currentChordTriggerNote: globals.currentChordTriggerNote,
        chordPicker: JSON.parse(JSON.stringify(globals.chordPicker)),
        inspector: JSON.parse(JSON.stringify(globals.chordInspector)),
    }
}

function restore(previous) {
    globals.project = previous.project
    globals.chordTriggerMap = previous.chordTriggerMap
    globals.currentChordTriggerNote = previous.currentChordTriggerNote
    globals.chordPicker = previous.chordPicker
    globals.chordInspector = previous.inspector
}

function seed(config) {
    globals.project = {
        name: 'Sync Test',
        chords: [],
        options: {},
        songs: { default: { ids: [], favourites: [], blacklist: [] } },
    }
    globals.chordTriggerMap = config ? { C2: config } : {}
    globals.currentChordTriggerNote = config ? 'C2' : undefined
}

describe('syncCustomVoicingToCurrentChord', () => {
    it('reloads the draft voicing from the stored chord', () => {
        const previous = snapshot()
        try {
            seed({
                id: 1, name: 'A (user)', chord: 'A', chordNotes: ['A3', 'C#4', 'G4'],
                symbols: 'A, A5', bass: '', scale1: '', scale2: '', scale3: '', scaleNotesOfChord: [],
            })
            globals.chordInspector.notes = ['G#3', 'C4', 'F#4']
            globals.chordInspector.voicingMode = 'custom'
            syncCustomVoicingToCurrentChord()

            assert.deepEqual(globals.chordInspector.notes, ['A3', 'C#4', 'G4'])
            assert.equal(globals.chordInspector.voicingMode, 'custom')
            assert.deepEqual(globals.chordInspector.symbols, ['A', 'A5'])
        } finally {
            restore(previous)
        }
    })

    it('clears the draft voicing when no chord is selected', () => {
        const previous = snapshot()
        try {
            seed(null)
            globals.chordInspector.notes = ['G#3', 'C4', 'F#4']
            syncCustomVoicingToCurrentChord()
            assert.deepEqual(globals.chordInspector.notes, [])
            assert.equal(globals.chordInspector.voicingMode, 'auto')
        } finally {
            restore(previous)
        }
    })
})
