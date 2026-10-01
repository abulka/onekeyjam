<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '../lib/globals.js'
import { store } from '../lib/globals.js'
import { indexToNote } from "../lib/note-tools.js"
import { onNoteOn, onNoteOff } from "../lib/wire-events"

// window.matchMedia('(min-width: 700px)')
const isLargeScreen = computed({
  get: () => window.innerWidth > 768,
})

const NONOTE = ' '
let lhCsharpStuckDown = false
let isLhCsharp = (keyboardIndex) => indexToNote(keyboardIndex, globals.keyboard.lhTriggerOctave) === globals.lhMetaKeys.lhCsharp

const pianoKeyboard = ref(null)

function buildRawPianoNoteInfo(note, on, noteNumber, showNoteNumber = true) {
  // sets globals.currentRawLiveNote
  // noteNumber is the piano key index startying with 0 as the first note of the visual keyuboard
  const noteNumberMsg = showNoteNumber ? ` (i=${noteNumber})` : ''
  globals.currentRawLiveNote = on ? `${note}${noteNumberMsg}` : NONOTE

}

function onChange(e) {
  if (e.note[0]) {
    const note = indexToNote(e.note[1], globals.keyboard.lhTriggerOctave)
    const noteNumber = e.note[1]
    // console.log("Note-On:" + e.note[1], note);
    buildRawPianoNoteInfo(note, true, noteNumber, false)

    if (isLhCsharp(e.note[1])) lhCsharpStuckDown = !lhCsharpStuckDown
    let simulatedEvent = {
      // The Note object is from webmidi which is included globally via index.html - this is not the Tonal Note object
      // eslint-disable-next-line no-undef
      note: new Note(note, { attack: 0.5 })
    }
    onNoteOn(simulatedEvent)
    store.inc()   // just for fun
  }
  else {
    const note = indexToNote(e.note[1], globals.keyboard.lhTriggerOctave)
    // console.log("Note-Off:" + e.note[1], note);
    globals.currentRawLiveNote = NONOTE
    if (isLhCsharp(e.note[1]) && lhCsharpStuckDown) {
      // Avoid the normal note-off event for lhCsharp meta black key
      pianoKeyboard.value.setNote(true, e.note[1])  // quickly turn visual keyboard back on
      return
    }
    let simulatedEvent = {
      // eslint-disable-next-line no-undef
      note: new Note(note, { attack: 0.5 })
    }
    onNoteOff(simulatedEvent)
  }
}

function onLiveNote(event) {
  // Custom event, detail has 'note' which is a Note object and 'state' boolean 
  // indicating whether note is on or off
  const C4 = 60
  const C3 = C4 - 12
  const noteNumber = event.detail.note.number - C3  // map note number to our visual keyboard range
  pianoKeyboard.value.setNote(event.detail.state, noteNumber)

  // Live real MIDI keyboard press got us here
  const note = indexToNote(noteNumber, globals.keyboard.lhTriggerOctave)
  buildRawPianoNoteInfo(note, event.detail.state, noteNumber, false)
}

onMounted(() => {
  pianoKeyboard.value.addEventListener('change', onChange);
  document.addEventListener("live-note", onLiveNote)
})

onUnmounted(() => {
  // No need to removeEventListener from pianoKeyboard.value since this ref is null by now
  document.removeEventListener("live-note", onLiveNote)
})


</script>

<template>
  <!-- piano keyboard -->
  <div class="ui container mb-4" data-step="piano-keyboard">
    <webaudio-keyboard v-if="isLargeScreen" keys="49" ref="pianoKeyboard" width="1130"></webaudio-keyboard>
    <webaudio-keyboard v-else keys="25" ref="pianoKeyboard" width="710"></webaudio-keyboard>
  </div>
</template>

<style scoped>

</style>
