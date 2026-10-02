import assert from 'assert'
import {
    takeTicksToPanel,
    panelTicksToTake,
    takeToPanelNotes,
    panelNotesToTakeNotes,
    fitRange,
    renderLoopToTicks,
} from '@/lib/sequencer-notes.js'

describe('sequencer note conversion', () => {
    it('scales take ticks to the panel timebase', () => {
        // 480 PPQ with a 1920 timebase is 4:1, so the scale is exactly 1.
        assert.equal(takeTicksToPanel(480, 480, 1920), 480)
        assert.equal(takeTicksToPanel(120, 480, 1920), 120)
        assert.equal(panelTicksToTake(1920, 480, 1920), 1920)
        // A 960 timebase is half the size, so the scale is 0.5.
        assert.equal(takeTicksToPanel(120, 480, 960), 60)
    })

    it('converts a take to panel notes with track and velocity', () => {
        const take = {
            chords: [{ midi: 64, startTick: 0, durationTicks: 480, velocity: 0.8, playedMidi: 48 }],
            jam: [{ midi: 72, startTick: 480, durationTicks: 240, velocity: 0.5 }],
        }
        const notes = takeToPanelNotes(take, { ppq: 480, panelTimebase: 1920 })

        assert.equal(notes.length, 2)
        assert.deepEqual(notes[0], { t: 0, n: 64, g: 480, v: 102, f: 0, _track: 'chords', playedMidi: 48 })
        assert.deepEqual(notes[1], { t: 480, n: 72, g: 240, v: 64, f: 0, _track: 'jam' })
    })

    it('filters the take by track', () => {
        const take = { chords: [{ midi: 60, startTick: 0, durationTicks: 480, velocity: 0.8 }], jam: [{ midi: 72, startTick: 0, durationTicks: 480, velocity: 0.8 }] }
        const chords = takeToPanelNotes(take, { tracks: ['chords'] })
        assert.equal(chords.length, 1)
        assert.equal(chords[0]._track, 'chords')
    })

    it('round-trips take notes through the panel', () => {
        const take = {
            chords: [{ midi: 64, startTick: 240, durationTicks: 480, velocity: 0.8, playedMidi: 48 }],
            jam: [],
        }
        const panelNotes = takeToPanelNotes(take, { ppq: 480, panelTimebase: 1920 })
        const back = panelNotesToTakeNotes(panelNotes, { ppq: 480, panelTimebase: 1920 })

        assert.equal(back.length, 1)
        assert.equal(back[0].midi, 64)
        assert.equal(back[0].startTick, 240)
        assert.equal(back[0].durationTicks, 480)
        assert.equal(back[0].playedMidi, 48)
        assert.ok(Math.abs(back[0].velocity - 0.8) < 0.01)
    })

    it('defaults the played key to the note itself when unknown', () => {
        const back = panelNotesToTakeNotes([{ t: 0, n: 67, g: 480, v: 100, f: 0 }], { ppq: 480, panelTimebase: 1920 })
        assert.equal(back[0].playedMidi, 67)
    })

    it('frames a note range with padding below the lowest note', () => {
        assert.deepEqual(fitRange([]), { yoffset: 60, yrange: 16 })
        const range = fitRange([{ n: 60 }, { n: 72 }])
        // yoffset is the bottom visible note, so it sits below the lowest note.
        assert.equal(range.yoffset, 57)
        assert.equal(range.yrange, 18)
    })

    it('repeats a looping pattern up to the total length', () => {
        const notes = [
            { t: 0, n: 60, g: 480, v: 100, f: 0 },
            { t: 960, n: 64, g: 480, v: 100, f: 0 },
        ]
        // Loop is 0..1920, asked for 4800 ticks, so two full repeats fit.
        const rendered = renderLoopToTicks(notes, 0, 1920, 4800)
        assert.deepEqual(rendered.map(n => n.t), [0, 960, 1920, 2880, 3840])
    })

    it('ignores notes outside the loop points', () => {
        const notes = [{ t: 2500, n: 60, g: 480, v: 100, f: 0 }]
        assert.deepEqual(renderLoopToTicks(notes, 0, 1920, 4800), [])
    })
})
