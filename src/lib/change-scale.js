// @ts-check
import pkg from 'lodash';  // import, { uniq } from 'lodash';
const { uniq } = pkg;
import * as Tonal from "@tonaljs/tonal";
import { globals } from "./globals.js"
import { buildNoteMap } from "./midi/jam-mapping-to-allowed.js"
import { findTop3MatchingScales } from './findMatchingScales'
import { createChordSymbol } from './note-tools.js';
import { chordSymbolToScaleNames } from './chord-to-scale.js';
import { scaleObjToNotes } from './scaleToNotes';
import { projectKeyName } from './projectKey.js';


/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").ScaleNotes} ScaleNotes */

/*

API
- changeScaleFilter (scale)
- setActiveScaleFilter (scaleTonic, scaleType, scaleNotes = [], scaleTypes = [])
- setActiveScaleFilterToMatchChord (chordTonic, chordType)

*/

/**
 * @module lib/change-scale
 * @desc Scale related.
 * 
 * ![](images-plantuml/filename2.png)
 * 
 * @startuml filename2.png
 *  actor onNoteOn
 *  collections globals #lightblue
 *  boundary Document
 *  boundary GM
 * 
 *  onNoteOn --> playChord
 * 
 *  playChord --> changeChordTriggerNoteAndThusScale
 * 
 *  changeChordTriggerNoteAndThusScale --> globals : .currentChordTriggerNote = singleNote
 *  changeChordTriggerNoteAndThusScale -> changeScaleFilter
 * 
 * alt scaleName == 'notes of chord'
 * 
 *  changeScaleFilter -> _setActiveScaleFilter
 * 
 * else normal Tonal scale
 * 
 *  changeScaleFilter -> calcScaleTypesDropdown
 *  changeScaleFilter -> setActiveScaleFilter
 *  setActiveScaleFilter --> globals : .scaleFiltering.scaleTonic = scaleObj.tonic
 *  setActiveScaleFilter --> globals : .scaleFiltering.scaleType = scaleObj.type;
 *  setActiveScaleFilter --> globals : .scaleFiltering.scaleTypesMatchingCurrentChord = scaleTypes
 *  setActiveScaleFilter -> _setActiveScaleFilter
 * 
 * end
 * 
 *  _setActiveScaleFilter --> globals : .maxChordConfigs = Object.keys(globals.chordTriggerMap).length
 *  note right of globals: setting .maxChordConfigs to what it already is?
 *  _setActiveScaleFilter -> globals : .scaleTriggerMap = buildNoteMap(...)
 *  note right of globals #aqua: build the scale trigger map
 * 
 *  changeScaleFilter -> reportScaleChange
 * 
 *  reportScaleChange --> Document : broadcast 'scale-changed'
 *  reportScaleChange --> Document : broadcast 'scale-filtering-changed'

 *  playChord --> GM : plays notes in GM
 *  playChord --> Document : broadcast 'chord-changed' for UI piano roll
 * @enduml
 * 
 * @startuml filename3.png
 *  Fred --> Mary
 *  Fred --> Mary2
 *  Fred --> Mary4
 * @enduml
 * 
 * 
 */


/**
 * Changes scale filtering for r.h. notes. Should be called only via a chord trigger note change.
 * Assumes globals.currentChordTriggerNote is set to a chord trigger note e.g. "D2"
 * @param {('scale1'|'scale2'|'scale3'|'notesOfChord'|'rhnotes')} [scaleFilter] Name of the scale filter to change to. 
 * If not supplied, reverts to `globals.currentScaleFilter` which means you can call
 * this function with no parameters and have the scale trigger map rebuild itself.
 * @returns Nothing
 * 
 * Relies (read only) on the following globals state, 
 * - globals.chordTriggerMap
 * - globals.currentChordTriggerNote
 * - globals.scaleFiltering.frozen
 * - globals.currentScaleNotes
 * - globals.currentScaleName
 * 
 * Calls `reportScaleChange` which does various broadcasts.
 */
