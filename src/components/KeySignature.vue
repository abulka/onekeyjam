<script setup>
import { computed, ref } from 'vue'
import { globals } from '../../src/lib/globals.js'
import { keyDetection } from '../../src/lib/keyDetection';
import { arraysAreEqual } from "../../src/lib/array-tools"
import { declaredProjectKey, projectKeyName, describeProjectKey, keyGroupsForProject, setChordKeyLocked, isChordKeyLocked } from '../../src/lib/projectKey.js'
import { applyProjectKeySettings, applyChordKeySettings } from '../../src/lib/projectScaleSettings.js'
import { sanitiseNoteToSharp } from '../../src/lib/note-tools.js'
import { setChordFromSymbol } from '../../src/lib/chordPicker.js'
import { suggestKeyGroups } from '../../src/lib/keyGroupDetection.js'
import { copyDownTargets } from '../../src/lib/keyGroupEditing.js'
import { getProjectChordsTriggers } from '../../src/lib/project-chord-triggers.js'
import ComboScale from './ComboScale.vue'

const currentKey = computed(() => globals.getProjectKey())

// The chords currently on the grid, in trigger order, so the key groups shown
// here match the rows shown in the chord grid.
const gridChords = computed(() =>
    getProjectChordsTriggers()
        .map((note) => globals.chordTriggerMap?.[note])
        .filter(Boolean))

// Runs of grid chords that share an effective key, for the summary line.
const keyGroups = computed(() => {
    void globals.project // recompute when the project changes
    return keyGroupsForProject(globals.project, gridChords.value)
})

const distinctKeyCount = computed(() =>
    new Set(keyGroups.value.map((group) => projectKeyName(group.key))).size)

// "1 group, 1 key in use" / "2 groups, 3 keys in use".
const keyGroupsSummary = computed(() => {
    const groups = keyGroups.value.length
    const keys = distinctKeyCount.value
    return `${groups} group${groups === 1 ? '' : 's'}, ${keys} key${keys === 1 ? '' : 's'} in use`
})

// One editable row per grid chord, in trigger order. The select holds the
// chord's own key when it has one, or empty for the project-key fallback.
const chordRows = computed(() => {
    void globals.project
    return gridChords.value.map((chordConfig) => ({
        id: chordConfig.id,
        chordConfig,
        chord: chordConfig.chord,
        hasOwnKey: !!chordConfig.key,
        locked: isChordKeyLocked(chordConfig),
        selectValue: chordConfig.key
            ? `${sanitiseNoteToSharp(chordConfig.key.tonic)}|${chordConfig.key.type}`
            : '',
    }))
})

const allChordsLocked = computed(() =>
    chordRows.value.length > 0 && chordRows.value.every((row) => row.locked))

/** Lock or unlock a chord against detection and the copy-down action. */
function toggleRowLock(row, event) {
    setChordKeyLocked(row.chordConfig, event.target.checked)
}

const KEY_TONICS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// 'minor' is an alias of aeolian; offer the friendly name and the common modes.
const keyTypes = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']

const keyOptions = computed(() => {
    const options = []
    for (const tonic of KEY_TONICS) {
        for (const type of keyTypes)
            options.push({ value: `${tonic}|${type}`, text: `${tonic} ${type}` })
    }
    return options
})

function parseKeyValue(value) {
    if (!value)
        return null
    const [tonic, type] = value.split('|')
    return tonic && type ? { tonic, type } : null
}

/** Set (or clear) the key on a single chord, splitting or merging a run. */
function setRowKey(row, value) {
    applyChordKeySettings(row.chordConfig, parseKeyValue(value))
}

/**
 * Apply the row's key to this chord and the following chords, stopping before
 * the first locked chord. The key can be a section key or the project-key
 * fallback (an empty selection clears it back to the project key).
 */
function applyRowKeyToFollowing(row) {
    const rows = chordRows.value
    const start = rows.findIndex((entry) => entry.id === row.id)
    if (start < 0)
        return
    const key = parseKeyValue(row.selectValue)
    applyChordKeySettings(copyDownTargets(rows, start), key)
}

// Suggested key groups from the experimental modulation detector. Nothing is
// applied until the user accepts a suggestion.
const detectedGroups = ref([])

