import { globals } from "../globals.js"
import { playChord, playChordOff } from "./play-chord.js"
import { transposeChordTriggerMap } from "../transpose"
import { stopAllNotes } from "./stop-all-notes.js"
import { changeScaleFilter } from "../change-scale.js"
import { jam, jamOff } from "./jam.js"
import { resetTranspositionsEtc } from "../resetState.js"


let modifierKeysCsharp = []
let modifierKeysDsharp = []
let modifierKeysFsharp = []
let modifierKeysGsharp = []
let modifierKeysAsharp = []

export function calculateRhBlackNoteModifierNotes() {
    modifierKeysCsharp = [
        `C#${globals.keyboard.rhJamSoundOctave}`,
        `C#${globals.keyboard.rhJamSoundOctave + 1}`,
        `C#${globals.keyboard.rhJamSoundOctave + 2}`,
        `C#${globals.keyboard.rhJamSoundOctave + 3}`,
    ]
    modifierKeysDsharp = [
        `D#${globals.keyboard.rhJamSoundOctave}`,
        `D#${globals.keyboard.rhJamSoundOctave + 1}`,
        `D#${globals.keyboard.rhJamSoundOctave + 2}`,
        `D#${globals.keyboard.rhJamSoundOctave + 3}`,
    ]
    modifierKeysFsharp = [
        `F#${globals.keyboard.rhJamSoundOctave}`,
        `F#${globals.keyboard.rhJamSoundOctave + 1}`,
        `F#${globals.keyboard.rhJamSoundOctave + 2}`,
        `F#${globals.keyboard.rhJamSoundOctave + 3}`,
    ]
    modifierKeysGsharp = [
        `G#${globals.keyboard.rhJamSoundOctave}`,
        `G#${globals.keyboard.rhJamSoundOctave + 1}`,
        `G#${globals.keyboard.rhJamSoundOctave + 2}`,
        `G#${globals.keyboard.rhJamSoundOctave + 3}`,
    ]
    modifierKeysAsharp = [
        `A#${globals.keyboard.rhJamSoundOctave}`,
        `A#${globals.keyboard.rhJamSoundOctave + 1}`,
        `A#${globals.keyboard.rhJamSoundOctave + 2}`,
        `A#${globals.keyboard.rhJamSoundOctave + 3}`,
    ]

}

/**
 * ollama 2 summary: The function checks if the note on event is a single note chord, and if so, plays the corresponding chord using the `playChord` function.
 * If the event is not a single note chord, but rather an LH (left-hand) modifier key press (C#, D#, F#, G#, A#), it updates the `blackShiftState` variable and/or sets the `scaleFilteringModificationSticky` variable.
 * It also checks if the scale filtering is enabled, and if so, it updates the `currentScaleFilter` variable and calls the `changeScaleFilter` function with the new scale filter name.
 * The function also handles the case where an LH chord is triggered, which can cause a change in scale filtering strategy or permanent change in the current scale filter.
 *
 * @param {*} e webmidi event
 * @returns void
 */
export function onNoteOn(e) {
    if (!globals.enableLhChordTriggers) {
        jam(e.note)
        return
    }

    if (globals.isLhMetaKey(e.note.identifier)) {
        // Not really used but nice to have and watch in the UI
        globals.blackKeysDownMap[e.note.identifier] = true
    }

    // single note chord
    if (e.note.identifier in globals.chordTriggerMap) {
        playChord(e.note.identifier, { originNote: e.note, duration: e.duration, when: e.when, silent: e.note.attack == 0 })
    }


    // lh modifiers
    else if (e.note.identifier === globals.lhMetaKeys.lhCsharp) {  // C# - lh black shifter
        globals.blackShiftState = true
    }
    else if (e.note.identifier === globals.lhMetaKeys.lhDsharp) {  // D#
        if (globals.blackShiftState)
            stopAllNotes()
        else
            cmdSetScaleFiltering(false)
    }
    else if (e.note.identifier === globals.lhMetaKeys.lhFsharp) {  // F#
        if (globals.blackShiftState)
            // globals.scaleFilteringModificationSticky = !globals.scaleFilteringModificationSticky // deprecated - I never used this toggle
            document.broadcastEvent("chord-add", {})
        else
            cmdSetScaleFiltering(true)
    }
    else if (e.note.identifier === globals.lhMetaKeys.lhGsharp) {  // G#
        if (globals.blackShiftState)
            resetTranspositionsEtc()  // clear any transpositions by re-instating original chord config
        else {
            transposeChordTriggerMap(-2)  // currently 2 is ignored, a semitone is used instead
        }
    }
    else if (e.note.identifier === globals.lhMetaKeys.lhAsharp) {  // A#
        // SHIFT + A# is intentionally unused; SHIFT + G# resets transpositions
        if (!globals.blackShiftState)
            transposeChordTriggerMap(+2)  // currently 2 is ignored, a semitone is used instead
    }
    // rh modifiers
    else if (globals.scaleFilteringEnabled && modifierKeysCsharp.includes(e.note.identifier)) {
        globals.scaleFiltering.frozen = false
        globals.currentScaleFilter = 'scale1'
        changeScaleFilter()  // if no params, will use globals.currentScaleFilter scale
    }
    else if (globals.scaleFilteringEnabled && modifierKeysDsharp.includes(e.note.identifier)) {
        // TODO why set the global.currentScaleFilter as well as pass in the
        // param to changeScaleFilter? You'd think that the parameter should be
        // sufficient. Well, it turns out that changeScaleFilter() does not
        // change globals.currentScaleFilter - interesting. Perhaps it should.
        // Note also that triggering lh chord will trigger a change in scale
        // and we won't go through this logic here - so to get a permanent change
        // in scale, you need to set globals.currentScaleFilter.
        globals.scaleFiltering.frozen = false
        globals.currentScaleFilter = 'scale2'
        changeScaleFilter('scale2')
    }
    else if (globals.scaleFilteringEnabled && modifierKeysFsharp.includes(e.note.identifier)) {
        globals.scaleFiltering.frozen = false
        globals.currentScaleFilter = 'scale3'
        changeScaleFilter('scale3')
    }
    else if (globals.scaleFilteringEnabled && modifierKeysGsharp.includes(e.note.identifier)) {
        // globals.toggleScaleStrategy()  // deprecated
        // changeScaleFilter()
        globals.scaleFiltering.frozen = false
        globals.currentScaleFilter = 'notesOfChord'  // permanent change
        changeScaleFilter()
    }
    else if (globals.scaleFilteringEnabled && modifierKeysAsharp.includes(e.note.identifier)) {
        // globals.toggleScalePreserveOctaves()  // deprecated
        // changeScaleFilter('notes of chord')  // for a temporary change untill lh chord hits again
        globals.scaleFiltering.frozen = !globals.scaleFiltering.frozen
        changeScaleFilter()
    }
    else {
        // Jam
        // echo to output
        jam(e.note)
    }
}

