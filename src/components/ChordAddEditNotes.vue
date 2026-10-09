<script setup>
import { computed } from 'vue'
import * as Tonal from "@tonaljs/tonal";
import { globals } from '@/lib/globals.js'
import { detectChordsBeingPlayed } from "../../src/lib/detectChordsBeingPlayed";
import { stringify } from '../../src/lib/prettyjson.js'
import { bassNoteOctave } from '@/lib/settings.js'
import { describeTriggerChord } from '@/lib/describeTriggerChord.js'
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

// Exact description of what the current trigger key actually sounds, for
// debugging. Reads the live trigger and the play flags so it stays in step.
const currentTrigger = computed(() => {
    void globals.currentChordTriggerNote
    void globals.playChordOnly
    void globals.playBassOnly
    void globals.playChordBass
    void globals.chordTriggerMap
    return describeTriggerChord(globals.currentChordTriggerNote)
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
        <span class="bass-field">
            <input type="text" v-model.lazy="detectedBassNote" :key="detectedBassNote" placeholder="note e.g. C"
                class="ml-1 w-10" />
            <span class="bass-octave" title="The bass octave is fixed at 2"> {{ bassNoteOctave }}</span>
        </span>

        <!-- arguably this should clear the chord picker too -->
        <button @click="globals.clearCurrentChordBeingJammed()" class="ui tiny button ml-6!">Clear</button>

        <ButtonAudition class="ml-3!" :notes="props.auditionInfo.currentChordBeingJammed.notes" :bass="props.auditionInfo.currentChordBeingJammed.bass" />

    </div>
    <div class="row">
        <span class="mr-4">Reset notes to the default voicing of chord picker chord <code class="ml-1">{{ chordPickerChordName }}</code></span>
        <button @click="resetToDefaultChordPickerChord()" class="ui tiny button">Reset</button>
    </div>

    <details class="debug-group" v-if="globals.isProjectLoaded">
        <summary>Debug: notes this trigger plays</summary>
        <div class="trigger-notes">
            <span class="trigger-notes-label">Current trigger</span>
            <template v-if="currentTrigger.found">
                <code class="trigger-chip">{{ currentTrigger.trigger }}</code>
                <code class="trigger-chip">{{ currentTrigger.chord }}</code>
                <span class="trigger-notes-label">stored</span>
                <code v-for="note in currentTrigger.storedNotes" :key="'s-' + note.name"
                    class="trigger-sound trigger-sound-chord">{{ note.name }}
                    <small>{{ note.midi ?? '?' }}</small></code>
                <span class="trigger-notes-label">bass</span>
                <code class="trigger-sound trigger-sound-bass">{{ currentTrigger.bassNote }}
                    <small>{{ currentTrigger.storedBassMidi ?? '?' }}</small></code>
                <span v-if="currentTrigger.skippedBassDuplicate" class="trigger-skip"
                    title="A chord note equal to the bass note is skipped on the chord channel">(bass note skipped on chord channel)</span>
                <span class="trigger-notes-label">plays</span>
                <code v-for="sound in currentTrigger.sounds" :key="sound.midi + '-' + sound.channel"
                    class="trigger-sound" :class="'trigger-sound-' + sound.role">{{ sound.name }}
                    <small>{{ sound.midi }} · ch{{ sound.channel }}</small></code>
                <code v-if="currentTrigger.sounds.length === 0">(nothing)</code>
            </template>
            <template v-else>
                <code class="trigger-chip">{{ currentTrigger.trigger || '(none)' }}</code>
                <span class="trigger-notes-label">no chord on this trigger</span>
            </template>
        </div>
    </details>

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

/* The bass octave is fixed, so show it as a suffix label after the input. */
.bass-field {
    display: inline-flex;
    align-items: center;
}

.bass-octave {
    margin-left: 1px;
    padding: 0 3px;
    font-weight: 700;
    color: #555;
    background: #eee;
    border: 1px solid #ddd;
    border-radius: 3px;
}

.trigger-notes {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35em;
    font-size: 0.85rem;
    color: #4a3d2a;
}

.debug-group {
    margin-top: 0.6em;
}

.debug-group > summary {
    cursor: pointer;
    color: #8a7c66;
    font-size: 0.85rem;
}

.debug-group .trigger-notes {
    margin-top: 0.35em;
}

.trigger-notes-label {
    color: #8a7c66;
}

.trigger-chip {
    padding: 0 4px;
    background: #efe6d6;
    border-radius: 3px;
}

.trigger-skip {
    color: #9a6a2a;
    font-style: italic;
}

.trigger-sound {
    padding: 0 4px;
    border-radius: 3px;
    background: #e8e8e8;
}

.trigger-sound small {
    opacity: 0.7;
}

.trigger-sound-bass {
    background: #d9e6f7;
}

.trigger-sound-chord {
    background: #f7e0d9;
}
</style>
