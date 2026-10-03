import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    takeDurationSec,
    stopPlayback,
    seekPlayback,
    startPlayback,
    activeNotesAt,
    soundingNotesAt,
    playedNotesAt,
    syncVisuals,
    previewVisuals,
} from '@/lib/midi/playback.js'

// jsdom does not load index.html, so provide the app's event helper ourselves
// and capture the visual events that playback emits.
let liveNoteEvents = []

function installBroadcastEvent() {
    // @ts-ignore test shim
    document.broadcastEvent = (name, detail) => {
        if (name === 'live-note')
            liveNoteEvents.push(detail)
    }
}

describe('midi playback helpers', () => {
    beforeEach(() => {
        installBroadcastEvent()
        liveNoteEvents = []
        globals.recording.bpm = 120
        globals.recording.ppq = 480
        globals.recording.take = { chords: [], jam: [] }
        globals.recording.playback.isPlaying = false
        globals.recording.playback.positionSec = 0
        globals.recording.playback.durationSec = 0
        globals.recording.playback.highlightMode = 'sounding'
        stopPlayback(true)  // clear any notes left lit by a previous test
        liveNoteEvents = []
    })

    it('measures the take from the latest note end', () => {
        globals.recording.take = {
            chords: [{ startTick: 0, durationTicks: 960 }],
            jam: [{ startTick: 480, durationTicks: 960 }],
        }
        // 1440 ticks at 1/960 s per tick is 1.5 seconds.
        assert.ok(Math.abs(takeDurationSec(globals.recording) - 1.5) < 1e-9)
    })

    it('does nothing when there is no audio context to play through', () => {
        globals.recording.take = { chords: [{ startTick: 0, durationTicks: 480 }], jam: [] }
        startPlayback(0)
        assert.equal(globals.recording.playback.isPlaying, false)
    })

    it('clamps the seek position to the take duration', () => {
        globals.recording.playback.durationSec = 2
        seekPlayback(5)
        assert.equal(globals.recording.playback.positionSec, 2)
        seekPlayback(-1)
        assert.equal(globals.recording.playback.positionSec, 0)
    })

    it('resets the position on stop when asked', () => {
        globals.recording.playback.positionSec = 1.25
        stopPlayback(true)
        assert.equal(globals.recording.playback.positionSec, 0)
    })
})

