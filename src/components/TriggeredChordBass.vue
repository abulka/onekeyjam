<script setup>
import { globals } from '../../src/lib/globals.js'


</script>

<template>
    <span v-if="globals.scaleFilteringEnabled && globals.isProjectLoaded && globals.currentBass()" class="pr-2">Bass:</span>
    <span v-if="globals.scaleFilteringEnabled"
        class="ui medium brown text pr-2">
        <code> {{ globals.currentBass() }} </code>
    </span>

</template>

<style scoped>
</style>
