<script setup>
import { globals } from '../../src/lib/globals.js'

const MAX_NAME_LENGTH = 24;  // though 26 usually fits, but not on Lenovo Duet

function msg() {
    if (globals.scaleOverrideName) {
        const i = Math.min(globals.currentScaleName.length, MAX_NAME_LENGTH)
        return globals.currentScaleName.slice(0, i)
    }
    if (globals.scaleFiltering.frozen) {
        const padlockIconLength = 2
        const name = `${globals.scaleFiltering.scaleTonic} ${globals.scaleFiltering.scaleType}`
        const i = Math.min(name.length, MAX_NAME_LENGTH - padlockIconLength)
        return name.slice(0, i) + ' 🔒'
    }
    if (!globals.isProjectLoaded)
        return 'None';
    if (globals.currentConfigEmpty())
        return 'Trigger a chord to start';
    if (!globals.currentScaleName)
        return 'None';
    const i = Math.min(globals.currentScaleName.length, MAX_NAME_LENGTH)
    return globals.currentScaleName.slice(0, i)
}

</script>

<template>
    <span class="ui text grey"
        :title="globals.scaleFiltering.autoReason || 'Scale filter depends on current triggered chord - add a chord via \'Build a project\''">
        <span v-if="globals.scaleFilteringEnabled">
            {{ msg() }}
            <!-- {{ globals.currentScaleFilter}} -->
        </span>
        <span v-else>Scale Filtering is off</span>
    </span>
</template>

<style scoped>
</style>
