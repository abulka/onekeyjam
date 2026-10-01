<script setup>
// @ts-check
import { computed } from 'vue'
import { ref, onMounted, watch } from 'vue'
import * as Tonal from "@tonaljs/tonal";
import { arraysAreEqual } from "../../src/lib/array-tools"
import { globals } from "../../src/lib/globals.js"
import { sanitiseNoteToSharp, createChordSymbol } from "../../src/lib/note-tools.js"
import { setActiveScaleFilterToMatchChord, setActiveScaleFilter } from "../../src/lib/change-scale.js"
import { getRandomArbitary } from "../../src/lib/util.js"
import { auditionNotes } from "../../src/lib/auditionNotes"
import { bassNoteOctave } from "../../src/lib/settings.js";
import { calcAllChordSymbols } from "../../src/lib/calcAllChordSymbols";
import { noteOptions } from "../../src/lib/note-tools";
import { currentChordInfo } from "../../src/lib/currentChordInfo";
import { replaceCurrentScale, setScaleToNotesOfChord } from "../../src/lib/replaceCurrentScale";
import { calcChordInversionNumberAndNewBass } from "../../src/lib/chordInversion";
import { chordSymbolToNotesInversion } from "../../src/lib/chordSymbolToNotes";
import { removeBassSlash } from '../../src/lib/removeBassSlash.js';
import { bassWithOctFromChordNotesWithOct } from "../../src/lib/note-tools"
import { setChordPicker, setChordSmart, setChordFromSymbol } from "../../src/lib/chordPicker";
import ButtonChord from "./ButtonChord.vue"
import ComboScale from "./ComboScale.vue"
import ChordAdd from './ChordAdd.vue'
import KeySignature from './KeySignature.vue';
import CircleOfFifths from './CircleOfFifths.vue';
import CommonChords from './CommonChords.vue';
import ButtonAudition from './ButtonAudition.vue'
import ReallocatePanel from './ReallocatePanel.vue';

// ┌─┐┬ ┬┌─┐┌┐┌┌─┐┌─┐  ┌─┐┌─┐┌─┐┬  ┌─┐  ┌─┐┬┬  ┌─┐┬─┐  ┌─┐┌─┐┌┬┐┌┐ ┌─┐
// │  ├─┤├─┤││││ ┬├┤   └─┐│  ├─┤│  ├┤   ├┤ ││  ├┤ ├┬┘  │  │ ││││├┴┐│ │
// └─┘┴ ┴┴ ┴┘└┘└─┘└─┘  └─┘└─┘┴ ┴┴─┘└─┘  └  ┴┴─┘└─┘┴└─  └─┘└─┘┴ ┴└─┘└─┘

/**
 * @typedef SwitchScaleFilterOptions
 * @type {object}
 * @property {('chord picker'|'current chord config')} chordFrom
 * @property {('top 3'|'all compatible')} numScales
 */

/**
 * Swtch the Scale Picker combo's list of scale types 
 * and set both the combo scale tonic and combo scale type.
 * @param {SwitchScaleFilterOptions} options
 */
function switchScaleFilter(options) {
    const chordObj = (options.chordFrom == 'chord picker') ?
        Tonal.Chord.get(`${globals.chordPicker.currentRoot} ${globals.chordPicker.currentChord}`) :
        Tonal.Chord.get(globals.currentChordName())
    setActiveScaleFilterToMatchChord(chordObj.tonic ?? 'C', chordObj.type, options.numScales)
}

function showAllScales() {
    globals.scaleFiltering.scaleTypesMatchingCurrentChord = undefined
}

// ┌─┐┌─┐┌─┐┬  ┌─┐  ┬ ┬┌┬┐┬┬  ┬┌┬┐┬ ┬
// └─┐│  ├─┤│  ├┤   │ │ │ ││  │ │ └┬┘
// └─┘└─┘┴ ┴┴─┘└─┘  └─┘ ┴ ┴┴─┘┴ ┴  ┴ 

function setScaleFromEvent(eventDetail) {
    const tonic = eventDetail.tonic ? eventDetail.tonic : globals.scaleFiltering.scaleTonic
    const type = eventDetail.type ? eventDetail.type : globals.scaleFiltering.scaleType
    setActiveScaleFilter(tonic, type, [], [], true)  // true means override the current scale
}
function setScaleFromMode(modeTuple) {
    const tonic = modeTuple[0]
    const type = modeTuple[1]
    showAllScales()
    setActiveScaleFilter(tonic, type, [], [], true)  // true means override the current scale
    globals.scaleFiltering.frozen = true
}
function setScaleFromKeySignature(keySignatureString) {
    const tonic = keySignatureString.split(' ')[0]
    const type = keySignatureString.split(' ').splice(1).join(' ')
    showAllScales()
    setActiveScaleFilter(tonic, type, [], [], true)  // true means override the current scale
    globals.scaleFiltering.frozen = true
}

function replaceCurrentScaleDisabled() {
    const newScale = `${globals.scaleFiltering.scaleTonic} ${globals.scaleFiltering.scaleType}`
    return globals.currentConfigEmpty() ||
        globals.currentScaleFilter == 'notesOfChord' ||
        newScale.toLowerCase() == globals.currentProjectScaleName.toLowerCase()
}

