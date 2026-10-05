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
import { chooseScaleForChord, noteScaleChange, SCALE_POLICIES } from './autoScale.js';
import { remapHeldSoloNotes } from './midi/remap-held-solo-notes.js';


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

    // A normal scale change replaces any live auto/shuffle scale. The policy
    // itself is untouched, so the next chord trigger may choose again.
    clearAutoScaleState()

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
    globals.scaleFiltering.manualScaleNote = ''
    globals.scaleFiltering.manualScaleFilter = ''
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
    clearAutoScaleState();
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

/**
 * The player picked a scale filter by hand (a grid cell click, a 1-4
 * shortcut or a right-hand black key). Remember the choice so the follow and
 * shuffle policies respect it, and apply it now. The pick is kept while its
 * own chord keeps sounding and is carried to the next different chord once,
 * so it overrides the policy for the next chord hit either way.
 * @param {'scale1'|'scale2'|'scale3'|'notesOfChord'} filter
 */
export function pickManualScaleFilter(filter) {
    if (!filter)
        return
    globals.scaleFiltering.frozen = false
    globals.currentScaleFilter = filter
    globals.scaleFiltering.manualScaleFilter = filter
    globals.scaleFiltering.manualScaleNote = globals.currentChordTriggerNote
    changeScaleFilter(filter)
}

/**
 * Sound a live scale that is not one of the chord's stored slots, used by the
 * shuffle policy. The scale is remembered separately from the ScalePicker
 * override so the two cannot fight, and is shown as "(auto)" in the UI.
 * @param {string} scaleTonic
 * @param {string} scaleType
 * @param {Array<string>} [scaleNotes]
 * @param {Array<string>} [scaleTypes] scale types for the picker dropdown
 * @param {string} [reason] short explanation for the UI
 */
export function setAutoScaleFilter(scaleTonic, scaleType, scaleNotes = [], scaleTypes = [], reason = '') {
    setActiveScaleFilter(scaleTonic, scaleType, scaleNotes, scaleTypes)
    globals.scaleFiltering.autoScaleName = scaleTonic ? `${scaleTonic} ${scaleType}` : scaleType
    globals.scaleFiltering.autoScaleNotes = scaleNotes
    globals.scaleFiltering.autoReason = reason
    reportScaleChange()
}

/**
 * Apply the active follow/shuffle policy to the current chord, if any.
 * For shuffle this honours the dwell and change-chance options: the drawn rank
 * is held for a number of triggers and redrawn only at a boundary.
 * @param {{force?: boolean, rng?: () => number}} [options] force redraws now.
 * @returns {boolean} true when a policy choice was applied
 */
export function applyScalePolicy(options = {}) {
    if (globals.scaleFiltering.frozen)
        return false
    const policy = globals.scaleFiltering.policy
    const state = globals.scaleFiltering
    const policyOptions = state.policyOptions
    const rng = options.rng ?? Math.random
    const currentChordId = globals.currentChordConfig().id

    // Shuffle only changes on a real chord change; a repeated trigger of the
    // same chord holds the scale. A change made while solo notes are held takes
    // the closest fit instead of a random jump.
    let mode = 'draw'
    let closest = false
    if (policy === 'shuffle' && !options.force) {
        const notesHeld = Object.keys(globals.pendingNoteOffs).length > 0
        const chordChanged = currentChordId !== state.shuffleChordId
        const canHold = state.shuffleRank != null
        if (!chordChanged && canHold) {
            mode = 'hold'
        }
        else if (chordChanged && canHold && state.shuffleDwellRemaining > 0) {
            mode = 'hold'
        }
        else if (notesHeld && (policyOptions?.deferWhilePlaying ?? true)) {
            mode = 'closest'
            closest = true
        }
        else if (chordChanged && canHold && rng() >= (policyOptions?.changeChance ?? 1)) {
            mode = 'steady'
        }
    }
    const heldRank = (mode === 'hold' || mode === 'steady') ? state.shuffleRank : null

    const decision = chooseScaleForChord(globals.currentChordConfig(), policy, { heldRank, rng, closest })
    if (!decision)
        return false
    if (decision.type === 'slot') {
        globals.currentScaleFilter = decision.slot
        changeScaleFilter(decision.slot)
        // changeScaleFilter() clears the auto state, so set the reason after it.
        globals.scaleFiltering.autoReason = decision.reason
    }
    else {
        if (mode === 'hold') {
            if (currentChordId !== state.shuffleChordId)
                state.shuffleDwellRemaining = Math.max(0, state.shuffleDwellRemaining - 1)
        }
        else {
            state.shuffleRank = decision.rank ?? null
            state.shuffleDwellRemaining = Math.max(0, (policyOptions?.dwell ?? 1) - 1)
        }
        state.shuffleChordId = currentChordId
        state.shuffleDeferred = mode === 'closest'
        setAutoScaleFilter(decision.tonic ?? '', decision.scaleType ?? '', decision.notes ?? [], decision.scaleTypes ?? [], decision.reason)
    }
    return true
}

/**
 * Force a fresh shuffle draw for the current chord and reset its dwell.
 */
export function rerollShuffleScale() {
    if (globals.scaleFiltering.policy !== 'shuffle')
        return
    if (globals.scaleFiltering.frozen || globals.soloMode === 'key')
        return
    applyScalePolicy({ force: true })
}

/**
 * Change the scale policy from the UI and apply it to the current chord so the
 * effect is immediate. Switching back to manual restores the stored slot.
 * @param {'manual'|'follow'|'shuffle'} policy
 */
export function setScalePolicy(policy) {
    if (!SCALE_POLICIES.includes(policy))
        policy = 'manual'
    globals.scaleFiltering.policy = policy
    // Choosing a policy releases any manual per-chord pick so it can act now,
    // and starts the shuffle dwell fresh.
    globals.scaleFiltering.manualScaleNote = ''
    globals.scaleFiltering.manualScaleFilter = ''
    globals.scaleFiltering.shuffleRank = null
    globals.scaleFiltering.shuffleDwellRemaining = 0
    globals.scaleFiltering.shuffleChordId = null
    globals.scaleFiltering.shuffleDeferred = false
    if (!globals.isProjectLoaded)
        return
    if (policy === 'manual') {
        changeScaleFilter()
        return
    }
    if (globals.soloMode === 'key' || globals.scaleFiltering.frozen)
        return
    applyScalePolicy()
    showScalePolicyToast(policy)
}

/** @param {string} policy */
function showScalePolicyToast(policy) {
    if (typeof $ === 'function') {
        const label = policy === 'follow' ? 'Follow history' : 'Shuffle'
        $('body').toast({
            message: `Scales: ${label}`,
            displayTime: 1200,
            class: 'brown',
        })
    }
}

function clearAutoScaleState() {
    globals.scaleFiltering.autoScaleName = ''
    globals.scaleFiltering.autoScaleNotes = []
    globals.scaleFiltering.autoReason = ''
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
    clearAutoScaleState()
    globals.scaleFiltering.manualScaleNote = ''
    globals.scaleFiltering.manualScaleFilter = ''
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
    // Keep the chord history in step when the scale changes without a chord
    // trigger, for example when the player picks a scale by hand.
    noteScaleChange()

    // A chord trigger may arrive a few milliseconds after a solo note, so keep
    // held solo notes in step with the scale that just became current.
    remapHeldSoloNotes()

    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('scale-changed', { notes: globals.currentScaleNotes })

    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('scale-filtering-changed', { state: globals.scaleFilteringEnabled, notes: globals.currentScaleNotes })
}