export function changeScaleFilter(scaleFilter) {
    const requested = scaleFilter
    if (!scaleFilter)
        scaleFilter = globals.currentScaleFilter

    // protection
    if (globals.scaleFiltering.frozen)
        return
    if (Object.keys(globals.chordTriggerMap).length == 0)
        return

    // Solo mode 'key': chord changes and generic refreshes use the project key
    // scale. An explicit scale1/2/3/notesOfChord request is a deliberate
    // temporary switch and takes the normal path below. If no key can be
    // resolved, fall through to the per-chord behaviour.
    if (globals.soloMode === 'key' && (!requested || requested === 'rhnotes') && applyKeyScale())
        return
    if (globals.currentChordTriggerNote == undefined) {
        // Pick the first chord and its scale notes - should remember and pick the last chord and its scale notes?
        globals.currentChordTriggerNote = Object.keys(globals.chordTriggerMap)[0]
        console.warn(`${globals.currentChordTriggerNote} is the first chord defined in config - since scale was undefined we picked it`)
    }
    if (!Object.keys(globals.chordTriggerMap).includes(globals.currentChordTriggerNote)) {
        console.warn(`${globals.currentChordTriggerNote} not in globals.chordTriggerMap, your config needs looking at`)
        return
    }

    let chordConfig = globals.currentChordConfig()
    if (scaleFilter == undefined)
        scaleFilter = 'scale1'

    let scaleName  // name of scale e.g. "C major" or special "notes of chord"
    let scaleNotes // notes of scale

    if (scaleFilter == 'notesOfChord') {
        scaleName = 'notes of chord'
        scaleNotes = chordConfig.scaleNotesOfChord
    }
    else {
        if (!chordConfig[scaleFilter]) {
            clearActiveScaleFilter()
            return
        }
        scaleName = chordConfig[scaleFilter]
        scaleNotes = chordConfig[`${scaleFilter}Notes`]
    }

    if (scaleNotes == undefined)
        console.warn(`${scaleFilter}Notes not in chord config? globals.chordTriggerMap[${globals.currentChordTriggerNote}]`)

    globals.scaleFiltering.keyModeActive = false;

    if (scaleName == 'notes of chord') {
        // Added 'notes of chord' to combo and allow it to be selected
        // This indirectly sets scale combo box? Ironic since often the combo box sends us here. Doesn't hurt.
        // TODO This fixes what displays in combo when click on 'notes of chord' active scale, but using the combo to set notes of chord fails
        globals.scaleFiltering.scaleTonic = '';
        globals.scaleFiltering.scaleType = 'notes of chord';
        _setActiveScaleFilter(scaleNotes)
    }
    else {
        // TODO this logic is about combo dropdowns, then further logic in setActiveScaleFilter() has more logic
        // its _setActiveScaleFilter() that has the pure, build a trigger scale map, call.
        let scaleObj = Tonal.Scale.get(scaleName);
        let scaleTypes = calcScaleTypesDropdown(chordConfig);
        if (scaleObj.tonic == null)
            throw (`Scale '${scaleName}' has no tonic`)

        setActiveScaleFilter(scaleObj.tonic, scaleObj.type, scaleNotes, scaleTypes)  // pass scaleNotes just in case scaleObj.empty
    }

    // TODO for now leave this here, but later remove and do this in setActiveScaleFilter
    reportScaleChange()  // does various broadcasts
}

/**
 * Switch the right hand to the project key scale. Used by solo mode 'key' so
 * the whole solo stays in the key as the chords change.
 * @returns {boolean} false when the project has no resolvable key
 */
export function applyKeyScale() {
    const key = globals.getProjectKey()
    if (!key)
        return false
    const scaleObj = Tonal.Scale.get(`${key.tonic} ${key.type}`)
    if (scaleObj.empty)
        return false
    setActiveScaleFilter(scaleObj.tonic, scaleObj.type)
    globals.scaleFiltering.keyModeActive = true
    reportScaleChange()
    return true
}

/**
 * Set the per-project solo mode and apply it.
 * @param {'chord'|'key'} mode 'chord' follows scale1/2/3; 'key' stays on the key scale
 */
export function setSoloMode(mode) {
    globals.setSoloMode(mode)
    if (globals.soloMode === 'key')
        applyKeyScale()
    else
        changeScaleFilter()
}

/**
 * Flip Solo in key on or off. Used by the 0 computer key and the MIDI
 * Shift+Bb shortcut. Shows a small toast naming the key scale so the shortcut
 * gives feedback even when the grid is not in view.
 */
export function toggleSoloMode() {
    const turningOn = globals.soloMode !== 'key'
    setSoloMode(turningOn ? 'key' : 'chord')
    showSoloModeToast(turningOn)
}

/** @param {boolean} on */
function showSoloModeToast(on) {
    const key = globals.getProjectKey()
    const keyName = key ? projectKeyName(key) : ''
    const message = on
        ? `Solo in key: ON${keyName ? ` (${keyName})` : ' (no key set)'}`
        : 'Solo in key: OFF'
    // jQuery/Fomantic is a browser global; skip the toast when it is absent.
    if (typeof $ === 'function') {
        $('body').toast({
            message,
            displayTime: 1200,
            class: 'brown',
        })
    }
}

