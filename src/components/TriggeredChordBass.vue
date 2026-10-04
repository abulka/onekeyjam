<script setup>
import { globals } from '../../src/lib/globals.js'
import { samePitchClass } from '../../src/lib/note-tools.js'

function isPlayingNow(note) {
    return samePitchClass(note, globals.currentJamNote.mapped)
}

</script>

<template>
    <span v-if="globals.scaleFilteringEnabled && globals.isProjectLoaded && globals.currentBass()" class="pr-2">Bass:</span>
    <span v-if="globals.scaleFilteringEnabled"
        class="ui medium text pr-2"
        :class="isPlayingNow(globals.currentBass()) ? 'blue' : 'brown'">
        <code> {{ globals.currentBass() }} </code>
    </span>

</template>

<style scoped>
</style>
