import { computed } from 'vue'
import * as Tonal from "@tonaljs/tonal";
import { globals } from "../../src/lib/globals.js"
import { calcAllChordSymbols } from "../../src/lib/calcAllChordSymbols";
import { sanitiseNoteToSharp, createChordSymbol } from "../../src/lib/note-tools.js"
import { chordPlay, auditionInfo } from "../../src/lib/auditionNotes"
import { setActiveScaleFilterToMatchChord, setActiveScaleFilter } from "../../src/lib/change-scale.js"
import { removeBassSlash } from '../../src/lib/removeBassSlash.js';
import { chordSymbolToNotesInversion } from "../../src/lib/chordSymbolToNotes";
import { calcChordInversionNumberAndNewBass } from "../../src/lib/chordInversion";
import { getRandomArbitary } from "../../src/lib/util.js"

// Private

function setChordRootAndBass(note) {
    // set root and bass note of current chord in chord combo
    let newNote = Tonal.Note.simplify(note)
    newNote = sanitiseNoteToSharp(newNote)
    globals.chordPicker.currentRoot = newNote
    globals.chordPicker.currentBass = newNote
    setActiveScaleFilterToMatchChord(globals.chordPicker.currentRoot, globals.chordPicker.currentChord)
}

function findChordInCombo(chordSymbolSansRoot) {
    // find index of current chord in combo
    let currentComboIndex = -1
    for (let i = 0; i < chordOptions.value.length; i++) {
        if (chordOptions.value[i].value == chordSymbolSansRoot) {
            currentComboIndex = i
            break
        }
    }
    if (currentComboIndex == -1)
        throw (`Cannot find '${chordSymbolSansRoot}' chord TYPE combo options`)
    return currentComboIndex
}

function smartFindChordTypeInCombo(chordSymbolNoRoot) {
    // returns the index of the chord in the combo, -1 if not found
    let currentComboIndex = -1
    try {
        currentComboIndex = findChordInCombo(chordSymbolNoRoot)
    } catch (error) {
        if (!globals.chordPicker.showAllChords) {
            globals.chordPicker.showAllChords = true
            // combo may need to show all chords for this to work, so retry 
            // with showAllChords = true, this time let exception happen cos it should always be found
            currentComboIndex = findChordInCombo(chordSymbolNoRoot)
        }
        else  // short chords list wasn't the problem, so throw the error
            throw (error)
    }
    return currentComboIndex
}

// Public

// tip: by converting into a computed, need to access the value with chordOptions.value
// @ts-ignore: some complaint about computed
export const chordOptions = computed({
    get: () => calcAllChordSymbols(globals.chordPicker.showAllChords, globals.chordPicker.shortChordNames),
})

export function setChordPicker(chordSymbolNoRoot, bassNote, rootNote) {
    // sync the chord picker to the jam chord, as well as the bass and root
    // returns true if the chord was found in the combo, false if not
    const currentComboIndex = smartFindChordTypeInCombo(chordSymbolNoRoot)
    if (currentComboIndex != -1) {
        globals.chordPicker.currentChord = chordSymbolNoRoot
        if (bassNote != undefined)
            globals.chordPicker.currentBass = sanitiseNoteToSharp(bassNote)
        if (rootNote != undefined)
            globals.chordPicker.currentRoot = sanitiseNoteToSharp(rootNote)
    }
    globals.chordPicker.currentChordInversion = 0
    return currentComboIndex != -1
}

export function setChordSmart(chordSymbolNoRoot, rootNote, bassNote) {
    // sets the chord and matching scale too
    const success = setChordPicker(chordSymbolNoRoot, bassNote, rootNote)
    if (success) {
        chordPickerToJammed()
        chordPlay()
        setActiveScaleFilterToMatchChord(globals.chordPicker.currentRoot, globals.chordPicker.currentChord)
    }
}
export function setChordFromSymbol(chordSymbol) {
    const chordObj = Tonal.Chord.get(chordSymbol)
    setChordSmart(chordObj.aliases[0], chordObj.tonic, chordObj.tonic);
}

export function chordPickerToJammed() {
    let [symbol, bass] = removeBassSlash(`${globals.chordPicker.currentRoot}${globals.chordPicker.currentChord}`)
    bass = bass ? bass : globals.chordPicker.currentBass

    globals.currentChordBeingJammed.chordNotes = chordSymbolToNotesInversion(symbol, globals.chordPicker.currentChordInversion)
    globals.currentChordBeingJammed.bass = globals.chordPicker.currentBass
    globals.currentChordBeingJammed.chord = symbol
    globals.currentChordBeingJammed.symbols = [symbol]
    globals.currentChordBeingJammed.stale = false
}

export function chordPickerToJammedExtraPrecision(chordNotes, bass) {
    // whilst we can get most info from the chord picker, esp. the notes from the
    // symbol doesn't give use the voicing that may be in the chord config, so use
    // this call to use the actual chord config notes which are obviously better
    // than the chord picker symbol guess at notes
    globals.currentChordBeingJammed.chordNotes = chordNotes
    globals.currentChordBeingJammed.bass = bass
}

// ╦┌┐┌┬  ┬┌─┐┬─┐┌─┐┬┌─┐┌┐┌┌─┐
// ║│││└┐┌┘├┤ ├┬┘└─┐││ ││││└─┐
// ╩┘└┘ └┘ └─┘┴└─└─┘┴└─┘┘└┘└─┘

export function chordInvert(direction = 1) {
    const { bass, inversion } = calcChordInversionNumberAndNewBass(
        globals.chordPicker.currentRoot,
        globals.chordPicker.currentChord,
        globals.chordPicker.currentChordInversion,
        globals.chordPicker.inversionChangesBass,
        direction
    )
    globals.chordPicker.currentChordInversion = inversion
    globals.chordPicker.currentBass = bass
    chordPickerToJammed()
    chordPlay()
    setActiveScaleFilterToMatchChord(globals.chordPicker.currentRoot, globals.chordPicker.currentChord)
}

export function nextChord(option) {
    // Change to the next available chord in the combo
    // option = 'next' or 'prev' or 'random'

    let currentComboIndex = findChordInCombo(globals.chordPicker.currentChord)

    if (option == 'next' && currentComboIndex < chordOptions.value.length - 1)
        currentComboIndex++
    else if (option == 'prev' && currentComboIndex > 0)
        currentComboIndex--
    else if (option == 'random')
        currentComboIndex = getRandomArbitary(0, chordOptions.value.length)

    // select it
    globals.chordPicker.currentChord = chordOptions.value[currentComboIndex].value
    chordPickerToJammed()
    chordPlay()
    setActiveScaleFilterToMatchChord(globals.chordPicker.currentRoot, globals.chordPicker.currentChord)

}

export function circleOfFifthTranspose(direction) {
    let newNote = Tonal.Note.transposeFifths(globals.chordPicker.currentRoot, direction)
    // let newNote = Tonal.Note.transpose(globals.chordPicker.currentRoot, '5P') // <-- same result !
    setChordRootAndBass(newNote)
    chordPickerToJammed()
    chordPlay()
}

export function transpose(amount = 1) {
    // one semitone is a minor 2nd interval it seems viz. '2m'
    // parameter 'amount' is a number e.g. 1 or -1
    let newNote = Tonal.Note.transpose(globals.chordPicker.currentRoot, Tonal.Interval.fromSemitones(amount))
    setChordRootAndBass(newNote)
    chordPickerToJammed()
    chordPlay()
}

