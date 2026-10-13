// @ts-check
// globals.currentBass() is the sounding bass: the explicit Bass field when the
// user set one, otherwise the derived bassNote. The Active Chord display reads
// it, so it must never go blank for a derived-bass row.
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { rebuildTriggerMap } from '@/lib/gridArrangement.js'
import { resetInspector } from '@/lib/chordInspector.js'

function install(chords) {
    globals.project = buildProject(chords)
    globals.maxChordConfigs = 3
    globals.idsToDelete = []
    globals.chordTriggerMap = {}
    globals.currentChordTriggerNote = undefined
    globals.currentChordBeingJammed.chord = ''
    globals.currentChordBeingJammed.chordNotes = []
    globals.currentChordBeingJammed.symbols = []
    globals.currentChordBeingJammed.bass = ''
    globals.currentChordBeingJammed.source = ''
    resetInspector()
    rebuildTriggerMap()
}

describe('globals.currentBass', () => {
    it('falls back to the derived bassNote when no explicit bass was chosen', () => {
        install([['C3', 'E3', 'G3']])
        const trigger = Object.keys(globals.chordTriggerMap)[0]
        globals.currentChordTriggerNote = trigger
        const config = globals.chordTriggerMap[trigger]
        assert.ok(!config.bass, 'the explicit Bass field stays blank')
        assert.equal(config.bassNote, 'C2')
        assert.equal(globals.currentBass(), 'C2', 'the derived bass still sounds')
    })

    it('prefers the explicit bass when the user set one', () => {
        install([['C3', 'E3', 'G3']])
        const trigger = Object.keys(globals.chordTriggerMap)[0]
        globals.currentChordTriggerNote = trigger
        globals.chordTriggerMap[trigger].bass = 'G'
        assert.equal(globals.currentBass(), 'G')
    })
})
