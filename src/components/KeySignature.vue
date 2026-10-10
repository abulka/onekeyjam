<script setup>
import { computed, ref } from 'vue'
import { globals } from '../../src/lib/globals.js'
import { keyDetection } from '../../src/lib/keyDetection';
import { arraysAreEqual } from "../../src/lib/array-tools"
import { declaredProjectKey, projectKeyName, describeProjectKey, keyGroupsForProject } from '../../src/lib/projectKey.js'
import { applyProjectKeySettings, applyChordKeySettings } from '../../src/lib/projectScaleSettings.js'
import { sanitiseNoteToSharp } from '../../src/lib/note-tools.js'
import { setChordFromSymbol } from '../../src/lib/chordPicker.js'
import { suggestKeyGroups } from '../../src/lib/keyGroupDetection.js'
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

// One editable row per grid chord, in trigger order. The select holds the
// chord's own key when it has one, or empty for the project-key fallback.
const chordRows = computed(() => {
    void globals.project
    return gridChords.value.map((chordConfig) => ({
        id: chordConfig.id,
        chordConfig,
        chord: chordConfig.chord,
        hasOwnKey: !!chordConfig.key,
        selectValue: chordConfig.key
            ? `${sanitiseNoteToSharp(chordConfig.key.tonic)}|${chordConfig.key.type}`
            : '',
    }))
})

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
 * Apply the row's key to this chord and the following chords up to the next
 * chord that already has its own key, so a run can be assigned in one step.
 */
function applyRowKeyToFollowing(row) {
    const rows = chordRows.value
    const start = rows.findIndex((entry) => entry.id === row.id)
    if (start < 0)
        return
    const key = parseKeyValue(row.selectValue)
    const list = []
    for (let i = start; i < rows.length; i++) {
        if (i > start && rows[i].hasOwnKey)
            break
        list.push(rows[i].chordConfig)
    }
    applyChordKeySettings(list, key)
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

function applyDetectedGroup(group) {
    const alternative = selectedAlternative(group)
    if (alternative && alternative.key)
        applyChordKeySettings(group.chords, { tonic: alternative.key.tonic, type: alternative.key.type }, 'detected')
    detectedGroups.value = detectedGroups.value.filter((entry) => entry !== group)
}

// Apply every suggestion whose chosen key differs from the project key,
// leaving a project-key reading as the fallback.
function applyAllDetectedGroups() {
    const projectKey = projectKeyName(currentKey.value)
    for (const group of [...detectedGroups.value]) {
        const alternative = selectedAlternative(group)
        if (alternative && alternative.key && alternative.keyName !== projectKey)
            applyChordKeySettings(group.chords, { tonic: alternative.key.tonic, type: alternative.key.type }, 'detected')
    }
    detectedGroups.value = []
}

const hasDetectedChanges = computed(() => {
    const projectKey = projectKeyName(currentKey.value)
    return detectedGroups.value.some((group) => {
        const alternative = selectedAlternative(group)
        return alternative && alternative.keyName !== projectKey
    })
})

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

    <div v-if="keyGroups.length > 0" class="ui fluid styled accordion" style="background-color: burlywood;">
        <div class="title">
            <i class="dropdown icon"></i>
            Key Groups ({{ keyGroups.length }})
        </div>
        <div class="content">
            <p class="ui small text grey mb-2">
                Each chord can carry its own section key. Chords that share an effective
                key form a group; chords with no key of their own follow the project key.
                Changing a chord's key re-ranks its group's scales:
                {{ keyGroups.map((group) => projectKeyName(group.key) + ' ×' + group.chords.length).join(' · ') }}
            </p>
            <p class="mb-2">
                <button class="ui mini button" @click="detectKeyGroups()"
                    title="Suggest key groups by analysing the arranged chords (experimental)">Detect key groups</button>
                <span v-if="detectedGroups.length === 0" class="ui small text grey ml-2">
                    Analyses runs of chords, anchored by any keys already set, and suggests where the key changes.
                </span>
            </p>
            <div v-if="detectedGroups.length > 0" class="detected-groups mb-2">
                <div v-for="(group, i) in detectedGroups" :key="i" class="detected-group-row">
                    <span class="detected-chords" :title="group.chords.map((chord) => chord.chord).join(', ')">
                        {{ group.chords.map((chord) => chord.chord).join(', ') }}
                    </span>
                    <select v-model="group.selectedKeyName">
                        <option v-for="alternative in alternativesFor(group)" :key="alternative.keyName"
                            :value="alternative.keyName">{{ alternative.keyName }}</option>
                    </select>
                    <span v-if="group.ambiguous" class="ui small text grey"
                        title="The top keys fit the chords equally well; pick the reading you hear">ambiguous</span>
                    <button v-if="selectedAlternative(group)?.keyName !== projectKeyName(currentKey)"
                        class="ui mini basic button" @click="applyDetectedGroup(group)">Apply</button>
                    <span v-else class="ui small text grey">project key</span>
                </div>
                <button v-if="hasDetectedChanges" class="ui mini button" @click="applyAllDetectedGroups()">Apply all changes</button>
            </div>
            <div class="chord-key-list">
                <div v-for="row in chordRows" :key="row.id" class="chord-key-row">
                    <code class="chord-key-chord">{{ row.chord }}</code>
                    <select class="chord-key-select" :value="row.selectValue"
                        :title="row.hasOwnKey ? 'This chord has its own section key' : 'This chord follows the project key'"
                        @change="setRowKey(row, $event.target.value)">
                        <option value="">Project key ({{ projectKeyName(currentKey) }})</option>
                        <option v-for="option in keyOptions" :key="option.value" :value="option.value">{{ option.text }}</option>
                    </select>
                    <button class="ui mini compact button" title="Apply this chord's key to the following chords, up to the next chord with its own key"
                        @click="applyRowKeyToFollowing(row)">↓ all</button>
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
