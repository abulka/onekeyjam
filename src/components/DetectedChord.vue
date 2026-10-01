<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '/src/lib/globals.js'

</script>

<template>

  <div v-if="globals.currentChordBeingJammed.chord && !globals.currentChordBeingJammed.stale">
    <span class="detectedChord">{{ globals.currentChordBeingJammed.chord }} </span>
    <span v-if="globals.currentChordBeingJammed.bass">/</span>
    <span v-if="globals.currentChordBeingJammed.bass" class="detectedBass">{{ globals.currentChordBeingJammed.bass }}</span>
  </div>
  <div v-else>
    <span class="detectedChord">&nbsp;</span>
  </div>

</template>

<style scoped>
.detectedChord {
  color: green;
  font-size: x-large;
}

.detectedBass {
  color: brown;
  font-size: x-large;
}
</style>
