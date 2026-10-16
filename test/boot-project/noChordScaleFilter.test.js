import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { newProject } from '@/lib/boot-project.js'
import { changeScaleFilter } from '@/lib/change-scale.js'

/*
 * A project with no chords has no scale to filter against, so the right hand
 * plays exactly what is played (see jam()). The scale filter is derived from the
 * chord trigger map, so it must not keep a previous project's scale map, locked
 * scale or ScalePicker pick: that leaked state made the on-screen keyboard and
 * the Scale panel still look filtered after File > New.
 *
 * The global modes are not part of this: scale filtering on/off
 * (globals.scaleFilteringEnabled) and magic vs normal keyboard
 * (globals.enableLhChordTriggers) are the user's choices and must survive.
 */

function seedStaleScaleFilter() {
    globals.scaleTriggerMap = { C4: 'D4', D4: 'E4' }
    globals.scaleFiltering.scaleTonic = 'C'
    globals.scaleFiltering.scaleType = 'major'
    globals.scaleFiltering.scaleTypesMatchingCurrentChord = ['major', 'minor']
    globals.scaleFiltering.chordsThatFitScale = ['M', '7']
    globals.scaleFiltering.modesOfScale = [['C', 'major']]
    globals.scaleFiltering.autoScaleName = 'C major'
    globals.scaleFiltering.autoScaleNotes = ['C', 'D', 'E']
    globals.scaleFiltering.autoReason = 'continues the last chord'
    globals.scaleFiltering.manualScaleFilter = 'scale2'
    globals.scaleFiltering.manualScaleNote = 'C3'
    globals.scaleOverrideName = 'C major'
    globals.scaleOverrideNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    globals.scaleFiltering.keyModeActive = true
    globals.scaleFiltering.frozen = true  // the setter also stores frozenScaleNotes
}

/** The effects of the seed above that must be gone. */
function assertNoScaleFilter() {
    assert.equal(Object.keys(globals.scaleTriggerMap).length, 0, 'the stale scale map is cleared')
    assert.equal(globals.scaleFiltering.scaleTonic, '')
    assert.equal(globals.scaleFiltering.scaleType, '')
    assert.equal(globals.scaleFiltering.scaleTypesMatchingCurrentChord, undefined)
    assert.equal(globals.scaleFiltering.chordsThatFitScale.length, 0)
    assert.equal(globals.scaleFiltering.modesOfScale.length, 0)
    assert.equal(globals.scaleFiltering.autoScaleName, '')
    assert.equal(globals.scaleFiltering.autoScaleNotes.length, 0)
    assert.equal(globals.scaleFiltering.autoReason, '')
    assert.equal(globals.scaleFiltering.manualScaleFilter, '')
    assert.equal(globals.scaleFiltering.manualScaleNote, '')
    assert.equal(globals.scaleFiltering.frozen, false, 'the locked scale is released')
    assert.equal(globals.scaleFiltering.frozenScaleNotes.length, 0)
    assert.equal(globals.scaleFiltering.keyModeActive, false)
    assert.equal(globals.scaleOverrideName, '')
    assert.equal(globals.scaleOverrideNotes.length, 0)
}

describe('a project with no chords has no scale filter', () => {
    let savedBroadcast
    let events

    beforeEach(() => {
        savedBroadcast = document.broadcastEvent
        events = []
        document.broadcastEvent = (name, detail) => events.push({ name, detail })
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        seedStaleScaleFilter()
    })

    afterEach(() => {
        document.broadcastEvent = savedBroadcast
        globals.chordTriggerMap = {}
        globals.currentChordTriggerNote = undefined
        globals.chordHistory = []
    })

    it('File > New discards the previous project scale filter', () => {
        newProject()

        assert.equal(globals.project.chords.length, 0)
        assertNoScaleFilter()
        assert.ok(
            events.some((event) => event.name === 'scale-filtering-changed' && event.detail.notes.length === 0),
            'the UI is told the filter has gone',
        )
    })

    it('does not touch the scale filtering or keyboard mode switches', () => {
        globals.scaleFilteringEnabled = true
        globals.enableLhChordTriggers = true

        newProject()

        assert.equal(globals.scaleFilteringEnabled, true, 'scale filtering stays on')
        assert.equal(globals.enableLhChordTriggers, true, 'chord triggers stay on')
        assert.equal(globals.bypass, false, 'still in magic keyboard mode')
    })

    it('clearing the last chord clears the filter too', () => {
        // What deleting every grid row leaves behind: no chord trigger notes.
        changeScaleFilter()

        assertNoScaleFilter()
    })
})