function detectKeyGroups() {
    detectedGroups.value = suggestKeyGroups(globals.project, gridChords.value).map((group) => ({
        ...group,
        selectedKeyName: group.keyName,
    }))
}

function alternativesFor(group) {
    if (group.alternatives.length > 0)
        return group.alternatives
    return group.key ? [{ keyName: group.keyName, key: group.key }] : []
}

function selectedAlternative(group) {
    const alternatives = alternativesFor(group)
    return alternatives.find((alternative) => alternative.keyName === group.selectedKeyName) ?? alternatives[0]
}

/** The close runner-up, named so a close call is self-explanatory. */
function runnerUpFor(group) {
    if (!group.ambiguous || group.alternatives.length < 2)
        return null
    return group.alternatives[1]
}

function chooseAlternative(group, keyName) {
    group.selectedKeyName = keyName
}

function lockedCountFor(group) {
    return group.chords.filter((chord) => isChordKeyLocked(chord)).length
}

function allLockedFor(group) {
    return group.chords.length > 0 && lockedCountFor(group) === group.chords.length
}

// Overwrite the group's unlocked chords with the chosen key. A group that
// reads as the project key clears the chords' keys so they use the fallback.
function applyGroupKey(group) {
    const alternative = selectedAlternative(group)
    if (!alternative || !alternative.key)
        return
    const projectKey = projectKeyName(currentKey.value)
    const unlocked = group.chords.filter((chord) => !isChordKeyLocked(chord))
    if (unlocked.length === 0)
        return
    const key = alternative.keyName === projectKey
        ? null
        : { tonic: alternative.key.tonic, type: alternative.key.type }
    applyChordKeySettings(unlocked, key, 'detected')
}

function applyDetectedGroup(group) {
    applyGroupKey(group)
    detectedGroups.value = detectedGroups.value.filter((entry) => entry !== group)
}

// Overwrite every unlocked chord with its suggested key.
function applyAllDetectedGroups() {
    for (const group of [...detectedGroups.value])
        applyGroupKey(group)
    detectedGroups.value = []
}

const keyIsDeclared = computed(() => !!declaredProjectKey(globals.project))

// The entry shown next to the combo, and a clear explanation of where the key
// came from. An empty project has no detected key yet, so the combo's default
// is labelled as such rather than as "(set)".
const keyDisplayName = computed(() => currentKey.value ? projectKeyName(currentKey.value) : 'C major')

// Describes every combination of declared key, detected key and chord presence.
const keyDescription = computed(() => describeProjectKey(globals.project))

function setProjectKeyFromEvent(eventDetail) {
    const tonic = eventDetail.tonic ? sanitiseNoteToSharp(eventDetail.tonic) : currentKey.value?.tonic
    const type = eventDetail.type ? eventDetail.type : currentKey.value?.type
    applyProjectKeySettings({ tonic, type })
}

/** Set a detected key as the project key and re-rank the scales in it. */
function useAsProjectKey(keySignature) {
    const [tonic, ...typeParts] = keySignature.split(' ')
    applyProjectKeySettings({ tonic, type: typeParts.join(' ') })
}

function keySignaturesViaNotesIsDifferent() {
    return !arraysAreEqual(globals.keySignatureDetection.keyFromChords, globals.keySignatureDetection.keyFromChordNotes)
}

function agreedUponKeySignatures() {
    let intersection = globals.keySignatureDetection.keyFromChordNotes.filter(x => globals.keySignatureDetection.keyFromChords.includes(x));
    const music21 = globals.keySignatureDetection.music21Result
    if (music21 && (music21.result || music21.alt)) {
        const music21KeySignatures = [music21.result, music21.alt]
        intersection = intersection.filter(x => music21KeySignatures.includes(x));
    }
    return intersection
}

/**
 * True when the project has a declared major/minor key that the detection does
 * not list. Modal keys are exempt, because detection cannot see modes.
 */
const declaredKeyDisagrees = computed(() => {
    if (!keyIsDeclared.value || !currentKey.value)
        return false
    if (!['major', 'minor', 'aeolian'].includes(currentKey.value.type))
        return false
    const candidates = agreedUponKeySignatures()
    if (candidates.length === 0)
        return false
    const declared = `${currentKey.value.tonic} ${currentKey.value.type === 'aeolian' ? 'minor' : currentKey.value.type}`
    return !candidates.includes(declared)
})

