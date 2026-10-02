// @ts-check
import { globals } from './globals.js'
import { changeScaleFilter } from './change-scale.js'
import { resetChordTriggerMap } from './triggerMaps'

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
    // just in case scale changed
    changeScaleFilter(globals.currentScaleFilter)
    // just in case chord changed
    document.broadcastEvent('chord-changed', { notes: globals.currentLhNotes(), bass: globals.currentBass() })

    $('body')
        .toast({
            message: 'Transpositions Reset',
            displayTime: 1000,
            class: 'brown',
        })
}
