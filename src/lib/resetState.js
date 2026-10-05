// @ts-check
import { globals } from './globals.js'
import { changeScaleFilter } from './change-scale.js'
import { resetChordTriggerMap } from './triggerMaps'
import { resetChordHistory } from './autoScale.js'

/**
 * Clear any transpositions and re-instate the original chord config.
 *
 * Lives here rather than in `boot-project.js` so that `wire-events.js` can use
 * it without importing `boot-project.js`, which imports `wire-events.js`
 * (previously an import cycle).
 */
export function resetTranspositionsEtc() {
    // Called by button 'reset changes' or when hit piano lh key combination (C# G#)
    resetChordTriggerMap(globals.chordTriggerMap, globals.project.chords)
    // The sounding key returns to the written project key, and the live
    // follow/shuffle context starts fresh.
    globals.transpositionSemitones = 0
    resetChordHistory()
    // just in case scale changed; with no argument this uses the current
    // filter, or the project key scale when solo mode is 'key'
    changeScaleFilter()
    // just in case chord changed
    document.broadcastEvent('chord-changed', { notes: globals.currentLhNotes(), bass: globals.currentBass() })

    $('body')
        .toast({
            message: 'Transpositions Reset',
            displayTime: 1000,
            class: 'brown',
        })
}
