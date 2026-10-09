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

// Runs of grid chords that share an effective key. A run with no explicit keys
// follows the project key; assigning a key turns the whole run into a group.
const keyGroups = computed(() => {
    void globals.project // recompute when the project changes
    return keyGroupsForProject(globals.project, gridChords.value).map((group) => ({
        ...group,
        chordNames: group.chords.map((chord) => chord.chord).join(', '),
        hasOwnKeys: group.chords.some((chord) => chord.key),
    }))
})

function setGroupKey(group, eventDetail) {
    const tonic = eventDetail.tonic ? sanitiseNoteToSharp(eventDetail.tonic) : group.key?.tonic
    const type = eventDetail.type ? eventDetail.type : group.key?.type
    if (tonic && type)
        applyChordKeySettings(group.chords, { tonic, type })
}

function clearGroupKey(group) {
    applyChordKeySettings(group.chords, null)
}

// Suggested key groups from the experimental modulation detector. Nothing is
// applied until the user accepts a suggestion.
const detectedGroups = ref([])

function detectKeyGroups() {
    detectedGroups.value = suggestKeyGroups(globals.project, gridChords.value)
}

function applyDetectedGroup(group) {
    if (group.key)
        applyChordKeySettings(group.chords, { tonic: group.key.tonic, type: group.key.type }, 'detected')
}

// Apply every suggestion whose key differs from the project key, leaving the
// project-key run as the fallback.
function applyAllDetectedGroups() {
    for (const group of detectedGroups.value) {
        if (group.key && group.keyName !== projectKeyName(currentKey.value))
            applyDetectedGroup(group)
    }
    detectedGroups.value = []
}

const keyIsDeclared = computed(() => !!declaredProjectKey(globals.project))

// The entry shown next to the combo, and a clear explanation of where the key
// came from. An empty project has no detected key yet, so the combo's default
// is labelled as such rather than as "(set)".
const keyDisplayName = computed(() => currentKey.value ? projectKeyName(currentKey.value) : 'C major')

// Describes every combination of declared key, detected key and chord presence.
const keyDescription = computed(() => describeProjectKey(globals.project))

// 'minor' is an alias of aeolian; offer the friendly name and the common modes.
const keyTypes = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']

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
                Grid chords that share a key form a key signature group. Chords with no
                key of their own follow the project key and are shown in italics.
                Changing a group's key re-ranks only that group's scales.
            </p>
            <p class="mb-2">
                <button class="ui mini button" @click="detectKeyGroups()"
                    title="Suggest key groups by analysing the arranged chords (experimental)">Detect key groups</button>
                <span v-if="detectedGroups.length === 0" class="ui small text grey ml-2">
                    Analyses runs of chords and suggests where the key changes.
                </span>
            </p>
            <div v-if="detectedGroups.length > 0" class="detected-groups mb-2">
                <div v-for="(group, i) in detectedGroups" :key="i" class="detected-group-row">
                    <code>{{ group.keyName || '(uncertain)' }}</code>
                    <span class="detected-chords">{{ group.chords.map((chord) => chord.chord).join(', ') }}</span>
                    <button v-if="group.key && group.keyName !== projectKeyName(currentKey)"
                        class="ui mini basic button" @click="applyDetectedGroup(group)">Apply</button>
                    <span v-else-if="group.key" class="ui small text grey">project key</span>
                </div>
                <button class="ui mini button" @click="applyAllDetectedGroups()">Apply all changes</button>
            </div>
            <div v-for="(group, i) in keyGroups" :key="i" class="key-group-row">
                <span class="key-group-combo">
                    <ComboScale :tonic="sanitiseNoteToSharp(group.key?.tonic ?? 'C')"
                        :scale-type="group.key?.type ?? 'major'" :scale-types="keyTypes"
                        @set-scale="setGroupKey(group, $event)" />
                </span>
                <span class="key-group-chords" :title="group.chordNames">
                    <code>{{ group.chordNames || '(no chords)' }}</code>
                </span>
                <span v-if="group.hasOwnKeys" class="key-group-actions">
                    <a href="#" title="Remove the key from this group so it follows the project key"
                        @click.prevent="clearGroupKey(group)">follow project key</a>
                </span>
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

.key-group-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.15em 0;
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

.key-group-chords {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.key-group-actions a {
    font-size: small;
    white-space: nowrap;
}
</style>
