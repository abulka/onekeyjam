import assert from 'assert'
import { globals } from '../../src/lib/globals.js'
import { setChordNotesDirectly } from '../../src/lib/detectChordsBeingPlayed.js'

function snapshot() {
    return {
        jammed: JSON.parse(JSON.stringify(globals.currentChordBeingJammed)),
        sync: globals.syncChordPickerToJamChord,
    }
}

function restore(previous) {
    globals.currentChordBeingJammed = previous.jammed
    globals.syncChordPickerToJamChord = previous.sync
}

function resetJammed() {
    globals.currentChordBeingJammed.chord = 'G#7no5'
    globals.currentChordBeingJammed.chordNotes = ['G#3', 'C4', 'F#4']
    globals.currentChordBeingJammed.symbols = ['G#7no5']
    globals.currentChordBeingJammed.bass = 'C'
    globals.currentChordBeingJammed.tonic = 'G#'
    globals.currentChordBeingJammed.type = '7no5'
    globals.currentChordBeingJammed.source = 'grid'
    globals.currentChordBeingJammed.stale = false
}

describe('setChordNotesDirectly', () => {
    it('stores typed notes and names them', () => {
        const previous = snapshot()
        try {
            globals.syncChordPickerToJamChord = false
            resetJammed()
            setChordNotesDirectly(['C4', 'E4', 'G4'])
            assert.deepEqual(globals.currentChordBeingJammed.chordNotes, ['C4', 'E4', 'G4'])
            assert.equal(globals.currentChordBeingJammed.chord, 'CM')
            assert.equal(globals.currentChordBeingJammed.tonic, 'C')
            assert.equal(globals.currentChordBeingJammed.source, 'typed')
            assert.equal(globals.currentChordBeingJammed.stale, false)
        } finally {
            restore(previous)
        }
    })

    it('keeps the current name and bass when the notes cannot be named', () => {
        const previous = snapshot()
        try {
            globals.syncChordPickerToJamChord = false
            resetJammed()
            setChordNotesDirectly(['F#4', 'C5'])
            assert.deepEqual(globals.currentChordBeingJammed.chordNotes, ['F#4', 'C5'])
            assert.equal(globals.currentChordBeingJammed.chord, 'G#7no5')
            assert.equal(globals.currentChordBeingJammed.bass, 'C')
            assert.equal(globals.currentChordBeingJammed.stale, true)
        } finally {
            restore(previous)
        }
    })

    it('ignores an empty note list', () => {
        const previous = snapshot()
        try {
            globals.syncChordPickerToJamChord = false
            resetJammed()
            setChordNotesDirectly([])
            assert.deepEqual(globals.currentChordBeingJammed.chordNotes, ['G#3', 'C4', 'F#4'])
        } finally {
            restore(previous)
        }
    })
})
