<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '/src/lib/globals.js'

</script>

<template>

  <!-- Current Chord Being triggered -->
  <span class="italic font-light sm:text-sm">
    {{ globals.currentChordBeingJammed.chordNotes.join(' ') }}
    ➡
    <span v-if="globals.currentChordBeingJammed.symbols.length > 0">
    {{ globals.currentChordBeingJammed.symbols.join(' or ') }}
    </span>
    <span v-else>no chord detected</span>
  </span>

</template>

<style scoped>

</style>
