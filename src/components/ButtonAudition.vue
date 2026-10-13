<script setup>
import { auditionNotes } from '../../src/lib/auditionNotes'
import { forgetHover, rememberHover } from '@/lib/auditionHover.js'
import { ensureAudioReady } from '@/lib/audio/general-midi.js'

defineProps(['notes', 'bass', 'title'])

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

function auditionPress(notes, bass) {
    // A click is a decisive gesture, so waking audio here is allowed. Hover
    // never wakes because each attempt logs a browser warning while suspended.
    try { ensureAudioReady() } catch { /* audio not booted yet */ }
    auditionHover(notes, bass, true)
}

function auditionHover(notes, bass, state) {
    // Play notes without changing the current chord config.
    // An empty note list (for example before anything has been jammed) is a
    // silent no-op so hovering or clicking never throws.
    // Hover is remembered globally so releasing backquote can hand sound back
    // to grid, inspector, or browse previews alike.
    if (Array.isArray(notes) && notes.length > 0) {
        if (state)
            rememberHover(notes, bass)
        else
            forgetHover(notes)
        auditionNotes(notes, bass, state)
    }
    else if (state) {
        // Note-off is still safe to send so a stuck preview cannot ring.
        auditionNotes([], bass, false)
    }
    else {
        forgetHover()
        auditionNotes([], bass, false)
    }
}
</script>

<template>
    <button class="grey ui circular compact icon button" :title="title"
        @mousedown="auditionPress(notes, bass)"
        @mouseenter="auditionHover(notes, bass, true)"
        @touchstart.prevent="auditionPress(notes, bass)"

        @mouseleave="auditionHover(notes, bass, false)"
        @mouseup="auditionHover(notes, bass, false)"
        @touchend.prevent="auditionHover(notes, bass, false)"
        @touchcancel.prevent="auditionHover(notes, bass, false)"
        >
        <i class="volume up icon"></i>
    </button>
</template>

<style scoped>
</style>