function useDetectedKey() {
    const [candidate] = agreedUponKeySignatures()
    if (candidate)
        useAsProjectKey(candidate)
}

const noKeySignatureBecauseNoFavourites = computed({
    get: () => globals.keySignatureDetection.fromFavouritesOnly && agreedUponKeySignatures() == 0
})

const noKeySignatureBecauseNoChords = computed({
    get: () => !globals.isProjectLoaded
})

</script>

<template>

    <p>
        <span class="mr-2">Project Key:</span>
        <ComboScale :tonic="sanitiseNoteToSharp(currentKey?.tonic ?? 'C')"
            :scale-type="currentKey?.type ?? 'major'" :scale-types="keyTypes"
            @set-scale="setProjectKeyFromEvent($event)" />
        <span class="ml-2 ui small text grey">
            <code>{{ keyDisplayName }}</code>
            <strong class="key-source-badge" :title="keyDescription.title">{{ keyDescription.label }}</strong>
        </span>
    </p>

    <p class="ui small text grey mb-2">
        The project key is chosen once per song. Setting it re-ranks every chord scale
        automatically; the Solo in key and colour controls sit above the scale grid.
    </p>

    <p v-if="declaredKeyDisagrees" class="ui small text-red-500!">
        The declared key <code>{{ projectKeyName(currentKey) }}</code> is not among the detected keys.
        <a href="#" @click.prevent="useDetectedKey()">Use the detected key</a>.
    </p>

    <p>
        <span class="mr-2">Possible Key Signatures:</span>
        <span v-if="noKeySignatureBecauseNoChords"><i>No Chords in project</i></span>
        <span v-else-if="noKeySignatureBecauseNoFavourites"><i>No favourites Chords</i>
                <span class="ui small text grey ml-4">Tip: click the heart symbol in the table above</span></span>
        <code v-else>
            <span v-for="(keySignature, i) in agreedUponKeySignatures()" :key="i" class="mr-3">
                <a href="#" @click.prevent="useAsProjectKey(keySignature)"
                    title="Set as the project key and re-rank the scales">{{ keySignature }}</a>
            </span>
        </code>
    </p>

    <!-- Key Groups: per-chord section keys, locks and the experimental
         detector. At the top level so it is always visible with the rest of
         Key Detection. -->
    <div v-if="keyGroups.length > 0" class="key-groups-block">
        <h4 class="key-groups-heading">
            Key Groups
            <span class="key-groups-count">({{ keyGroupsSummary }})</span>
        </h4>
        <p class="ui small text grey mb-2">
            Each chord can carry its own section key. Chords that share an effective
            key form a group; chords with no key of their own follow the project key.
            Changing a chord's key re-ranks its group's scales:
            {{ keyGroups.map((group) => projectKeyName(group.key) + ' ×' + group.chords.length).join(' · ') }}
        </p>
        <p class="mb-2">
            <button class="ui mini button" @click="detectKeyGroups()"
                title="Analyse the unlocked chords and suggest where the key changes (experimental)">Detect key groups</button>
            <span class="ui small text grey ml-2">
                Locked chords are boundaries. Apply all overwrites every unlocked chord's key.
            </span>
        </p>
        <div v-if="detectedGroups.length > 0" class="detected-groups mb-2">
            <p class="ui small text grey mb-1">
                Detection scores how well each run fits a key. Relative keys such as A minor
                and C major share the same notes, so close calls are normal. Pick the reading
                you hear; Apply writes it to every unlocked chord.
            </p>
            <div v-for="(group, i) in detectedGroups" :key="i" class="detected-group-row">
                <span class="detected-chords" :title="group.chords.map((chord) => chord.chord).join(', ')">
                    <template v-for="(chord, ci) in group.chords" :key="ci"><i
                        v-if="isChordKeyLocked(chord)" class="lock icon detected-locked"
                        title="Locked: Apply will skip this chord"></i>{{ chord.chord }}<span
                        v-if="ci < group.chords.length - 1">, </span></template>
                </span>
                <span class="detected-key-label">Key:</span>
                <select v-model="group.selectedKeyName">
                    <option v-for="alternative in alternativesFor(group)" :key="alternative.keyName"
                        :value="alternative.keyName">{{ alternative.keyName }}</option>
                </select>
                <span v-if="runnerUpFor(group)" class="detected-close-call">
                    close call —
                    <a href="#" @click.prevent="chooseAlternative(group, runnerUpFor(group).keyName)"
                        :title="'The top keys fit the chords equally closely. Click to use ' + runnerUpFor(group).keyName + ' instead.'">{{ runnerUpFor(group).keyName }} also fits</a>
                </span>
                <span v-if="lockedCountFor(group) > 0 && !allLockedFor(group)" class="ui small text grey"
                    title="Locked chords are left alone when the suggestion is applied">
                    {{ lockedCountFor(group) }} locked skipped
                </span>
                <button v-if="!allLockedFor(group)" class="ui mini basic button" @click="applyDetectedGroup(group)">Apply</button>
                <span v-else class="ui small text grey">all locked</span>
            </div>
            <button class="ui mini button" @click="applyAllDetectedGroups()">Apply all changes</button>
        </div>
        <div v-else-if="allChordsLocked" class="ui small text grey mb-2">
            Every chord is locked, so detection has nothing to analyse.
        </div>
        <div class="chord-key-list">
            <div v-for="row in chordRows" :key="row.id" class="chord-key-row">
                <label class="chord-key-lock"
                    :title="row.locked ? 'Locked: detection and copy-down will not change this chord' : 'Lock this chord against detection and copy-down'">
                    <input type="checkbox" :checked="row.locked" @change="toggleRowLock(row, $event)">
                    <i :class="row.locked ? 'lock icon' : 'unlock icon'"></i>
                </label>
                <code class="chord-key-chord">{{ row.chord }}</code>
                <select class="chord-key-select" :value="row.selectValue"
                    :title="row.hasOwnKey ? 'This chord has its own section key' : 'This chord follows the project key'"
                    @change="setRowKey(row, $event.target.value)">
                    <option value="">Project key ({{ projectKeyName(currentKey) }})</option>
                    <option v-for="option in keyOptions" :key="option.value" :value="option.value">{{ option.text }}</option>
                </select>
                <button class="ui mini compact button" :disabled="row.locked"
                    title="Apply this chord's key to the following chords, stopping before a locked chord"
                    @click="applyRowKeyToFollowing(row)">↓ all</button>
            </div>
        </div>
    </div>

    <div class="ui fluid styled accordion" style="background-color: burlywood;">

        <div class="title">
            <i class="dropdown icon"></i>
            Details
        </div>
        <div class="content">

            <!-- debug -->
            <!-- <code>{{ globals.keySignatureDetection }}</code> -->

            <span class="chords-that-fit-label">Chords Analysed: </span>
            <span v-for="(chord, i) in globals.keySignatureDetection.allChordsInProject" :key="i">
                <a href="#" @click.prevent="setChordFromSymbol(chord)">{{ chord }}</a> &nbsp;
            </span>
            <br>
            <span class="chords-that-fit-label">Chord Notes Analysed: </span>
            <span v-for="(chord, i) in globals.keySignatureDetection.allChordNotesInProject" :key="i">
                <code class="ml-2"> {{ chord }} </code>
            </span>
            <span v-if="globals.keySignatureDetection.allChordNotesInProject.length == 12" class="ml-1"><span
                    class="ml-1 text-red-500!">(Every Note!)</span>🃏</span>
            <br>

            <span class="chords-that-fit-label">Key Signatures (chords): </span>
            <span v-for="(keySignature, i) in globals.keySignatureDetection.keyFromChords" :key="i">
                <a href="#" @click.prevent="useAsProjectKey(keySignature)">{{ keySignature }}</a> &nbsp;
            </span>
            <div v-if="keySignaturesViaNotesIsDifferent()" class="inline-blockZZZ">
                <span class="chords-that-fit-label">Key Signatures (notes): </span>
                <span v-for="(keySignature, i) in globals.keySignatureDetection.keyFromChordNotes" :key="i">
                    <a href="#" @click.prevent="useAsProjectKey(keySignature)">{{ keySignature }}</a> &nbsp;
                </span>
            </div>


            <!-- Music21 -->
            <br v-if="globals.keySignatureDetection.music21Result">
            <span v-if="globals.keySignatureDetection.music21Result" class="chords-that-fit-label">Key Signatures
                (notes, Music21): </span>
            <div v-if="globals.keySignatureDetection.music21Result" class="inline-block">
                <span v-if="globals.keySignatureDetection.music21Result.status == 'success'">
                    <a href="#"
                        @click.prevent="useAsProjectKey(globals.keySignatureDetection.music21Result.result)">{{
                                globals.keySignatureDetection.music21Result.result
                        }}</a> &nbsp;
                    <a href="#"
                        @click.prevent="useAsProjectKey(globals.keySignatureDetection.music21Result.alt)">{{
                                globals.keySignatureDetection.music21Result.alt
                        }}</a> &nbsp;
                </span>
                <span v-else class="bg-yellow-500!">
                    {{ globals.keySignatureDetection.music21Result.status }}
                    {{ globals.keySignatureDetection.music21Result.result }}
                </span>
            </div>

        </div>




        <div class="title">
            <i class="dropdown icon"></i>
            Options
        </div>
        <div class="content">
            <div class="row">
                <div class="ui checkbox">
                    <input type="checkbox" @change="keyDetection()" id="cb-from-favourites" class="hidden"
                        v-model="globals.keySignatureDetection.fromFavouritesOnly">
                    <label for="cb-from-favourites">Detect Key Signature from Favourites Only</label>
                </div>
            </div>

            <div class="row">
                <div class="ui checkbox">
                    <input type="checkbox" @change="keyDetection()" id="cb-entire-project" class="hidden"
                        v-model="globals.keySignatureDetection.fromEntireProject">
                    <label for="cb-entire-project">Include unallocated chords</label>
                </div>
            </div>

            <div class="row">
                <div class="ui checkbox">
                    <input type="checkbox" @change="keyDetection()" id="cb-call-music21" class="hidden"
                        v-model="globals.keySignatureDetection.callMusic21Server">
                    <label for="cb-call-music21">Call Music21 server (localhost:8082)</label>
                </div>
                <div class="ui small text grey">
                    Optional. Requires the Python music21 server to be running locally; otherwise it is ignored.
                </div>
            </div>
        </div>
    </div>

    <!-- TIP: use class 'hidden' on input and attribute 'for' on label to get cursor to show when hovering over checkbox labels -->

