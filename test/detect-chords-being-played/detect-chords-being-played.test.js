// @ts-check
// A voicing Tonal cannot recognise must not leave the previous chord's identity
// behind. The Chord Inspector reads this state when a chord is captured, so a
// lingering name would mislabel the new custom row.
import assert from 'assert'

// The detection module keeps `lastNotes`/`lastNotesAnalysed` at module scope, so
// each test re-imports it (and globals from the same fresh registry) to start
// clean.
async function freshModules() {
    vi.resetModules()
    const { globals } = await import('@/lib/globals.js')
    const { detectChordsBeingPlayed } = await import('@/lib/detectChordsBeingPlayed.js')
    return { globals, detectChordsBeingPlayed }
}

function resetJammed(globals) {
    const j = globals.currentChordBeingJammed
    j.chord = ''
    j.chordNotes = []
    j.symbols = []
    j.bass = ''
    j.tonic = ''
    j.type = ''
    j.source = ''
    j.stale = true
}

describe('detectChordsBeingPlayed identity', () => {
    it('records the identity of a recognised chord', async () => {
        const { globals, detectChordsBeingPlayed } = await freshModules()
        resetJammed(globals)
        detectChordsBeingPlayed(['C4', 'E4', 'G4'])
        const j = globals.currentChordBeingJammed
        assert.equal(j.stale, false)
        assert.deepEqual(j.chordNotes, ['C4', 'E4', 'G4'])
        assert.ok(j.chord, 'a recognised chord is named')
        assert.ok(j.symbols.length > 0, 'the aliases are kept')
        assert.equal(j.source, 'midi')
    })

    it('clears the identity of an unrecognised voicing and keeps the notes', async () => {
        const { globals, detectChordsBeingPlayed } = await freshModules()
        resetJammed(globals)
        // A recognised chord first, so there is a stale identity to leak.
        detectChordsBeingPlayed(['C4', 'E4', 'G4'])
        assert.ok(globals.currentChordBeingJammed.chord, 'precondition: a chord was named')

        detectChordsBeingPlayed(['E4', 'F4', 'B4'])
        const j = globals.currentChordBeingJammed
        assert.equal(j.stale, true)
        assert.deepEqual(j.chordNotes, ['E4', 'F4', 'B4'], 'the played notes are kept')
        assert.equal(j.chord, '', 'the previous chord name must not linger')
        assert.deepEqual(j.symbols, [])
        assert.equal(j.bass, '')
        assert.equal(j.tonic, '')
        assert.equal(j.type, '')
        assert.equal(j.source, 'midi')
    })
})
