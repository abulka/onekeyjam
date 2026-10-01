<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '../../src/lib/globals.js'

function msg() {
    if (!globals.isProjectLoaded)
        return 'None';
    return globals.currentChordName()
}

</script>

<template>
    <span class="ui text grey" title="Add a chord via 'Build a project'">
        <span v-if="globals.enableLhChordTriggers">
            {{ msg() }}
            <!-- via <b><code>{{ globals.currentChordTriggerNote }}</code></b> -->
        </span>
        <span v-else></span>
    </span>
</template>

<style scoped>
</style>
