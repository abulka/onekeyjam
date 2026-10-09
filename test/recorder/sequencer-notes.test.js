import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    takeTicksToPanel,
    panelTicksToTake,
    takeToPanelNotes,
    panelNotesToTakeNotes,
    fitRange,
    renderLoopToTicks,
    patternToTakeNotes,
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

describe('patternToTakeNotes', () => {
    // Panel timebase 16 and PPQ 480 give 120 take ticks per panel tick; a whole
    // note (and a 4/4 bar) is 16 panel ticks = 1920 take ticks.
    const options = { ppq: 480, panelTimebase: 16, rowToNotes: (row) => [{ midi: row }] }

    it('maps a one-bar pattern into the take', () => {
        const notes = [{ t: 0, n: 60, g: 4, v: 100, f: 0 }]
        const out = patternToTakeNotes(notes, { ...options, loopStart: 0, loopEnd: 16, totalTakeTicks: 1920 })
        assert.equal(out.length, 1)
        assert.deepEqual(out[0], { midi: 60, startTick: 0, durationTicks: 480, velocity: globals.fixedNoteVelocity, playedMidi: 60 })
    })

    it('uses the fixed velocity unless an explicit one is passed', () => {
        const notes = [{ t: 0, n: 60, g: 4, v: 100, f: 0 }]
        const fixed = patternToTakeNotes(notes, { ...options, loopStart: 0, loopEnd: 16, totalTakeTicks: 1920 })
        assert.equal(fixed[0].velocity, globals.fixedNoteVelocity)
        const explicit = patternToTakeNotes(notes, { ...options, velocity: 0.9, loopStart: 0, loopEnd: 16, totalTakeTicks: 1920 })
        assert.equal(explicit[0].velocity, 0.9)
    })

    it('expands a row into several notes with a shared trigger', () => {
        const notes = [{ t: 0, n: 60, g: 4, v: 100, f: 0 }]
        const out = patternToTakeNotes(notes, {
            ...options,
            rowToNotes: () => [
                { midi: 60, playedMidi: 48 },
                { midi: 64, playedMidi: 48 },
                { midi: 67, playedMidi: 48 },
            ],
            loopStart: 0,
            loopEnd: 16,
            totalTakeTicks: 1920,
        })
        assert.deepEqual(out.map(n => n.midi), [60, 64, 67])
        assert.deepEqual(out.map(n => n.playedMidi), [48, 48, 48])
        assert.deepEqual(out.map(n => n.startTick), [0, 0, 0])
    })

    it('repeats the loop with whole loops to fill the take', () => {
        const notes = [{ t: 0, n: 60, g: 4, v: 100, f: 0 }]
        const out = patternToTakeNotes(notes, { ...options, loopStart: 0, loopEnd: 16, totalTakeTicks: 3840 })
        assert.deepEqual(out.map(n => n.startTick), [0, 1920])
    })

    it('clips a note duration at the loop end', () => {
        const notes = [{ t: 14, n: 60, g: 8, v: 100, f: 0 }]
        const out = patternToTakeNotes(notes, { ...options, loopStart: 0, loopEnd: 16, totalTakeTicks: 1920 })
        assert.equal(out.length, 1)
        assert.equal(out[0].startTick, 14 * 120)
        assert.equal(out[0].durationTicks, 2 * 120)
    })

    it('ignores notes outside the loop and skips unmappable rows', () => {
        const notes = [
            { t: 20, n: 60, g: 4, v: 100, f: 0 },
            { t: 0, n: 61, g: 4, v: 100, f: 0 },
        ]
        const out = patternToTakeNotes(notes, {
            ...options,
            loopStart: 0,
            loopEnd: 16,
            totalTakeTicks: 1920,
            rowToNotes: (row) => (row === 61 ? [] : [{ midi: row }]),
        })
        assert.deepEqual(out, [])
    })

    it('returns nothing for empty or invalid patterns', () => {
        assert.deepEqual(patternToTakeNotes([], { ...options, loopStart: 0, loopEnd: 16, totalTakeTicks: 1920 }), [])
        assert.deepEqual(patternToTakeNotes([{ t: 0, n: 60, g: 4 }], { ...options, loopStart: 0, loopEnd: 0, totalTakeTicks: 1920 }), [])
        assert.deepEqual(patternToTakeNotes([{ t: 0, n: 60, g: 4 }], { ...options, loopStart: 0, loopEnd: 16, totalTakeTicks: 0 }), [])
        assert.deepEqual(patternToTakeNotes([{ t: 0, n: 60, g: 4 }], { ppq: 480, panelTimebase: 16, loopStart: 0, loopEnd: 16, totalTakeTicks: 1920 }), [])
    })
})
