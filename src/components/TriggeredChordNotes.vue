<script setup>
import { globals } from '../../src/lib/globals.js'
import { samePitchClass } from '../../src/lib/note-tools.js'

function isPlayingNow(note) {
    return samePitchClass(note, globals.currentJamNote.mapped)
}

</script>

<template>
    <template v-if="!globals.currentConfigEmpty() && globals.enableLhChordTriggers">
        <span v-for="note in globals.currentLhNotes()" :key="note" class="ui medium text pr-2"
            :class="isPlayingNow(note) ? 'blue' : 'brown'">
            <code> {{ note }} </code>
        </span>
    </template>
</template>

<style scoped>
</style>
