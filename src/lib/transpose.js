// @ts-check
import * as Tonal from '@tonaljs/tonal';
import { globals } from "./globals.js"
import { expandChordConfig } from "./expandChordConfig"
import { changeScaleFilter } from './change-scale';

/**
 * @module lib/transpose
 * @desc Transposing scales, chords and chord configs.
 */


// ╔╦╗┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┌─┐┌─┐  ┌─┐┌─┐┌─┐┬  ┌─┐  ┌┐┌┌─┐┌┬┐┌─┐
//  ║ ├┬┘├─┤│││└─┐├─┘│ │└─┐├┤   └─┐│  ├─┤│  ├┤   │││├─┤│││├┤ 
//  ╩ ┴└─┴ ┴┘└┘└─┘┴  └─┘└─┘└─┘  └─┘└─┘┴ ┴┴─┘└─┘  ┘└┘┴ ┴┴ ┴└─┘

/**
 * Transpose a scale name by a given interval name.
 * @param {string} name scale name e.g. "d dorian"
 * @param {string} intervalName interval name e.g. "2m"
 * @returns {string} new scale name e.g. "Db dorian".
 * Empty names are returned as empty strings.
 */
export function transposeScaleName(name, intervalName = '2m') {
    // 
    if (!name)
        return ''
    if (name == 'notes of chord')
        return name
    let scaleObj = Tonal.Scale.get(name)
    if (scaleObj.empty)
        throw (`ERROR: transposeScaleName: Tonal scale called '${name}' was not found`)
    if (scaleObj.tonic == null)
        throw (`ERROR: transposeScaleName: Tonal scale called '${name}' has no tonic`)
    let tonic = scaleObj.tonic

    // '2m' means a semitone, can also use '1A' - use Tonal.distance("C3", "C#4") to what interval
    let newTonic = Tonal.Note.transpose(tonic, intervalName)
    newTonic = Tonal.Note.simplify(newTonic)
    return `${newTonic} ${scaleObj.type}`
}

// ┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┌─┐┌─┐  ┌─┐┬ ┬┌─┐┬─┐┌┬┐
//  │ ├┬┘├─┤│││└─┐├─┘│ │└─┐├┤   │  ├─┤│ │├┬┘ ││
//  ┴ ┴└─┴ ┴┘└┘└─┘┴  └─┘└─┘└─┘  └─┘┴ ┴└─┘┴└──┴┘

function chordSimplify(name) {
    // disassemble the chord and simplify the tonic
    const chordObj = Tonal.Chord.get(name)
    const tonic = chordObj.tonic
    if (tonic == null)
        throw (`ERROR: chordSimplify: Tonal chord called '${name}' has no tonic`)
    const simplifiedTonic = Tonal.Note.simplify(tonic)
    return simplifiedTonic + chordObj.aliases[0]
}

export function _transposeChordName(name, intervalName = '2m') {
    // Umm - this won't work with custom chord names ....
    // And actually, the voicings of the chord notes won't be preserved.
    // Also risks creating ## and bb if interval is inappropriate to the tonic of the chord.
    if (name == '')
        return ''
    let chordObj = Tonal.Chord.get(name)
    if (chordObj.empty)
        throw ('chord name ' + name + ' is not recognised')
    let newChordName = Tonal.Chord.transpose(name, intervalName)
    newChordName = chordSimplify(newChordName)
    return newChordName
}

// ┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┌─┐┌─┐  ╔═╗┬ ┬┌─┐┬─┐┌┬┐  ╔═╗┌─┐┌┐┌┌─┐┬┌─┐
//  │ ├┬┘├─┤│││└─┐├─┘│ │└─┐├┤   ║  ├─┤│ │├┬┘ ││  ║  │ ││││├┤ ││ ┬
//  ┴ ┴└─┴ ┴┘└┘└─┘┴  └─┘└─┘└─┘  ╚═╝┴ ┴└─┘┴└──┴┘  ╚═╝└─┘┘└┘└  ┴└─┘

function addAsterisk(name) {
    // Adds an asterisk to the name, if its not already there, to indicate that this is transposed or altered
    return name.substr(-1) != '*' ? name + '*' : name
}

const transposeNotes = (notes, intervalName) => notes.map(note => Tonal.Note.simplify(Tonal.Note.transpose(note, intervalName)))

export function _transposeChordConfig(chordConfig, intervalName) {
    // Transform chord config down or up and adjust all scales too
    // in place
    chordConfig.name = addAsterisk(chordConfig.name)

    try {
        chordConfig.chord = _transposeChordName(chordConfig.chord, intervalName)
    } catch (error) {
        // probably a custom chord name
        chordConfig.chord = addAsterisk(chordConfig.chord)
        if (chordConfig.chordNotes == undefined || chordConfig.chordNotes.length == 0)
            throw ('missing chord notes, no possibility of transposing custom chord ' + chordConfig.chord)
    }

    // preserve chord voicings by transposing the original notes, chord notes are always _preserved_ at the expand config stage
    if (chordConfig.chordNotes)
        chordConfig.chordNotes = transposeNotes(chordConfig.chordNotes, intervalName)

    // preserve chord voicings by transposing the original bass notes, `bassNote` is _not_ overwritten if it exists in the config
    if (chordConfig.bassNote)
        chordConfig.bassNote = Tonal.Note.simplify(Tonal.Note.transpose(chordConfig.bassNote, intervalName))
    if (chordConfig.bass)
        chordConfig.bass = Tonal.Note.simplify(Tonal.Note.transpose(chordConfig.bass, intervalName))

    // Note names will always be _regenerated_ at the expand config stage
    chordConfig.scale1 = transposeScaleName(chordConfig.scale1, intervalName)
    chordConfig.scale2 = transposeScaleName(chordConfig.scale2, intervalName)
    chordConfig.scale3 = transposeScaleName(chordConfig.scale3, intervalName)
    chordConfig.scale1Notes = []
    chordConfig.scale2Notes = []
    chordConfig.scale3Notes = []

    expandChordConfig(chordConfig)
}

export function _transposeChordConfigs(chordConfigs, intervalName) {
    // Transposes all chord configs
    for (let chordConfig of chordConfigs) {
        _transposeChordConfig(chordConfig, intervalName)
    }
}

// ┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┌─┐┌─┐  ┌─┐┬  ┬    ┌─┐┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐┌─┐
//  │ ├┬┘├─┤│││└─┐├─┘│ │└─┐├┤   ├─┤│  │    ├─┘├┬┘│ │ │├┤ │   │   │  │ ││││├┤ ││ ┬└─┐
//  ┴ ┴└─┴ ┴┘└┘└─┘┴  └─┘└─┘└─┘  ┴ ┴┴─┘┴─┘  ┴  ┴└─└─┘└┘└─┘└─┘ ┴   └─┘└─┘┘└┘└  ┴└─┘└─┘

export function transposeChordTriggerMap(degrees) {
    // Transposes all chord configs
    const intervalName = (degrees > 0 ? '2m' : '-2m')  // ignore degree amount for now
    _transposeChordConfigs(Object.values(globals.chordTriggerMap), intervalName)  // in place

    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('chord-changed', {
        notes: globals.currentLhNotes(),
        bass: globals.currentBass()
    })
    changeScaleFilter()  // broadcast a scale change since the scale is affected by the chord change
}
