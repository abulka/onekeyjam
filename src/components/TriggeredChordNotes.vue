<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '../../src/lib/globals.js'


</script>

<template>
    <span v-if="!globals.currentConfigEmpty() && globals.enableLhChordTriggers" v-for="note in globals.currentLhNotes()"
        class="ui medium brown text pr-2">
        <code> {{ note }} </code>
    </span>
</template>

<style scoped>
</style>
