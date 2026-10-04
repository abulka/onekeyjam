<script setup>
import { globals } from '../../src/lib/globals.js'
import { samePitchClass, noteInAnyPitchClass, unionPitchClassNotes, describeNoteRoles } from '../../src/lib/note-tools.js'
import { projectKeyNotes } from '../../src/lib/projectKey.js'

function keyNotes() {
    return projectKeyNotes(globals.getProjectKey())
}

function displayNotes() {
    return unionPitchClassNotes(globals.currentScaleNotes, keyNotes())
}

function isPlayingNow(note) {
    return samePitchClass(note, globals.currentJamNote.mapped)
}

function isInCurrentScale(note) {
    return noteInAnyPitchClass(note, globals.currentScaleNotes)
}

function isInProjectKey(note) {
    return noteInAnyPitchClass(note, keyNotes())
}

function isInChord(note) {
    return noteInAnyPitchClass(note, [...globals.currentLhNotes(), globals.currentBass()])
}

// Project key notes that are not in the active scale are a faded reference,
// unless Solo in key is on, when the key is (or becomes) the active scale.
function isFaded(note) {
    return isInProjectKey(note) && !isInCurrentScale(note) && globals.soloMode !== 'key'
}

// Chord membership only matters for notes the right hand is actually filtered
// to, so shaded (not in chord) is judged on current-scale notes only.
function isNonChordTone(note) {
    return isInCurrentScale(note) && !isInChord(note)
}

function noteTitle(note) {
    return describeNoteRoles({
        inProjectKey: isInProjectKey(note),
        inCurrentScale: isInCurrentScale(note),
        inCurrentChord: isInChord(note),
    })
}

</script>

<template>
    <template v-if="globals.scaleFilteringEnabled && displayNotes().length > 0">
        <span v-for="note in displayNotes()" :key="note" class="ui large text pr-2"
            :class="{ 'blue': isPlayingNow(note), 'project-key-dim': isFaded(note) }">
            <code :class="{ 'non-chord-tone': isNonChordTone(note), 'in-key': isInProjectKey(note) }"
                :title="noteTitle(note)">{{ note }}</code>
        </span>
    </template>
    <span v-else class="ui large text pr-2"><code></code></span>

</template>

<style scoped>
.non-chord-tone {
    background-color: #ffcc80;
    border-radius: 3px;
}

.in-key {
    border-bottom: 2px solid #8a6d3b;
}

.project-key-dim {
    opacity: 0.4;
}
</style>
