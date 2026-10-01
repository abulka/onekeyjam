<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import * as Tonal from "@tonaljs/tonal";
import { globals } from '/src/lib/globals.js'
import { detectChordsBeingPlayed } from "../../src/lib/detectChordsBeingPlayed";
import { stringify } from '../../src/lib/prettyjson.js'
import ButtonAudition from './ButtonAudition.vue'

const props = defineProps([
    'chord-picker-chord-name',
    'audition-info',  // complex object
])
const emit = defineEmits(['reset-to-default-notes'])


const detectedChordNotes = computed({
    get: () => globals.currentChordBeingJammed.chordNotes.join(' '),
    set: (v) => {
        // console.log('detectedChordNotes set', v);
        let newNotes = v.split(' ')
        newNotes = newNotes.filter(n => {
            const noteObj = Tonal.Note.get(n)
            return !noteObj.empty && noteObj.oct && (noteObj.oct >= 0 && noteObj.oct <= 6)
        })
        newNotes = newNotes.map(n => Tonal.Note.get(n).name)  // convert to uppercase

        // set and also rebuild the buttons in add detected chord area
        detectChordsBeingPlayed(newNotes)  // rather than globals.currentChordBeingJammed.chordNotes = newNotes
    }
})

const detectedBassNote = computed({
    get: () => globals.currentChordBeingJammed.bass,
    set: (v) => {
        let newNote = v.split(' ')[0]
        // console.log('detectedBassNote', newNote)
        let noteObj = Tonal.Note.get(newNote)
        if (!noteObj.empty) {
            // console.log(newNote, 'OK, noteObj.pc=', noteObj.pc)
            globals.currentChordBeingJammed.bass = Tonal.Note.get(noteObj.pc).name  // remove oct and convert to uppercase
        }
        else {
            // console.log('detectedBassNote', newNote, 'BAD')
            globals.currentChordBeingJammed.bass = ''
        }
        // TODO should emit an event to update the bass combo box
    }
})

function resetToDefaultChordPickerChord() {
    // set Notes to the chord in the chord picker combo box
    emit('reset-to-default-notes')
}

const debug = computed({
    get: () => false
})

</script>

<template>
    <!-- had to add a :key to trigger help re-rendering input fields e.g. when
         detectedBassNote is set in the computed property - though its not perfect
         cos if the underlying globals.currentChordBeingJammed.bass hasn't
         changed the re-render will not happen -->

    <div class="row mb-4">
        <p>Edit notes and hit ENTER to update the chord picker above.</p>
        <span>Chord Notes</span>
        <input type="text" v-model.lazy="detectedChordNotes" :key="detectedChordNotes" placeholder="notes e.g. C3 E3 G3" class="ml-1 w-60" />
        <span class="ml-2">Bass</span>
        <input type="text" v-model.lazy="detectedBassNote" :key="detectedBassNote" placeholder="note e.g. C"
            class="ml-1 w-10" />

        <!-- arguably this should clear the chord picker too -->
        <button @click="globals.clearCurrentChordBeingJammed()" class="ui tiny button !ml-6">Clear</button>

        <ButtonAudition class="!ml-3" :notes="props.auditionInfo.currentChordBeingJammed.notes" :bass="props.auditionInfo.currentChordBeingJammed.bass" />

    </div>
    <div class="row">
        <span class="mr-4">Reset notes to the default voicing of chord picker chord <code class="ml-1">{{ chordPickerChordName }}</code></span>
        <button @click="resetToDefaultChordPickerChord()" class="ui tiny button">Reset</button>
    </div>

    <div class="row" v-if="debug">
        <pre>{{ stringify(globals.currentChordBeingJammed) }}</pre>
    </div>

</template>

<style scoped>
.detectedChord {
    color: green;
    font-size: x-large;
}

.detectedBass {
    color: brown;
    font-size: x-large;
}
</style>