/**
 * Sets the active scale filter.
 * @param {string} scaleTonic root note of scale
 * @param {string} scaleType type of scale e.g. 'major'
 * @param {ScaleNotes} [scaleNotes] notes of a scale if tonic/type fails e.g. ['C', 'D', 'E', 'F', 'G', 'A', 'B']
 * @param {Array<string>} [scaleTypes] optional array of scale types, just in case we want to change global (and combo) drop down
 * @returns Nothing
 * 
 * Relies on the following globals state, some of which is written to
 * - globals.scaleFiltering.*
 * - globals.maxChordConfigs
 * - globals.getLhTriggerOctave(),
 * - globals.getRhJamSoundOctave(),
 *
 * Note:
 * - Called ONCE by chordpicker combo box, without scaleTypes - since we don't want to change anything in dropdown
 * - Called many times by setScaleToMatchChord(), above
*/
export function setActiveScaleFilter(scaleTonic, scaleType, scaleNotes = [], scaleTypes = [], override = false) {
    globals.scaleFiltering.keyModeActive = false;
    const scaleObj = Tonal.Scale.get(`${scaleTonic} ${scaleType}`)
    if (scaleObj.empty && scaleNotes.length == 0)
        throw ('Called with no scale tonic or scale type and no scaleNotes')
    if (!scaleObj.empty)
        scaleNotes = scaleObjToNotes(scaleObj)  // extract note with auto fix of weird ## etc.

    // This indirectly sets scale combo box? Ironic since often the combo box sends us here. Doesn't hurt.
    globals.scaleFiltering.scaleTonic = scaleObj.tonic;
    globals.scaleFiltering.scaleType = scaleObj.type;

    // Record other scale types that have been passed in as a parameter
    if (scaleTypes.length > 0)
        globals.scaleFiltering.scaleTypesMatchingCurrentChord = scaleTypes

    // Fancy info about the scale
    if (scaleObj.empty) {
        globals.scaleFiltering.chordsThatFitScale = []
        globals.scaleFiltering.modesOfScale = []
    }
    else {
        globals.scaleFiltering.chordsThatFitScale = Tonal.Scale.scaleChords(scaleObj.type);
        globals.scaleFiltering.modesOfScale = Tonal.Scale.modeNames(scaleObj.tonic + ' ' + scaleObj.type);
    }

    if (override) {
        globals.scaleOverrideName = scaleObj.tonic + ' ' + scaleObj.type
        globals.scaleOverrideNotes = scaleNotes
    }
    else {
        globals.scaleOverrideName = ''
        globals.scaleOverrideNotes = []
    }

    _setActiveScaleFilter(scaleNotes);
}

/**
 * Sets the active scale filter to be the first scale that is compatible with the chord tonic and type.
 * This is called repeatedly from the chordpicker component (and from nowhere else). 
 * Happens to pick the top3 scales only, though this could be changed to populate the combo with all compatible scales.
 * @param {string} chordTonic the root note of the chord e.g. 'C'
 * @param {*} chordType the type of chord e.g. 'm7'
 * @returns Nothing
 */
export function setActiveScaleFilterToMatchChord(chordTonic, chordType, strategy = 'top 3') {  // or 'all compatible'
    if (globals.scaleFiltering.frozen)
        return
    const chordSymbol = createChordSymbol(chordTonic, chordType)

    const scaleTypes = calcScaleTypesDropdownFromChordSymbol(chordSymbol, strategy, globals.getProjectKey())
    const scale1 = `${chordTonic} ${scaleTypes[0]}`

    const scaleObj = Tonal.Scale.get(scale1)
    if (scaleObj.tonic == null)
        throw (`Scale '${scale1}' has no tonic`)
    setActiveScaleFilter(scaleObj.tonic, scaleObj.type, [], scaleTypes)
}


// ┌─┐┬─┐┬┬  ┬┌─┐┌┬┐┌─┐
// ├─┘├┬┘│└┐┌┘├─┤ │ ├┤ 
// ┴  ┴└─┴ └┘ ┴ ┴ ┴ └─┘


