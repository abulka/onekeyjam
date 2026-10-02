<script setup>
import { globals } from '../../src/lib/globals.js'
import * as Tonal from '@tonaljs/tonal';

function isPlayingNow(note) {
    const playingNow = globals.currentJamNote.mapped
    const playingSansOctave = Tonal.Note.get(playingNow).pc;
    return playingSansOctave == note
}

</script>

<template>
    <template v-if="globals.scaleFilteringEnabled && globals.currentScaleNotes && globals.currentScaleNotes.length > 0">
        <span v-for="note in globals.currentScaleNotes" :key="note" class="ui large text pr-2"
            :class="{ 'blue': isPlayingNow(note) }">
            <code> {{ note }} </code>
        </span>
    </template>
    <span v-else class="ui large text pr-2"><code></code></span>

</template>

<style scoped>
</style>
