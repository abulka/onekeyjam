<script setup>
import { computed } from 'vue'
import { globals } from '../../src/lib/globals.js'
import { keyDetection } from '../../src/lib/keyDetection';
import { arraysAreEqual } from "../../src/lib/array-tools"
import { declaredProjectKey, projectKeyName } from '../../src/lib/projectKey.js'
import { applyProjectKeySettings } from '../../src/lib/projectScaleSettings.js'
import { sanitiseNoteToSharp } from '../../src/lib/note-tools.js'
import { setChordFromSymbol } from '../../src/lib/chordPicker.js'
import ComboScale from './ComboScale.vue'

const currentKey = computed(() => globals.getProjectKey())

const keyIsDeclared = computed(() => !!declaredProjectKey(globals.project))

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
        <span v-if="currentKey" class="ml-2 ui small text grey">
            <code>{{ projectKeyName(currentKey) }}</code>
            <i>{{ keyIsDeclared ? '(set)' : '(detected)' }}</i>
        </span>
    </p>

    <p class="ui small text grey mb-2">
        The project key is chosen once per song. Setting it re-ranks every chord scale
        automatically; the Solo in key and colour controls sit above the scale grid.
    </p>

    <p v-if="declaredKeyDisagrees" class="ui small text-orange!">
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




    <!-- TIP: use class 'hidden' on input and attribute 'for' on label to get cursor to show when hovering over checkbox labels -->

</template>

<style scoped>
.chords-that-fit-label {
    font-size: small;
}
</style>
