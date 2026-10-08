// @ts-check
import * as Tonal from '@tonaljs/tonal'
import { globals } from './globals.js'
import { changeScaleFilter, retuneLockedSoloScale } from './change-scale.js'
import { resetChordTriggerMap } from './triggerMaps'
import { resetChordHistory } from './autoScale.js'
import { remapHeldSoloNotes } from './midi/remap-held-solo-notes.js'

/**
 * Clear any transpositions and re-instate the original chord config.
 *
 * Lives here rather than in `boot-project.js` so that `wire-events.js` can use
 * it without importing `boot-project.js`, which imports `wire-events.js`
 * (previously an import cycle).
 */
export function resetTranspositionsEtc() {
    // Called by button 'reset changes' or when hit piano lh key combination (C# G#)
    const offset = globals.transpositionSemitones ?? 0
    resetChordTriggerMap(globals.chordTriggerMap, globals.project.chords)
    // The sounding key returns to the written project key, and the live
    // follow/shuffle context starts fresh.
    globals.transpositionSemitones = 0
    resetChordHistory()
    // A locked solo scale was moved with the transpose, so move it back too.
    // Otherwise the restored chords sound against the transposed solo.
    let lockedRetuned = false
    if (offset !== 0) {
        try {
            lockedRetuned = retuneLockedSoloScale(Tonal.Interval.fromSemitones(-offset))
        }
        catch (error) {
            lockedRetuned = false
        }
    }
    if (lockedRetuned) {
        // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
        document.broadcastEvent('scale-changed', { notes: globals.currentScaleNotes })
        // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
        document.broadcastEvent('scale-filtering-changed', { state: globals.scaleFilteringEnabled, notes: globals.currentScaleNotes })
        remapHeldSoloNotes({ windowMs: Infinity })
    }
    else {
        // just in case scale changed; with no argument this uses the current
        // filter, or the project key scale when solo mode is 'key'
        changeScaleFilter()
    }
    // just in case chord changed
    document.broadcastEvent('chord-changed', { notes: globals.currentLhNotes(), bass: globals.currentBass() })

    // jQuery/Fomantic is a browser global; skip the toast when it is absent (for example in tests).
    if (typeof $ === 'function') {
        $('body')
            .toast({
                message: 'Transpositions Reset',
                displayTime: 1000,
                class: 'brown',
            })
    }
}
