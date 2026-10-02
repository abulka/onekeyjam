# Adapted from vue2 https://github.com/MicuEmerson/vue-piano/blob/main/src/components/PianoKeyboard.vue
# Demo https://micuemerson.github.io/vue-piano/

<script setup>
import { ref } from "vue";
import PianoKeyboard from './PianoKeyboard.vue'
import { globals } from '../../src/lib/globals.js'
import { noteObjectToNextWhiteNoteObject } from '../../src/lib/note-tools.js'

const whiteNoteColor = "#1eb7eb"
const blackNoteColor = "#1eb7eb" // "#f9bb2d"
const showKeys = ref(false)
const showNotes = ref(false)
const sustain = false
const startOctave = ref(3)
const endOctave = ref(4)
const allKeys = ['`', `1`, '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',
    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\',
    'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';',
    'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.']
const selectedNotes = ref([])
const indianNotes = false
const noteConfig = {
    scale: "C",
    middleOctave: 4,
    lang: "bn"
}
const whiteNoteMappings = ref({});
const whiteNoteScaleMappingStartNote = ref({}); // note object e.g. { letter: 'C', octave: 4 }

function useMappingDefault() {
    whiteNoteMappings.value = {
        'C3': 'CM7',
        'D3': 'Cm11',
        'E3': 'Bm7b5',
        'F3': 'Am7',
        'G3': 'C',
        'A3': 'E',
        'B3': 'G',
        'C4': 'B',
        'D4': 'C',
        'E4': 'C#',
        'F4': 'D',
        'G4': 'D#',
        'A4': 'A',
        'B4': 'B',
        'C5': 'C#',
        'A5': 'D',
        'B5': 'F',
        'C6': 'G',        
    }
    whiteNoteScaleMappingStartNote.value = { letter: 'G', octave: 3 }
}

function useMapping1() {
    whiteNoteMappings.value = {
        'C3': 'Cmin7',
        'D3': 'D',
        'E3': 'E',
        'F3': 'F',
        'G3': 'G',
        'A3': 'A',
        'B3': 'B',
        'C4': 'C',
        'D4': 'D',
        'E4': 'E',
        'F4': 'F',
        'G4': 'G',
        'A4': 'A',
        'B4': 'B',
        'C5': 'C#',
        'A5': 'A',
        'B5': 'B',
        'C6': 'C',        
    }
    whiteNoteScaleMappingStartNote.value = { letter: 'D', octave: 3 }
}

function useMappingGlobals() {
    whiteNoteMappings.value = {}

    for (const [note, data] of Object.entries(globals.chordTriggerMap)) {
        whiteNoteMappings.value[note] = data.chord
    }
    for (const [note, data] of Object.entries(globals.scaleTriggerMap)) {
        if (!whiteNoteMappings.value[note]) {
            whiteNoteMappings.value[note] = data
        }
    }
    calcWhiteNoteScaleMappingStartNote()
}
function calcWhiteNoteScaleMappingStartNote() {
    if (Object.keys(globals.scaleTriggerMap).length === 0) {
        whiteNoteScaleMappingStartNote.value = { letter: 'C', octave: 0 } // set to very low to be invisible
        return
    }

    // get last note in chordTriggerMap
    const notes = Object.keys(globals.chordTriggerMap)
    const note = notes[notes.length - 1]
    // calculate the next white piano note after the last chordTriggerMap note
    const letter = note.slice(0, -1)
    const octave = note.slice(-1)
    const nextNote = noteObjectToNextWhiteNoteObject({ letter, octave })
    whiteNoteScaleMappingStartNote.value = nextNote
}

// useMappingDefault()
useMappingGlobals()

</script>

<template>
    <section class="piano-container mb-14">
        <PianoKeyboard :showKeys=showKeys :showNotes=showNotes :sustain="sustain" :whiteNoteColor="whiteNoteColor"
            :blackNoteColor="blackNoteColor" :startOctave="startOctave" :endOctave=endOctave :allKeys="allKeys"
            :indianNotes="indianNotes" :noteConfig="noteConfig" :selectedNotes=selectedNotes 
            :whiteNoteMappings=whiteNoteMappings 
            :whiteNoteScaleMappingStartNote=whiteNoteScaleMappingStartNote
            />
    </section>
    <button @click="showKeys = !showKeys">Toggle Show Keys</button>
    <button @click="showNotes = !showNotes">Toggle Show Notes</button>
    <button @click="endOctave = endOctave + 1">Add Octave</button>
    <button @click="endOctave = endOctave - 1">Remove Octave</button>
    <button @click="startOctave = startOctave + 1">startOctave++</button>
    <button @click="startOctave = startOctave - 1">startOctave--</button>
    {{ showKeys }}
    {{ showNotes }}
    {{ endOctave }}
    startOctave is {{ startOctave }}
    <br>
    <button @click="selectedNotes = ['C2', 'E2', 'G2']">c maj chord</button>
    <button @click="selectedNotes = []">clear chord</button>
    <br>
    <br>
    <button @click="useMapping1()">change scale mapping 1</button>
    <button @click="useMappingDefault()">change scale mapping to default demo</button>
    <button @click="useMappingGlobals()">change scale mapping to actual globals</button>
    <br>
    <br>
</template>

<style>

/* #app {
    font-family: Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    display: flex;
    padding: 5%;
    justify-content: space-between;
    flex-direction: column;
    height: inherit;
} */

/* body,
html {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
} */

.piano-container {
    margin-left: 8%;
    margin-right: 8%;
    /* height: 30%; */
    height: 15em;
}

.config-container {
    text-align: left;
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    height: 40%;
    width: 70%;
    padding-left: 6%;
}

.config-elem {
    display: flex;
    justify-content: flex-start;
}

.config-elem-cell {
    margin-right: 5%;
}
</style>
