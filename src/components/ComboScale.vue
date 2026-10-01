<script setup>
import { computed } from 'vue'
import * as Tonal from "@tonaljs/tonal";

/*
There are two combos here, the root and type.
    'tonic', - 'root' combo initial value
    'scale-type', - 'type' combo initial value
    'scale-types' - array of scale types to choose from

P.S. There is no need to supply an array of possible tonic types, 
     as they are constant - see tonicOptions below
*/
const props = defineProps(['tonic', 'scale-type', 'scale-types'])
const emit = defineEmits(['set-scale'])

// console.log('props.tonic', props.tonic)
// console.log('props.scaleType', props.scaleType)
// console.log('props.scaleTypes', props.scaleTypes)

const tonicOptions = [  // value is always supposed to be a sharp (via sanitiseNoteToSharp() calls), so that combo matching works
    { text: 'C', value: 'C' },
    { text: 'C#/Db', value: 'C#' },
    { text: 'D', value: 'D' },
    { text: 'D#/Eb', value: 'D#' },
    { text: 'E', value: 'E' },
    { text: 'F', value: 'F' },
    { text: 'F#/Gb', value: 'F#' },
    { text: 'G', value: 'G' },
    { text: 'G#/Ab', value: 'G#' },
    { text: 'A', value: 'A' },
    { text: 'A#/Bb', value: 'A#' },
    { text: 'B', value: 'B' },
]

function prepareScaleTypes() {
    // Converts array property 'scale-types' to an array of objects for the combo box
    // If property 'scale-types' is not set, return array of all possible Tonic scale types
    let result = []
    const fromArray = props.scaleTypes ? props.scaleTypes : Tonal.ScaleType.names().sort()
    fromArray.forEach(scaleName => {
        result.push({ 'text': scaleName, 'value': scaleName })
    })
    // console.log('fromArray', fromArray, result)
    return result
}

// ┌─┐┌─┐┌─┐┬  ┌─┐  ┬─┐┌─┐┌─┐┌┬┐  ┌─┐┌─┐┌┬┐┌┐ ┌─┐
// └─┐│  ├─┤│  ├┤   ├┬┘│ ││ │ │   │  │ ││││├┴┐│ │
// └─┘└─┘┴ ┴┴─┘└─┘  ┴└─└─┘└─┘ ┴   └─┘└─┘┴ ┴└─┘└─┘
const selectedScaleTonic = computed({
    get: () => props.tonic ? props.tonic : '',
    set: (v) => { setScale(v, undefined); }
})

// ┌─┐┌─┐┌─┐┬  ┌─┐  ┌┬┐┬ ┬┌─┐┌─┐  ┌─┐┌─┐┌┬┐┌┐ ┌─┐
// └─┐│  ├─┤│  ├┤    │ └┬┘├─┘├┤   │  │ ││││├┴┐│ │
// └─┘└─┘┴ ┴┴─┘└─┘   ┴  ┴ ┴  └─┘  └─┘└─┘┴ ┴└─┘└─┘
const scaleOptions = computed({
    get: () => prepareScaleTypes(),
})
const selectedScale = computed({
    get: () => props.scaleType ? props.scaleType : '',
    set: (v) => { setScale(undefined, v); }
})

// ╔═╗┬  ┬┌─┐┌┐┌┌┬┐
// ║╣ └┐┌┘├┤ │││ │ 
// ╚═╝ └┘ └─┘┘└┘ ┴ 
function setScale(tonic, type) {
    emit('set-scale', { tonic, type })
}

function isNotesOfChord() {
    return props.scaleType == 'notes of chord'
}

</script>

<template>
    <div class="inline-block" v-if="isNotesOfChord()">
        <select :disabled="true"><option>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</option></select>
        <select :disabled="true"><option>Notes of Chord</option></select>
    </div>
    <div class="inline-block" v-else>
        <select v-model="selectedScaleTonic">
            <option v-for="option in tonicOptions" v-bind:value="option.value">
                {{ option.text }}
            </option>
        </select>
        <select v-model="selectedScale">
            <option v-for="option in scaleOptions" v-bind:value="option.value">
                {{ option.text }}
            </option>
        </select>
    </div>
</template>

<style scoped>
</style>