describe('playback keyboard highlighting', () => {
    beforeEach(() => {
        installBroadcastEvent()
        liveNoteEvents = []
        globals.recording.bpm = 120
        globals.recording.ppq = 480
        globals.recording.take = { chords: [], jam: [] }
        globals.recording.playback.highlightMode = 'played'
        globals.recording.playback.soundingKeys = []
        stopPlayback(true)
        liveNoteEvents = []
    })

    it('selects the notes that span a position', () => {
        // 1/960 s per tick. Chord spans 0..1s, solo spans 0.5..1.5s.
        const take = {
            chords: [{ midi: 60, startTick: 0, durationTicks: 960 }],
            jam: [{ midi: 72, startTick: 480, durationTicks: 960 }],
        }
        assert.deepEqual([...activeNotesAt(take, 0.1)].sort(), [60])
        assert.deepEqual([...activeNotesAt(take, 0.6)].sort(), [60, 72])
        assert.deepEqual([...activeNotesAt(take, 1.2)].sort(), [72])
        assert.deepEqual([...activeNotesAt(take, 1.6)], [])
    })

    it('treats the start as inclusive and the end as exclusive', () => {
        const take = { chords: [{ midi: 60, startTick: 480, durationTicks: 480 }], jam: [] }
        assert.deepEqual([...activeNotesAt(take, 0.5)], [60])   // exactly at the start
        assert.deepEqual([...activeNotesAt(take, 1.0)], [])     // exactly at the end
    })

    it('lights a played key once and unlights it when the position moves past it', () => {
        globals.recording.take = { chords: [{ midi: 60, playedMidi: 60, startTick: 0, durationTicks: 480 }], jam: [] }

        syncVisuals(0.1)
        assert.equal(liveNoteEvents.length, 1)
        assert.equal(liveNoteEvents[0].state, true)
        assert.equal(liveNoteEvents[0].note.number, 60)
        assert.equal(liveNoteEvents[0].source, 'playback')

        syncVisuals(0.1)  // same position, no repeat event
        assert.equal(liveNoteEvents.length, 1)

        syncVisuals(0.7)  // past the note end
        assert.equal(liveNoteEvents.length, 2)
        assert.equal(liveNoteEvents[1].state, false)
        assert.equal(liveNoteEvents[1].note.number, 60)
    })

    it('unlights any lit keys when playback stops', () => {
        globals.recording.take = { chords: [{ midi: 64, playedMidi: 64, startTick: 0, durationTicks: 960 }], jam: [] }
        syncVisuals(0.1)
        assert.equal(liveNoteEvents.length, 1)

        stopPlayback(true)
        assert.equal(liveNoteEvents.length, 2)
        assert.equal(liveNoteEvents[1].state, false)
        assert.equal(liveNoteEvents[1].note.number, 64)
    })

    it('previews notes while scrubbing without starting playback', () => {
        globals.recording.take = { chords: [{ midi: 60, playedMidi: 60, startTick: 0, durationTicks: 960 }], jam: [] }
        previewVisuals(0.1)

        assert.equal(liveNoteEvents.length, 1)
        assert.equal(liveNoteEvents[0].state, true)
        assert.equal(liveNoteEvents[0].note.number, 60)
        assert.equal(globals.recording.playback.positionSec, 0.1)
        assert.equal(globals.recording.playback.isPlaying, false)
    })

    it('separates sounding notes from played keys', () => {
        const take = {
            chords: [{ midi: 64, playedMidi: 48, startTick: 0, durationTicks: 960 }],
            jam: [{ midi: 72, playedMidi: 66, startTick: 480, durationTicks: 960 }],
        }
        assert.deepEqual([...soundingNotesAt(take, 0.1)].sort(), [64])
        assert.deepEqual([...playedNotesAt(take, 0.1)].sort(), [48])
        assert.deepEqual([...soundingNotesAt(take, 0.6)].sort(), [64, 72])
        assert.deepEqual([...playedNotesAt(take, 0.6)].sort(), [48, 66])
    })

    it('activeNotesAt returns sounding, played or the union per mode', () => {
        const take = { chords: [{ midi: 64, playedMidi: 48, startTick: 0, durationTicks: 960 }], jam: [] }
        assert.deepEqual([...activeNotesAt(take, 0.1, 'sounding')], [64])
        assert.deepEqual([...activeNotesAt(take, 0.1, 'played')], [48])
        assert.deepEqual([...activeNotesAt(take, 0.1, 'both')].sort(), [48, 64])
    })

    it('lights the played keys red and shows no overlay in played mode', () => {
        globals.recording.take = { chords: [{ midi: 64, playedMidi: 48, startTick: 0, durationTicks: 960 }], jam: [] }
        globals.recording.playback.highlightMode = 'played'
        syncVisuals(0.1)

        assert.equal(liveNoteEvents.length, 1)
        assert.equal(liveNoteEvents[0].note.number, 48)
        assert.deepEqual(globals.recording.playback.soundingKeys, [])
    })

    it('publishes the sounding notes and does not light red in sounding mode', () => {
        globals.recording.take = { chords: [{ midi: 64, playedMidi: 48, startTick: 0, durationTicks: 960 }], jam: [] }
        globals.recording.playback.highlightMode = 'sounding'
        syncVisuals(0.1)

        assert.deepEqual(globals.recording.playback.soundingKeys, [64])
        assert.equal(liveNoteEvents.length, 0)
    })

    it('lights played red and publishes sounding keys in both mode', () => {
        globals.recording.take = { chords: [{ midi: 64, playedMidi: 48, startTick: 0, durationTicks: 960 }], jam: [] }
        globals.recording.playback.highlightMode = 'both'
        syncVisuals(0.1)

        assert.deepEqual(globals.recording.playback.soundingKeys, [64])
        assert.equal(liveNoteEvents.length, 1)
        assert.equal(liveNoteEvents[0].state, true)
        assert.equal(liveNoteEvents[0].note.number, 48)
    })

    it('clears the sounding keys when playback stops', () => {
        globals.recording.take = { chords: [{ midi: 64, playedMidi: 48, startTick: 0, durationTicks: 960 }], jam: [] }
        globals.recording.playback.highlightMode = 'sounding'
        syncVisuals(0.1)
        assert.deepEqual(globals.recording.playback.soundingKeys, [64])

        stopPlayback(true)
        assert.deepEqual(globals.recording.playback.soundingKeys, [])
    })
})
