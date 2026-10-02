<script setup>
import { globals } from '../../src/lib/globals.js'


</script>

<template>
    <template v-if="!globals.currentConfigEmpty() && globals.enableLhChordTriggers">
        <span v-for="note in globals.currentLhNotes()" :key="note" class="ui medium brown text pr-2">
            <code> {{ note }} </code>
        </span>
    </template>
</template>

<style scoped>
</style>
