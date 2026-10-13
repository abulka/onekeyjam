<script setup>
defineProps(['root', 'symbol', 'bass'])
const emit = defineEmits(['chord-event', 'chord-select'])

function audition(chordSymbolNoRoot, rootNote, bassNote, state) {
    // state is boolean to preview or stop the chord. Hovering only previews
    // and never changes the Edit Chords draft.
    emit('chord-event', { chordSymbolNoRoot, rootNote, bassNote, state })
}

function select(chordSymbolNoRoot, rootNote, bassNote) {
    // Clicking loads the chord into the Edit Chords draft (unsaved until
    // Save changes). It does not play any sound by itself.
    emit('chord-select', { chordSymbolNoRoot, rootNote, bassNote })
}
</script>

<template>
    <button
        @mouseenter="audition(symbol, root, bass, true)"
        @mouseleave="audition(symbol, root, bass, false)"
        @focus="audition(symbol, root, bass, true)"
        @blur="audition(symbol, root, bass, false)"
        @touchstart.prevent="audition(symbol, root, bass, true)"
        @touchend.prevent="audition(symbol, root, bass, false)"
        @touchcancel.prevent="audition(symbol, root, bass, false)"
        @click="select(symbol, root, bass)"
        class="ui tiny button"
        :title="`Preview ${root || ''}${symbol}${bass ? '/' + bass : ''} on hover, click to load into Edit Chords`"><span v-if="root">{{ root }}</span>{{ symbol }}<span v-if="bass">/{{ bass
        }}</span></button>
</template>

<style scoped>
</style>
