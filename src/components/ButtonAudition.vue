<script setup>
import { auditionNotes } from '../../src/lib/auditionNotes'

defineProps(['notes', 'bass'])

/*
There are three ways to play the notes in a chord:
    1. trigger note via proper noteOn which then handles meta black keys etc.
    2. trigger note bypassing noteOn (bit of a cheat, miss out on some behaviours)
        const options = { originNote: '?', duration: 50, when: 0 }
        playChord(triggerNote, options)
    3. play each note individually (pure and clean)
        auditionNotes(notes, bass, state)

Here we support 3.  
*/

function auditionMouseDown(notes, bass, state) {
    // Play notes without changing the current chord config.
    // console.log('auditionMouseDown', notes, bass, state)
    if (notes.length > 0)
        auditionNotes(notes, bass, state)
    else
        throw ('auditionMouseDown: no notes specified to audition');
}
</script>

<template>
    <button class="grey ui circular compact icon button"
        @mousedown="auditionMouseDown(notes, bass, true)"
        @mouseenter="auditionMouseDown(notes, bass, true)"
        @touchstart.prevent="auditionMouseDown(notes, bass, true)"

        @mouseleave="auditionMouseDown(notes, bass, false)"
        @mouseup="auditionMouseDown(notes, bass, false)"
        @touchend.prevent="auditionMouseDown(notes, bass, false)"
        >
        <i class="volume up icon"></i>
    </button>
</template>

<style scoped>
</style>
