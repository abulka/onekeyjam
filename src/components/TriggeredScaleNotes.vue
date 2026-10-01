<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '../../src/lib/globals.js'
import * as Tonal from '@tonaljs/tonal';

function isPlayingNow(note) {
    const playingNow = globals.currentJamNote.mapped
    const playingSansOctave = Tonal.Note.get(playingNow).pc;
    return playingSansOctave == note
}

</script>

<template>
    <span v-if="globals.scaleFilteringEnabled && globals.currentScaleNotes && globals.currentScaleNotes.length > 0"
        v-for="note in globals.currentScaleNotes" class="ui large text pr-2" :class="{ 'blue': isPlayingNow(note) }">
        <code> {{ note }} </code>
    </span>
    <span v-else class="ui large text pr-2"><code></code></span>

</template>

<style scoped>
</style>
