import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { playableNotes } from '@/lib/midi/playback.js'

// A chord voicing (C4/E4/G4), its bass (C2) and a doubled bass on the chord
// channel, plus a solo note.
const take = {
    chords: [
        { midi: 60, startTick: 0, durationTicks: 480, velocity: 0.5, role: 'chord' },
        { midi: 64, startTick: 0, durationTicks: 480, velocity: 0.5, role: 'chord' },
        { midi: 67, startTick: 0, durationTicks: 480, velocity: 0.5, role: 'chord' },
        { midi: 36, startTick: 0, durationTicks: 480, velocity: 0.5, role: 'bass' },
    ],
    jam: [
        { midi: 72, startTick: 240, durationTicks: 240, velocity: 0.5, role: 'jam' },
    ],
}

const takeWithDoubledBass = {
    chords: [...take.chords, { midi: 36, startTick: 0, durationTicks: 480, velocity: 0.5, role: 'chord' }],
    jam: take.jam,
}

function withFlags(flags, fn) {
    const saved = {
        playChordOnly: globals.playChordOnly,
        playBassOnly: globals.playBassOnly,
        playChordBass: globals.playChordBass,
    }
    Object.assign(globals, flags)
    try {
        return fn()
    }
    finally {
        Object.assign(globals, saved)
    }
}

describe('playableNotes', () => {
    it('plays each role with its recorded instrument', () => {
        const out = withFlags({ playChordOnly: false, playBassOnly: false, playChordBass: false }, () => playableNotes(take))
        const byRole = out.map(n => [n.midi, n.toneType])
        assert.deepEqual(byRole, [[72, 'jam'], [60, 'chord'], [64, 'chord'], [67, 'chord'], [36, 'bass']])
    })

    it('drops the bass with playChordOnly (Bass Channel Off)', () => {
        const out = withFlags({ playChordOnly: true, playBassOnly: false, playChordBass: false }, () => playableNotes(take))
        assert.equal(out.some(n => n.toneType === 'bass'), false)
        assert.equal(out.filter(n => n.toneType === 'chord').length, 3)
    })

    it('drops the chord voicing with playBassOnly (Bass Channel Only)', () => {
        const out = withFlags({ playChordOnly: false, playBassOnly: true, playChordBass: false }, () => playableNotes(take))
        assert.deepEqual(out.map(n => n.toneType), ['jam', 'bass'])
    })

    it('adds the bass to the chord channel when playChordBass is on', () => {
        const out = withFlags({ playChordOnly: false, playBassOnly: false, playChordBass: true }, () => playableNotes(take))
        const bassMidi = out.filter(n => n.midi === 36)
        assert.deepEqual(bassMidi.map(n => n.toneType), ['bass', 'chord'])
    })

    it('does not add a second doubled bass when the take already has one', () => {
        const out = withFlags({ playChordOnly: false, playBassOnly: false, playChordBass: true }, () => playableNotes(takeWithDoubledBass))
        assert.equal(out.filter(n => n.midi === 36 && n.toneType === 'chord').length, 1)
    })

    it('drops a recorded doubled bass when playChordBass is off', () => {
        const out = withFlags({ playChordOnly: false, playBassOnly: false, playChordBass: false }, () => playableNotes(takeWithDoubledBass))
        assert.equal(out.filter(n => n.midi === 36).length, 1)
        assert.equal(out.filter(n => n.midi === 36)[0].toneType, 'bass')
    })
})
