import assert from 'assert'
import { describeTriggerChord } from '@/lib/describeTriggerChord.js'

const map = {
    C3: { chord: 'C', chordNotes: ['C3', 'E3', 'G3'], bassNote: 'C2' },
    D3: { chord: 'Dm', chordNotes: ['D2', 'F3', 'A3'], bassNote: 'D2' },
}

const baseOptions = { chordTriggerMap: map, playChordOnly: false, playBassOnly: false, playChordBass: false }

describe('describeTriggerChord', () => {
    it('lists the chord notes on channel 2 first, then the bass on channel 3', () => {
        const info = describeTriggerChord('C3', baseOptions)
        assert.equal(info.found, true)
        assert.equal(info.chord, 'C')
        assert.deepEqual(info.chordNotes, ['C3', 'E3', 'G3'])
        assert.equal(info.bassNote, 'C2')
        assert.deepEqual(
            info.sounds.map(s => [s.name, s.midi, s.channel, s.role]),
            [['C3', 48, 2, 'chord'], ['E3', 52, 2, 'chord'], ['G3', 55, 2, 'chord'], ['C2', 36, 3, 'bass']],
        )
    })

    it('reports the stored notes and bass with MIDI numbers', () => {
        const info = describeTriggerChord('C3', baseOptions)
        assert.deepEqual(info.storedNotes, [
            { name: 'C3', midi: 48 },
            { name: 'E3', midi: 52 },
            { name: 'G3', midi: 55 },
        ])
        assert.equal(info.storedBassMidi, 36)
    })

    it('skips a chord note that duplicates the bass, and flags it', () => {
        // D root sits on D2 in the chord notes and is also the bass.
        const info = describeTriggerChord('D3', baseOptions)
        assert.equal(info.skippedBassDuplicate, true)
        assert.deepEqual(info.sounds.map(s => s.name), ['F3', 'A3', 'D2'])
    })

    it('keeps the bass duplicate when playChordBass is on', () => {
        const info = describeTriggerChord('D3', { ...baseOptions, playChordBass: true })
        assert.equal(info.skippedBassDuplicate, false)
        assert.deepEqual(info.sounds.map(s => s.name), ['F3', 'A3', 'D2', 'D2'])
        assert.deepEqual(info.sounds.map(s => s.role), ['chord', 'chord', 'chord', 'bass'])
    })

    it('omits the bass with playChordOnly', () => {
        const info = describeTriggerChord('C3', { ...baseOptions, playChordOnly: true })
        assert.deepEqual(info.sounds.map(s => s.name), ['C3', 'E3', 'G3'])
    })

    it('omits the chord notes with playBassOnly', () => {
        const info = describeTriggerChord('C3', { ...baseOptions, playBassOnly: true })
        assert.deepEqual(info.sounds.map(s => s.name), ['C2'])
    })

    it('reports a trigger with no chord', () => {
        const info = describeTriggerChord('F3', baseOptions)
        assert.equal(info.found, false)
        assert.deepEqual(info.sounds, [])
        assert.deepEqual(info.storedNotes, [])
    })
})