</template>

<style scoped>
.chords-that-fit-label {
    font-size: small;
}

.key-source-badge {
    margin-left: 0.5em;
    color: #6b5a45;
}

.key-groups-block {
    margin-top: 0.6em;
    margin-bottom: 0.6em;
    border-top: 1px solid #d9c9b0;
    padding-top: 0.6em;
}

.key-groups-heading {
    margin: 0 0 0.3em;
    font-size: 1.05rem;
}

.key-groups-count {
    font-size: 0.8rem;
    font-weight: normal;
    color: #6b5a45;
}

.chord-key-lock {
    display: inline-flex;
    align-items: center;
    gap: 0.15em;
    cursor: pointer;
    color: #6b5a45;
}

.chord-key-lock input {
    margin: 0;
}

.detected-groups {
    border-left: 3px solid #b08968;
    padding-left: 0.6em;
}

.detected-group-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.1em 0;
}

.detected-chords {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: small;
    color: #6b5a45;
}

.detected-locked {
    margin-right: 0.15em;
    color: #8a6d1a;
}

.detected-key-label {
    font-size: small;
    color: #6b5a45;
}

.detected-close-call {
    font-size: small;
    color: #8a6d1a;
    white-space: nowrap;
}

.chord-key-list {
    max-height: 18rem;
    overflow-y: auto;
    border-top: 1px solid #d9c9b0;
    padding-top: 0.3em;
}

.chord-key-row {
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.1em 0;
}

.chord-key-chord {
    width: 7rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.chord-key-select {
    flex: 1;
    min-width: 8rem;
    max-width: 16rem;
}
</style>
