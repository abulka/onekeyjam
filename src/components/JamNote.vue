<script setup>
import { globals } from '../../src/lib/globals.js'

function showMappedNote() {
    return globals.currentJamNote.real &&
        globals.scaleFilteringEnabled &&
        Object.keys(globals.scaleTriggerMap).length > 0
}
</script>

<template>
    <!-- current white note being played  -->
    <div style="font-size:large">
        <p v-if="showMappedNote()">
            {{ globals.currentJamNote.real }} ➡
            <span class="ui text blue"> {{ globals.currentJamNote.mapped }} </span>
        </p>
        <p v-else>{{ globals.currentRawLiveNote }}</p>
    </div>

</template>

<style scoped>
</style>
