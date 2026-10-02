import assert from 'assert'
import * as pkg from '@tonejs/midi'
import { recordingToMidi } from '@/lib/midi/export-recording.js'

const { Midi } = pkg

describe('recordingToMidi', () => {
    const take = {
        chords: [
            { midi: 60, startTick: 0, durationTicks: 480, velocity: 0.8 },
            { midi: 64, startTick: 0, durationTicks: 480, velocity: 0.8 },
            { midi: 67, startTick: 0, durationTicks: 480, velocity: 0.8 },
        ],
        jam: [
            { midi: 72, startTick: 240, durationTicks: 240, velocity: 0.5 },
        ],
    }

    it('writes a two-track file with the expected PPQ and tempo', () => {
        const data = recordingToMidi(take, 120, 480)
        const midi = new Midi(data)

        assert.equal(midi.header.ppq, 480)
        assert.equal(midi.header.tempos[0].bpm, 120)
        assert.equal(midi.tracks.length, 2)
        assert.deepEqual(midi.tracks.map(track => track.name), ['Solo', 'Chords'])
    })

    it('round-trips note timings and velocities', () => {
        const midi = new Midi(recordingToMidi(take, 120, 480))
        const solo = midi.tracks[0].notes
        const chords = midi.tracks[1].notes

        assert.equal(chords.length, 3)
        assert.deepEqual(chords.map(n => n.midi).sort((a, b) => a - b), [60, 64, 67])
        assert.equal(chords[0].ticks, 0)
        assert.equal(chords[0].durationTicks, 480)
        assert.ok(Math.abs(chords[0].velocity - 0.8) < 0.02)

        assert.equal(solo.length, 1)
        assert.equal(solo[0].midi, 72)
        assert.equal(solo[0].ticks, 240)
        assert.equal(solo[0].durationTicks, 240)
    })

    it('handles an empty take', () => {
        const midi = new Midi(recordingToMidi({ chords: [], jam: [] }, 120, 480))
        assert.equal(midi.tracks.length, 2)
        assert.equal(midi.tracks[0].notes.length, 0)
        assert.equal(midi.tracks[1].notes.length, 0)
    })
})