function _setActiveScaleFilter(scaleNotes) {

    globals.maxChordConfigs = Object.keys(globals.chordTriggerMap).length;  // Hack? ensures globals.jamTriggerOctave is correctly set
    // console.log('_setActiveScaleFilter', globals.maxChordConfigs) // TODO maxChordConfigs debugging 1

    // console.log('changeScaleFilter', scale, 'globals.maxChordConfigs set to', globals.maxChordConfigs)
    const options = {
        strategy: globals.scaleFiltering.strategy,
        preserveOctaves: globals.scaleFiltering.preserveOctaves,
        padWithLastGoodNote: globals.scaleFiltering.padWithLastGoodNote,
        autoDropOctave: globals.scaleFiltering.autoDropOctave,
        backfill: globals.scaleFiltering.backfill,
    };
    globals.scaleTriggerMap = buildNoteMap(
        scaleNotes,
        globals.maxChordConfigs,
        globals.getLhTriggerOctave(),
        globals.getRhJamSoundOctave(),
        options
    );

    // TODO should do broadcasting here, but enhance to allow non lh triggered scale situations too
    // reportScaleChange(scale ? scale : 'default')  // does various broadcasts
}

function clearActiveScaleFilter() {
    globals.scaleFiltering.scaleTonic = ''
    globals.scaleFiltering.scaleType = ''
    globals.scaleFiltering.scaleTypesMatchingCurrentChord
    globals.scaleFiltering.chordsThatFitScale = []
    globals.scaleFiltering.modesOfScale = []
    globals.scaleTriggerMap = {}
}

/**
 * Calculate all compatible scale types for a given chord. Prioritise the scale
 * types specified in .scale1, .scale2, .scale3 but also add in the other scale
 * types that Tonal thinks are compatible with `chordConfig.chord`.
 * @namespace Combobox
 * @param {ChordConfig} chordConfig 
 * @returns Array<string> scale types for the current chord config e.g.
 * `['major', 'minor', 'dorian']`
 *
 * Note: we have a slight problem if we have different scale tonics in the chord
 * config e.g. [C major, A minor, C m9] since this will result in [major, minor,
 * m9] which whilst correct, means that the user will be able to select e.g. 'C
 * minor' which is not what we want.  Its a minor bug for now. 🥸 AHA - we could
 * cheat and include the tonic in the scale name, and detect this situation when
 * we do a scale select, and move the tonic bit to the tonic.
 */
function calcScaleTypesDropdown(chordConfig) {
    // Get existing scale types from the config
    const existingScales = [chordConfig.scale1, chordConfig.scale2, chordConfig.scale3]
    const existingScalesSafe = existingScales.map(s => s != undefined ? s : '').filter(s => s != '')  // get rid of typescript warning
    const existingScaleTypes = uniq(existingScalesSafe.map(scale => Tonal.Scale.get(scale).type)); // strip off the tonic

    // Add in the other scale types that Tonal thinks are compatible with the chord
    // May fail with custom chords, but we don't care about that for now
    let extraScaleTypes = []
    try {
        extraScaleTypes = chordSymbolToScaleNames(chordConfig.chord, globals.getProjectKey())
        // console.log('extraScaleTypes for', chordConfig.chord, 'are', extraScaleTypes.join(', '))
        // eslint-disable-next-line no-empty
    } catch (error) {
    }
    return uniq([...existingScaleTypes, ...extraScaleTypes])
}

function calcScaleTypesDropdownFromChordSymbol(chordSymbol, strategy = 'top 3', key = undefined) {  // or 'all compatible'
    let scaleTypes = []
    if (strategy == 'top 3') {
        const [scale1, scale2, scale3] = findTop3MatchingScales([chordSymbol], true, {}, key)  // scale is a string which contains tonic e.g. 'C major'
        scaleTypes = [scale1, scale2, scale3].map(scale => Tonal.Scale.get(scale).type)
    }
    else {  // 'all compatible'
        // const scaleTonic = Tonal.Chord.get(chordSymbol).tonic
        scaleTypes = chordSymbolToScaleNames([chordSymbol], key)
    }
    return scaleTypes
}


// ┌┐ ┬─┐┌─┐┌─┐┌┬┐┌─┐┌─┐┌─┐┌┬┐
// ├┴┐├┬┘│ │├─┤ │││  ├─┤└─┐ │ 
// └─┘┴└─└─┘┴ ┴─┴┘└─┘┴ ┴└─┘ ┴ 

function reportScaleChange() {
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('scale-changed', { notes: globals.currentScaleNotes })

    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('scale-filtering-changed', { state: globals.scaleFilteringEnabled, notes: globals.currentScaleNotes })
}
