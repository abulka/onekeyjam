// @ts-check
import * as Tonal from '@tonaljs/tonal';
import { globals } from "./globals.js"
import { expandChordConfig } from "./expandChordConfig"
import { changeScaleFilter } from './change-scale';
import { removeBassSlash } from './removeBassSlash.js';
import { resetChordHistory } from './autoScale.js';

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
    // And actually the voicings of the chord notes won't be preserved.
    // Also risks creating ## and bb if interval is inappropriate to the tonic of the chord.
    if (name == '')
        return ''
    // Slash chords like E7/D are not Tonal symbols, but the chord part is.
    // Transpose the symbol and the bass separately and reattach them.
    const [symbol, bass] = removeBassSlash(name)
    const chordObj = Tonal.Chord.get(symbol)
    if (chordObj.empty)
        throw ('chord name ' + name + ' is not recognised')
    let newChordName = Tonal.Chord.transpose(symbol, intervalName)
    newChordName = chordSimplify(newChordName)
    if (bass)
        newChordName += '/' + Tonal.Note.simplify(Tonal.Note.transpose(bass, intervalName))
    return newChordName
}

// ┌┬┐┬─┐┌─┐┌┐┌┌─┐┌─┐┌─┐┌─┐┌─┐  ╔═╗┬ ┬┌─┐┬─┐┌┬┐  ╔═╗┌─┐┌┐┌┌─┐┬┌─┐
//  │ ├┬┘├─┤│││└─┐├─┘│ │└─┐├┤   ║  ├─┤│ │├┬┘ ││  ║  │ ││││├┤ ││ ┬
//  ┴ ┴└─┴ ┴┘└┘└─┘┴  └─┘└─┘└─┘  ╚═╝┴ ┴└─┘┴└──┴┘  ╚═╝└─┘┘└┘└  ┴└─┘

function addAsterisk(name) {
    // Adds an asterisk to the name, if its not already there, to indicate that this is transposed or altered
    return name.substr(-1) != '*' ? name + '*' : name
}

/**
 * Transpose the root note inside a custom chord name that Tonal cannot parse,
 * for example "G7inversion2" or "Dm7b5ChordNicerVoicing". The suffix after the
 * root is preserved, and a slash bass is transposed and reattached. Names that
 * are really note lists (comma separated) are left alone, because their notes
 * are transposed separately. The asterisk still marks the result as transposed.
 * @param {string} name
 * @param {string} intervalName
 */
function _transposeCustomChordName(name, intervalName) {
    const bare = name.endsWith('*') ? name.slice(0, -1) : name
    if (bare.includes(','))
        return addAsterisk(name)
    const [symbol, bass] = removeBassSlash(bare)
    const match = symbol.match(/^([A-Ga-g][#b]{0,2})(.*)$/)
    if (!match)
        return addAsterisk(name)
    const [, root, suffix] = match
    const newRoot = Tonal.Note.simplify(Tonal.Note.transpose(root, intervalName))
    if (!newRoot)
        return addAsterisk(name)
    let result = `${newRoot}${suffix}`
    if (bass)
        result += `/${Tonal.Note.simplify(Tonal.Note.transpose(bass, intervalName))}`
    return addAsterisk(result)
}

const transposeNotes = (notes, intervalName) => notes.map(note => Tonal.Note.simplify(Tonal.Note.transpose(note, intervalName)))

export function _transposeChordConfig(chordConfig, intervalName) {
    // Transform chord config down or up and adjust all scales too
    // in place
    chordConfig.name = addAsterisk(chordConfig.name)

    try {
        chordConfig.chord = _transposeChordName(chordConfig.chord, intervalName)
    } catch (error) {
        // probably a custom chord name: move its root note so the name keeps
        // describing what sounds (the engine also distrusts a stale root, but
        // the grid and chord picker should show the truth)
        chordConfig.chord = _transposeCustomChordName(chordConfig.chord, intervalName)
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

    // The sounding key moves with the chords, so key-aware ranking, the Key:
    // chip and Solo in key stay in step. The written project key is untouched.
    globals.transpositionSemitones = (globals.transpositionSemitones ?? 0) + (degrees > 0 ? 1 : -1)

    // A transposition starts a new musical context, so the follow/shuffle
    // history and any held draw are cleared.
    resetChordHistory()

    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('chord-changed', {
        notes: globals.currentLhNotes(),
        bass: globals.currentBass()
    })
    changeScaleFilter()  // broadcast a scale change since the scale is affected by the chord change
}
