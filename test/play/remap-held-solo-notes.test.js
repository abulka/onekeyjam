import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { remapHeldSoloNotes } from '@/lib/midi/remap-held-solo-notes.js'
import { detectChordsBeingPlayed } from '@/lib/detectChordsBeingPlayed.js'

vi.mock('@/lib/detectChordsBeingPlayed.js', () => ({
    detectChordsBeingPlayed: vi.fn(),
}))

/*
 * A solo note is filtered the instant its event arrives. When a chord trigger
 * lands a few milliseconds later it changes the scale, so any held solo note
 * that changed is replayed on the new scale, provided it is still inside the
 * grace window.
 */

describe('remapHeldSoloNotes', () => {
    let calls
    let savedRecording

    function fakeChannel() {
        return {
            playNote: (note, opts) => calls.push(['play', note, opts]),
            stopNote: (note) => calls.push(['stop', note]),
        }
    }

    beforeEach(() => {
        calls = []
        savedRecording = globals.recording
        document.broadcastEvent = () => { }
        globals.GM = false
        globals.channel = fakeChannel()
        globals.channel2 = undefined
        globals.channel3 = undefined
        globals.scaleFilteringEnabled = true
        globals.scaleTriggerMap = { E4: 'F4' }
        globals.pendingNoteOffs = {
            E4: { allowedNote: 'F4', velocity: 0.7, startedAt: 1000 },
        }
        globals.currentJamNote = { real: '', mapped: '' }
        globals.heldNoteRepair.enabled = true
        globals.heldNoteRepair.windowMs = 40
        globals.recording = { isRecording: false }
        detectChordsBeingPlayed.mockClear()
    })

    afterEach(() => {
        globals.recording = savedRecording
        globals.pendingNoteOffs = {}
        globals.scaleTriggerMap = {}
        globals.currentJamNote = { real: '', mapped: '' }
    })

    it('replays a changed held note on the new scale', () => {
        globals.scaleTriggerMap = { E4: 'G4' }
        globals.currentJamNote = { real: 'E4', mapped: 'F4' }

        const corrected = remapHeldSoloNotes({ now: 1010 })

        assert.equal(corrected, 1)
        assert.deepEqual(calls[0], ['stop', 'F4'])
        assert.deepEqual(calls[1], ['play', 'G4', { attack: 0.7 }])
        assert.equal(globals.pendingNoteOffs.E4.allowedNote, 'G4')
        assert.equal(globals.pendingNoteOffs.E4.startedAt, 1010)
        assert.equal(globals.currentJamNote.mapped, 'G4')
        assert.equal(detectChordsBeingPlayed.mock.calls.length, 1)
    })

    it('leaves a changed note alone when it is outside the grace window', () => {
        globals.scaleTriggerMap = { E4: 'G4' }

        const corrected = remapHeldSoloNotes({ now: 1100 })

        assert.equal(corrected, 0)
        assert.equal(calls.length, 0)
        assert.equal(globals.pendingNoteOffs.E4.allowedNote, 'F4')
        assert.equal(detectChordsBeingPlayed.mock.calls.length, 0)
    })

    it('does nothing when the mapping did not change', () => {
        globals.scaleTriggerMap = { E4: 'F4' }

        const corrected = remapHeldSoloNotes({ now: 1010 })

        assert.equal(corrected, 0)
        assert.equal(calls.length, 0)
    })

    it('stops a held note that the new scale has no note for', () => {
        globals.scaleTriggerMap = { E4: 'X' }

        const corrected = remapHeldSoloNotes({ now: 1010 })

        assert.equal(corrected, 1)
        assert.deepEqual(calls, [['stop', 'F4']])
        assert.equal('E4' in globals.pendingNoteOffs, false)
    })

    it('does not correct while recording', () => {
        globals.scaleTriggerMap = { E4: 'G4' }
        globals.recording.isRecording = true

        const corrected = remapHeldSoloNotes({ now: 1010 })

        assert.equal(corrected, 0)
        assert.equal(calls.length, 0)
        assert.equal(globals.pendingNoteOffs.E4.allowedNote, 'F4')
    })

    it('does nothing when correction is switched off', () => {
        globals.scaleTriggerMap = { E4: 'G4' }
        globals.heldNoteRepair.enabled = false

        assert.equal(remapHeldSoloNotes({ now: 1010 }), 0)
        assert.equal(calls.length, 0)
    })

    it('does nothing when scale filtering is disabled', () => {
        globals.scaleTriggerMap = { E4: 'G4' }
        globals.scaleFilteringEnabled = false

        assert.equal(remapHeldSoloNotes({ now: 1010 }), 0)
        assert.equal(calls.length, 0)
    })

    it('uses the default window when none is stored', () => {
        globals.scaleTriggerMap = { E4: 'G4' }
        globals.heldNoteRepair.windowMs = undefined

        // 40 ms default: 30 ms later is corrected, 50 ms later is not.
        assert.equal(remapHeldSoloNotes({ now: 1030 }), 1)
    })
})
