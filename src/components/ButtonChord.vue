<script setup>
defineProps(['root', 'symbol', 'bass'])
const emit = defineEmits(['chord-event'])

function playChordStuff(chordSymbolNoRoot, rootNote, bassNote, state) {
    // state is boolean to play or silence the chord
    emit('chord-event', { chordSymbolNoRoot, rootNote, bassNote, state })
}
</script>

<template>
    <button 
        @mouseenter="playChordStuff(symbol, root, bass, true)" 
        @mousedown="playChordStuff(symbol, root, bass, true)"
        @touchstart.prevent="playChordStuff(symbol, root, bass, true)"

        @mouseleave="playChordStuff(symbol, root, bass, false)" 
        @mouseup="playChordStuff(symbol, root, bass, false)"
        @touchend.prevent="playChordStuff(symbol, root, bass, false)"
        class="ui tiny button"><span v-if="root">{{ root }}</span>{{ symbol }}<span v-if="bass">/{{ bass
        }}</span></button>
</template>

<style scoped>
</style>
