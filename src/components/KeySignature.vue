<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '../../src/lib/globals.js'
import { keyDetection } from '../../src/lib/keyDetection';
import { arraysAreEqual } from "../../src/lib/array-tools"

const emit = defineEmits(['set-chord-from-symbol', 'set-scale-from-key-signature'])

function setChordFromSymbol(chordSymbol) {
    emit('set-chord-from-symbol', { chordSymbol })
}
function setScaleFromKeySignature(keySignature) {
    emit('set-scale-from-key-signature', { keySignature })
}

function keySignaturesViaNotesIsDifferent() {
    return !arraysAreEqual(globals.keySignatureDetection.keyFromChords, globals.keySignatureDetection.keyFromChordNotes)
}

function agreedUponKeySignatures() {
    let intersection = globals.keySignatureDetection.keyFromChordNotes.filter(x => globals.keySignatureDetection.keyFromChords.includes(x));
    if (globals.keySignatureDetection.music21Result) {
        const music21KeySignatures = [globals.keySignatureDetection.music21Result.result, globals.keySignatureDetection.music21Result.alt]
        intersection = intersection.filter(x => music21KeySignatures.includes(x));
    }
    return intersection
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
        <span class="mr-2">Possible Key Signatures:</span>
        <span v-if="noKeySignatureBecauseNoChords"><i>No Chords in project</i></span>
        <span v-else-if="noKeySignatureBecauseNoFavourites"><i>No favourites Chords</i>
                <span class="ui small text grey ml-4">Tip: click the heart symbol in the table above</span></span>
        <code v-else>
            <span v-for="keySignature in agreedUponKeySignatures()" class="mr-3">
                <a href="#" @click.prevent="setScaleFromKeySignature(keySignature)">{{ keySignature }}</a>
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
            <span v-for="chord in globals.keySignatureDetection.allChordsInProject">
                <a href="#" @click.prevent="setChordFromSymbol(chord)">{{ chord }}</a> &nbsp;
            </span>
            <br>
            <span class="chords-that-fit-label">Chord Notes Analysed: </span>
            <span v-for="chord in globals.keySignatureDetection.allChordNotesInProject">
                <code class="ml-2"> {{ chord }} </code>
            </span>
            <span v-if="globals.keySignatureDetection.allChordNotesInProject.length == 12" class="ml-1"><span
                    class="ml-1 !text-red-500">(Every Note!)</span>🃏</span>
            <br>

            <span class="chords-that-fit-label">Key Signatures (chords): </span>
            <span v-for="keySignature in globals.keySignatureDetection.keyFromChords">
                <a href="#" @click.prevent="setScaleFromKeySignature(keySignature)">{{ keySignature }}</a> &nbsp;
            </span>
            <div v-if="keySignaturesViaNotesIsDifferent()" class="inline-blockZZZ">
                <span class="chords-that-fit-label">Key Signatures (notes): </span>
                <span v-for="keySignature in globals.keySignatureDetection.keyFromChordNotes">
                    <a href="#" @click.prevent="setScaleFromKeySignature(keySignature)">{{ keySignature }}</a> &nbsp;
                </span>
            </div>


            <!-- Music21 -->
            <br v-if="globals.keySignatureDetection.music21Result">
            <span v-if="globals.keySignatureDetection.music21Result" class="chords-that-fit-label">Key Signatures
                (notes, Music21): </span>
            <div v-if="globals.keySignatureDetection.music21Result" class="inline-block">
                <span v-if="globals.keySignatureDetection.music21Result.status == 'success'">
                    <a href="#"
                        @click.prevent="setScaleFromKeySignature(globals.keySignatureDetection.music21Result.result)">{{
                                globals.keySignatureDetection.music21Result.result
                        }}</a> &nbsp;
                    <a href="#"
                        @click.prevent="setScaleFromKeySignature(globals.keySignatureDetection.music21Result.alt)">{{
                                globals.keySignatureDetection.music21Result.alt
                        }}</a> &nbsp;
                </span>
                <span v-else class="!bg-yellow-500">
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
                    <label for="cb-call-music21">Call Music21 Server</label>
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