export function onNoteOff(e) {
    if (!globals.enableLhChordTriggers) {
        globals.scaleFilteringEnabled = false // no point disabling lh triggers when can't jam in that area
        jamOff(e.note)
        return
    }

    // TODO: right-hand modifier filtering is not wired up yet; this list is kept
    // until the commented-out check below (see the "rh modifiers" else-if) is enabled.
    // eslint-disable-next-line no-unused-vars
    let ignoreRhModifiers = [
        // rh modifiers
        `C#${globals.keyboard.rhJamSoundOctave}`,
        `D#${globals.keyboard.rhJamSoundOctave}`,
        `F#${globals.keyboard.rhJamSoundOctave}`,
        `G#${globals.keyboard.rhJamSoundOctave}`,
        `A#${globals.keyboard.rhJamSoundOctave}`,
        `C#${globals.keyboard.rhJamSoundOctave + 1}`,
        `D#${globals.keyboard.rhJamSoundOctave + 1}`,
        `F#${globals.keyboard.rhJamSoundOctave + 1}`,
        `G#${globals.keyboard.rhJamSoundOctave + 1}`,
        `A#${globals.keyboard.rhJamSoundOctave + 1}`,
        `C#${globals.keyboard.rhJamSoundOctave + 2}`,
        `D#${globals.keyboard.rhJamSoundOctave + 2}`,
        `F#${globals.keyboard.rhJamSoundOctave + 2}`,
        `G#${globals.keyboard.rhJamSoundOctave + 2}`,
        `A#${globals.keyboard.rhJamSoundOctave + 2}`,
        `C#${globals.keyboard.rhJamSoundOctave + 3}`,
        `D#${globals.keyboard.rhJamSoundOctave + 3}`,
        `F#${globals.keyboard.rhJamSoundOctave + 3}`,
        `G#${globals.keyboard.rhJamSoundOctave + 3}`,
        `A#${globals.keyboard.rhJamSoundOctave + 3}`,
    ]
    // Turn off single note chord
    if (e.note.identifier in globals.chordTriggerMap) {
        playChordOff(e.note.identifier)
    }
    // lh modifiers
    else if (globals.isLhMetaKey(e.note.identifier)) {
        delete globals.blackKeysDownMap[e.note.identifier]
        if (e.note.identifier === globals.lhMetaKeys.lhCsharp)
            globals.blackShiftState = false
    }
    // rh modifiers - no cannot ignore since could have been in non scale mode and accumulated a F# or something which needs to be turned off by jammOff()
    // else if (globals.scaleFilteringEnabled && ignoreRhModifiers.includes(e.note.identifier)) {
    // }
    else {
        jamOff(e.note)
    }

}

function onCC(event) {
    // console.log(`CC: ${event.controller.number} (${event.controller.name})`, event.rawValue)
    if (globals.channel2)
        globals.channel2.sendControlChange(event.controller.number, event.rawValue)
}

// Real MIDI keyboard events
function onNoteOnRealMidi(e) {
    // console.log('ON', e.note)
    if (e.note.attack == 0) {
        // this is really a note off
        onNoteOffRealMidi(e)
        return
    }
    document.broadcastEvent('live-note', { state: true, note: e.note })
    onNoteOn(e)
}
function onNoteOffRealMidi(e) {
    // console.log('OFF', e.note)
    document.broadcastEvent('live-note', { state: false, note: e.note })
    onNoteOff(e)
}

// Wire

export function wireNoteOnEvents(on = true) {
    on ? globals.mySynth.channels[1].addListener("noteon", onNoteOnRealMidi) :
        globals.mySynth.channels[1].removeListener("noteon", onNoteOnRealMidi)
}

export function wireNoteOffEvents(on = true) {
    on ? globals.mySynth.channels[1].addListener("noteoff", onNoteOffRealMidi) :
        globals.mySynth.channels[1].removeListener("noteoff", onNoteOffRealMidi)
}

export function wireCCEvents(on = true) {
    // Pass sustain pedal from main input to chord channel, as well as other CCs
    on ? globals.mySynth.addListener("controlchange", "all", onCC) :
        globals.mySynth.removeListener("controlchange", "all", onCC)
}

// Other

function cmdSetScaleFiltering(state) {
    // called by black piano keys
    globals.scaleFilteringEnabled = state
    document.broadcastEvent('scale-filtering-changed', { state: globals.scaleFilteringEnabled, notes: globals.currentScaleNotes })
}
