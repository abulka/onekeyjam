import assert from 'assert'
import { globals } from '../../src/lib/globals.js'
import { syncCustomVoicingToCurrentChord } from '../../src/lib/chordPicker.js'

function snapshot() {
    return {
        project: globals.project,
        chordTriggerMap: globals.chordTriggerMap,
        currentChordTriggerNote: globals.currentChordTriggerNote,
        jammed: JSON.parse(JSON.stringify(globals.currentChordBeingJammed)),
    }
}

function restore(previous) {
    globals.project = previous.project
    globals.chordTriggerMap = previous.chordTriggerMap
    globals.currentChordTriggerNote = previous.currentChordTriggerNote
    globals.currentChordBeingJammed = previous.jammed
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
    it('reloads the custom voicing from the stored chord', () => {
        const previous = snapshot()
        try {
            // The working notes still hold the overwritten chord.
            globals.currentChordBeingJammed.chord = 'G#7no5'
            globals.currentChordBeingJammed.chordNotes = ['G#3', 'C4', 'F#4']
            globals.currentChordBeingJammed.bass = 'C'
            globals.currentChordBeingJammed.source = 'grid'

            seed({
                id: 1, name: 'A (user)', chord: 'A', chordNotes: ['A3', 'C#4', 'G4'],
                symbols: 'A, A5', bass: '', scale1: '', scale2: '', scale3: '', scaleNotesOfChord: [],
            })
            syncCustomVoicingToCurrentChord()

            assert.equal(globals.currentChordBeingJammed.chord, 'A')
            assert.deepEqual(globals.currentChordBeingJammed.chordNotes, ['A3', 'C#4', 'G4'])
            assert.deepEqual(globals.currentChordBeingJammed.symbols, ['A', 'A5'])
            assert.equal(globals.currentChordBeingJammed.source, 'grid')
        } finally {
            restore(previous)
        }
    })

    it('clears the custom voicing when no chord is selected', () => {
        const previous = snapshot()
        try {
            seed(null)
            globals.currentChordBeingJammed.chordNotes = ['G#3', 'C4', 'F#4']
            syncCustomVoicingToCurrentChord()
            assert.deepEqual(globals.currentChordBeingJammed.chordNotes, [])
            assert.equal(globals.currentChordBeingJammed.chord, '')
        } finally {
            restore(previous)
        }
    })
})
