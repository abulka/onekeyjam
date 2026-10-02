<script setup>
import { computed, nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { globals } from '../lib/globals.js'
import { store } from '../lib/globals.js'
import { Note } from '@/lib/midi/webmidi.js'
import { indexToNote } from "../lib/note-tools.js"
import { onNoteOn, onNoteOff } from "@/lib/midi/wire-events"
import { getNoteKeyForCode } from "@/lib/midi/piano-key-map.js"
import KeyboardHelpOverlay from "./KeyboardHelpOverlay.vue"
import PlaybackKeysOverlay from "./PlaybackKeysOverlay.vue"

// window.matchMedia('(min-width: 700px)')
const isLargeScreen = computed({
  get: () => window.innerWidth > 768,
})

const NONOTE = ' '
let lhCsharpStuckDown = false
const isLhCsharp = (keyboardIndex) => indexToNote(keyboardIndex, globals.keyboard.lhTriggerOctave) === globals.lhMetaKeys.lhCsharp

const pianoKeyboard = ref(null)
const keyboardFocused = ref(false)
// Physical keys currently held down, so we can stop the note we started.
const keysDown = new Map()

function updateKeyboardFocus() {
  keyboardFocused.value = !!pianoKeyboard.value && document.activeElement === pianoKeyboard.value
}

function onFocusChange() {
  // focusout fires before the next element receives focus, so defer the check
  setTimeout(updateKeyboardFocus, 0)
}

function focusKeyboard() {
  const el = pianoKeyboard.value
  if (!el)
    return
  // The focusable element is the canvas inside the widget's shadow root
  const canvas = el.shadowRoot ? el.shadowRoot.querySelector('canvas') : null
  if (canvas)
    canvas.focus()
  else
    el.focus()
}

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

  // Mirror notes played on the on-screen keyboard so other views (such as the
  // sequencer piano strips) can follow along. Black modifier keys are excluded.
  if (!globals.isLhMetaKey(note)) {
    // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
    document.broadcastEvent('live-note', { state, note: new Note(note, { attack: 0.5 }) })
  }

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
  // indicating whether note is on or off. Playback re-uses this event (with
  // source 'playback') to light the recorded notes as they play.
  const baseMidi = 12 * (globals.keyboard.lhTriggerOctave + 1)  // MIDI number of the leftmost key
  const noteNumber = event.detail.note.number - baseMidi  // map note number to our visual keyboard range
  pianoKeyboard.value?.setNote(event.detail.state, noteNumber)

  if (event.detail.source === 'playback')
    return

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
  updateKeyboardFocus()
}

watch(pianoKeyboard, attachKeyboard)

onMounted(() => {
  attachKeyboard()
  document.addEventListener('live-note', onLiveNote)
  document.addEventListener('focusin', onFocusChange)
  document.addEventListener('focusout', onFocusChange)
})

onUnmounted(() => {
  detachKeyboard()
  document.removeEventListener("live-note", onLiveNote)
  document.removeEventListener('focusin', onFocusChange)
  document.removeEventListener('focusout', onFocusChange)
})


</script>

<template>
  <!-- piano keyboard -->
  <div class="ui container mb-4" data-step="piano-keyboard">
    <div class="keyboard-hint-row">
      <p class="keyboard-focus-hint" :class="{ 'keyboard-focus-hint-hidden': keyboardFocused }"
        role="button" tabindex="0" title="Click to focus the keyboard" @click="focusKeyboard()"
        @keydown.enter="focusKeyboard()">
        Click the keyboard to use computer-keyboard shortcuts.
      </p>
      <div class="key-labels-group">
        <label class="key-labels-control"
          title="Show the meaning of the black keys and the chord/scale mappings of the white keys on the main keyboard.">
          Key labels
          <select v-model="globals.keyboardHelpMode" class="key-labels-select">
            <option value="off">Off</option>
            <option value="black">Black keys</option>
            <option value="white">White keys</option>
            <option value="all">Black + white</option>
          </select>
        </label>
        <label class="shortcuts-checkbox" title="Show the computer-keyboard key on each piano key">
          <input type="checkbox" v-model="globals.showKeyShortcuts">
          Show computer keyboard shortcuts
        </label>
      </div>
    </div>
    <div class="piano-keyboard-wrap" :class="{ 'keyboard-focused': keyboardFocused }">
      <webaudio-keyboard v-if="isLargeScreen" keys="49" ref="pianoKeyboard" width="1130"></webaudio-keyboard>
      <webaudio-keyboard v-else keys="25" ref="pianoKeyboard" width="710"></webaudio-keyboard>
      <PlaybackKeysOverlay :keyboard-el="pianoKeyboard" :keys="isLargeScreen ? 49 : 25" />
      <KeyboardHelpOverlay v-if="globals.keyboardHelpMode !== 'off' || globals.showKeyShortcuts" :keyboard-el="pianoKeyboard"
        :keys="isLargeScreen ? 49 : 25" />
    </div>
  </div>
</template>

<style scoped>
.piano-keyboard-wrap {
  position: relative;
  display: inline-block;
  line-height: 0;
  outline: 2px solid rgba(0, 0, 0, 0.12);
  outline-offset: 2px;
  border-radius: 4px;
}

.piano-keyboard-wrap.keyboard-focused {
  outline: 2px solid #2e8b57;
}

.keyboard-hint-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0 0 0.25rem;
}

.keyboard-focus-hint {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #b45309;
  cursor: pointer;
}

.keyboard-focus-hint:hover {
  text-decoration: underline;
}

.keyboard-focus-hint-hidden {
  visibility: hidden;
}

.key-labels-group {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-left: auto;
}

.key-labels-control {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: #333;
  cursor: pointer;
}

.key-labels-select {
  padding: 1px 3px;
  font-size: 0.78rem;
  color: #333;
  background: #fff;
  border: 1px solid #999;
  border-radius: 4px;
}

.shortcuts-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: #333;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.shortcuts-checkbox input {
  margin: 0;
}
</style>