</script>

<template>


    <div class="centered row bigbottom">
        👋 Change the currently selected Project scale
    </div>

    <div class="ui aligned grid">
        <div class="left floated left aligned twelve wide column">
            <div class="ui">
                Scale Picker:
                <ComboScale :tonic="sanitiseNoteToSharp(globals.scaleFiltering.scaleTonic)"
                    :scale-type="globals.scaleFiltering.scaleType"
                    :scale-types="globals.scaleFiltering.scaleTypesMatchingCurrentChord"
                    @set-scale="setScaleFromEvent($event)" />
            </div>
        </div>
        <div class="right floated left aligned four wide column">
            <div class="ui">
                <div class="ui toggle checkbox"
                    title="Whether scale picker is frozen or changes dynamically as chords change">
                    <input type="checkbox" v-model="globals.scaleFiltering.frozen">
                    <label>Lock</label>
                </div>
            </div>
        </div>
    </div>
    <br>

    <div class="row">
        <button @click="replaceCurrentScale()" :disabled="replaceCurrentScaleDisabled()"
            class="ui tiny button brown mr-1!" title="Replace current Project Scale">
            Replace</button>
        <span v-if="!globals.currentConfigEmpty() && globals.currentScaleFilter != 'notesOfChord'" class="mr-1"
            :class="{ 'opacity-50': replaceCurrentScaleDisabled() }">
            <code class="mr-1">{{ globals.currentProjectScaleName }}</code> with
            <code
                class="ml-1 font-semibold">{{ globals.scaleFiltering.scaleTonic }} {{ globals.scaleFiltering.scaleType }}</code>
        </span>
    </div>

    <div class="ui fluid styled accordion" style="background-color: burlywood;">

        <div class="title">
            <i class="dropdown icon"></i>
            Related Scales
        </div>
        <div class="content">
            <div class="row bigbottom">
                <span class="chords-that-fit-label">Chords that fit: </span>
                <span v-for="chord in globals.scaleFiltering.chordsThatFitScale" :key="chord">
                    <a href="#" @click.prevent="setChordSmart(chord)">{{ chord }}</a> &nbsp;
                </span>
            </div>

            <div class="row">
                <span class="chords-that-fit-label">Modes of scale: </span>
                <span v-for="mode in globals.scaleFiltering.modesOfScale" :key="mode">
                    <a href="#" @click.prevent="setScaleFromMode(mode)">{{ mode }}</a> &nbsp;
                </span>
            </div>
        </div>


        <div class="title">
            <i class="dropdown icon"></i>
            Scale Picker Options
        </div>
        <div class="content">
            <div class="row bigbottom">
                <!-- using globals.currentChordBeingJammed.chord to get at what's in the chord picker is a bit sneaky -->
                <p>Set Scale Picker choices to match Chord Picker chord <b>{{
                        globals.currentChordBeingJammed.chord
                }}</b>
                    <i>(on the left)</i>:
                </p>

                <button @click="switchScaleFilter({ chordFrom: 'chord picker', numScales: 'top 3' })"
                    class="ui tiny button">Top 3 Scales</button>
                <button @click="switchScaleFilter({ chordFrom: 'chord picker', numScales: 'all compatible' })"
                    class="ui tiny button">All Compatible Scales</button>
                <button @click="showAllScales()" class="ui tiny button">All Possible Scales</button>

            </div>
            <div class="row" v-if="!globals.currentConfigEmpty()">
                <p>Set Scale Picker choices to match current project chord <b>{{ globals.currentChordName()
                }}</b>:</p>

                <button @click="switchScaleFilter({ chordFrom: 'current chord config', numScales: 'top 3' })"
                    class="ui tiny button">Top 3 Scales</button>
                <button @click="switchScaleFilter({ chordFrom: 'current chord config', numScales: 'all compatible' })"
                    class="ui tiny button">All Compatible Scales</button>
                <button @click="showAllScales()" class="ui tiny button">All Possible Scales</button>

            </div>
        </div>


    </div> <!-- end sub sub accordion -->




    <!-- Accordion with Key Signature -->
    <div class="ui fluid styled accordion" style="background-color: burlywood;">

        <div class="title">
            <i class="dropdown icon"></i>
            Key Signature Detection
        </div>
        <div class="content">

            <!-- <div class="ui raised segment" style="background-color: burlywood;" v-if="globals.isProjectLoaded"> -->
            <div class="row">
                <KeySignature @set-chord-from-symbol="setChordFromSymbol($event.chordSymbol)"
                    @set-scale-from-key-signature="setScaleFromKeySignature($event.keySignature)" />
            </div>
            <!-- </div> -->

        </div>

    </div> <!-- end accordion, Key Signature -->

</template>


<style scoped>

/* exact duplicate of chordpicker.vue styles */
.chords-that-fit-label {
  font-size: small;
}

.row.bigbottom {
  margin-bottom: 1.5em;
}

.row.bigtop {
  margin-top: 1.5em;
}

.ui.tabular.menu .active.item {
  background: #e0e1e2;
}
/* end - exact duplicate of chordpicker.vue styles */

</style>
