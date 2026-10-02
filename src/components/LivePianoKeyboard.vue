<script setup>
import { computed, nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { globals } from '../lib/globals.js'
import { store } from '../lib/globals.js'
import { Note } from '@/lib/midi/webmidi.js'
import { indexToNote } from "../lib/note-tools.js"
import { onNoteOn, onNoteOff } from "@/lib/midi/wire-events"
import { getNoteKeyForCode } from "@/lib/midi/piano-key-map.js"
import KeyboardHelpOverlay from "./KeyboardHelpOverlay.vue"

// window.matchMedia('(min-width: 700px)')
const isLargeScreen = computed({
  get: () => window.innerWidth > 768,
})

const NONOTE = ' '
let lhCsharpStuckDown = false
const isLhCsharp = (keyboardIndex) => indexToNote(keyboardIndex, globals.keyboard.lhTriggerOctave) === globals.lhMetaKeys.lhCsharp

const pianoKeyboard = ref(null)
// Physical keys currently held down, so we can stop the note we started.
const keysDown = new Map()

function buildRawPianoNoteInfo(note, on, noteNumber, showNoteNumber = true) {
  // sets globals.currentRawLiveNote
  // noteNumber is the piano key index startying with 0 as the first note of the visual keyuboard
  const noteNumberMsg = showNoteNumber ? ` (i=${noteNumber})` : ''
  globals.currentRawLiveNote = on ? `${note}${noteNumberMsg}` : NONOTE
}

/**
 * Handle a note on/off for a visual keyboard index. Shared by the widget's
 * mouse/touch "change" events and our own computer-keyboard handling.
 * @param {boolean} state true for note on
 * @param {number} keyboardIndex visual key index, 0 is the first key of the keyboard
 */
function handleNote(state, keyboardIndex) {
  const note = indexToNote(keyboardIndex, globals.keyboard.lhTriggerOctave)

  if (state) {
    buildRawPianoNoteInfo(note, true, keyboardIndex, false)
    if (isLhCsharp(keyboardIndex)) lhCsharpStuckDown = !lhCsharpStuckDown
    let simulatedEvent = {
      // Note is WebMidi's Note (imported from @/lib/webmidi.js), not Tonal's
      note: new Note(note, { attack: 0.5 })
    }
    onNoteOn(simulatedEvent)
    store.inc()   // just for fun
  }
  else {
    globals.currentRawLiveNote = NONOTE
    if (isLhCsharp(keyboardIndex) && lhCsharpStuckDown) {
      // Avoid the normal note-off event for lhCsharp meta black key
      pianoKeyboard.value?.setNote(true, keyboardIndex)  // quickly turn visual keyboard back on
      return
    }
    let simulatedEvent = {
      note: new Note(note, { attack: 0.5 })
    }
    onNoteOff(simulatedEvent)
  }
}

// Mouse/touch and other events emitted by the widget
function onChange(e) {
  handleNote(!!e.note[0], e.note[1])
}

// Computer keyboard, handled by us rather than the widget (see piano-key-map.js)
function onKeyDown(e) {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey)
    return
  const key = getNoteKeyForCode(e.code)
  if (!key || keysDown.has(e.code))
    return
  keysDown.set(e.code, key.offset)
  pianoKeyboard.value?.setNote(true, key.offset)
  handleNote(true, key.offset)
}

function onKeyUp(e) {
  if (!keysDown.has(e.code))
    return
  const offset = keysDown.get(e.code)
  keysDown.delete(e.code)
  pianoKeyboard.value?.setNote(false, offset)
  handleNote(false, offset)
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

let attachedEl = null

function detachKeyboard() {
  if (!attachedEl)
    return
  attachedEl.removeEventListener('change', onChange)
  attachedEl.removeEventListener('keydown', onKeyDown)
  attachedEl.removeEventListener('keyup', onKeyUp)
  attachedEl = null
}

async function attachKeyboard() {
  await nextTick()
  detachKeyboard()
  const el = pianoKeyboard.value
  if (!el)
    return

  // Take over keyboard input: clear the widget's hard-wired key map so it does
  // not play notes itself. Mouse/touch and drawing are unaffected.
  el.keycodes1 = []
  el.keycodes2 = []

  el.addEventListener('change', onChange)
  el.addEventListener('keydown', onKeyDown)
  el.addEventListener('keyup', onKeyUp)
  attachedEl = el
}

watch(pianoKeyboard, attachKeyboard)

onMounted(() => {
  attachKeyboard()
  document.addEventListener("live-note", onLiveNote)
})

onUnmounted(() => {
  detachKeyboard()
  document.removeEventListener("live-note", onLiveNote)
})


</script>

<template>
  <!-- piano keyboard -->
  <div class="ui container mb-4" data-step="piano-keyboard">
    <div class="piano-keyboard-wrap">
      <webaudio-keyboard v-if="isLargeScreen" keys="49" ref="pianoKeyboard" width="1130"></webaudio-keyboard>
      <webaudio-keyboard v-else keys="25" ref="pianoKeyboard" width="710"></webaudio-keyboard>
      <KeyboardHelpOverlay v-if="globals.keyboardHelpMode !== 'off'" :keyboard-el="pianoKeyboard"
        :keys="isLargeScreen ? 49 : 25" />
    </div>
  </div>
</template>

<style scoped>
.piano-keyboard-wrap {
  position: relative;
  display: inline-block;
  line-height: 0;
}
</style>
