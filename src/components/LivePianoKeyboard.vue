<script setup>
import { computed, nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { globals } from '../lib/globals.js'
import { store } from '../lib/globals.js'
import { Note } from '@/lib/midi/webmidi.js'
import { indexToNote } from "../lib/note-tools.js"
import { onNoteOn, onNoteOff } from "@/lib/midi/wire-events"
import { getNoteKeyForCode } from "@/lib/midi/piano-key-map.js"
import { isTypingTarget } from "@/lib/is-typing-target.js"
import { consumePendingKeyboardFocus } from "@/lib/demo-project.js"
import { KEYBOARD_OCTAVE_MIN, KEYBOARD_OCTAVE_MAX } from "@/lib/uiPrefs.js"
import KeyboardHelpOverlay from "./KeyboardHelpOverlay.vue"
import PlaybackKeysOverlay from "./PlaybackKeysOverlay.vue"
import KeyboardShortcutsHelp from "./KeyboardShortcutsHelp.vue"

// Track the viewport width so rotation between portrait and landscape picks
// the right keyboard size. A plain computed on window.innerWidth would only
// evaluate once and leave the wrong width after rotating.
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
function onWindowResize() {
  windowWidth.value = window.innerWidth
}
const isLargeScreen = computed(() => windowWidth.value > 768)

// The keyboard keeps a fixed pixel width; changing the octave count makes the
// keys wider or narrower rather than resizing the whole keyboard.
const LARGE_KEYBOARD_WIDTH = 1130
const SMALL_KEYBOARD_WIDTH = 710
const keyboardWidth = computed(() => (isLargeScreen.value ? LARGE_KEYBOARD_WIDTH : SMALL_KEYBOARD_WIDTH))

const NONOTE = ' '
let lhCsharpStuckDown = false
const isLhCsharp = (keyboardIndex) => indexToNote(keyboardIndex, globals.keyboard.lhTriggerOctave) === globals.lhMetaKeys.lhCsharp

const pianoKeyboard = ref(null)
const keyboardFocused = ref(false)
// Whether the keyboard shortcuts help dialog is open.
const showShortcutsHelp = ref(false)
// True while the computer keyboard can no longer play notes: the user is
// typing in a form field, or the app window does not have focus.
const noteInputSuspended = ref(false)
// Physical keys currently held down, so we can stop the note we started.
const keysDown = new Map()

const PIANO_OCTAVE = 12
// Normal piano mode uses the Ableton/Logic computer-keyboard layout.
const isPianoMode = () => globals.bypass
// The widget's leftmost key is always index 0 = the chord-trigger octave, and
// extra octaves extend upward (each octave ends on a C, so the widget never
// nudges the range for a black key).
const keyboardKeys = computed(() => globals.keyboardOctaves * PIANO_OCTAVE + 1)

/**
 * Bump the displayed octave count within the supported range.
 * @param {number} delta +1 or -1
 */
function changeOctaves(delta) {
  const next = Math.min(KEYBOARD_OCTAVE_MAX, Math.max(KEYBOARD_OCTAVE_MIN, globals.keyboardOctaves + delta))
  globals.keyboardOctaves = next
}
// Index of the A/C key of the piano mapping: the right-hand sound octave.
const pianoBaseIndex = () => PIANO_OCTAVE * (globals.getRhJamSoundOctave() - globals.getLhTriggerOctave())

/**
 * Resolve a note key to a widget index, applying the piano octave shift.
 * @param {{ offset: number }} key
 */
function resolveKeyboardIndex(key) {
  if (!isPianoMode())
    return key.offset
  return pianoBaseIndex() + key.offset + PIANO_OCTAVE * globals.computerKeyboard.octaveShift
}

/**
 * The number-row keys. In magic mode with scale filtering on these are the 1-5
 * scale shortcuts (and the rest are unused), so they must not sound a note.
 * @param {string} code
 */
function isNumberRowCode(code) {
  return code.startsWith('Digit') || code === 'Minus' || code === 'Equal'
}

function updateKeyboardFocus() {
  keyboardFocused.value = !!pianoKeyboard.value && document.activeElement === pianoKeyboard.value
}

// Notes play from a window listener, so the only thing that pauses them is
// typing in a form field or the app losing focus.
function updateNoteInputState() {
  noteInputSuspended.value = isTypingTarget(document.activeElement) || !document.hasFocus()
}

function onFocusChange() {
  // focusout fires before the next element receives focus, so defer the check
  setTimeout(() => {
    updateKeyboardFocus()
    updateNoteInputState()
  }, 0)
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

// The demo intro (and anything else) can ask for keyboard focus by broadcasting.
function onFocusKeyboardRequest() {
  consumePendingKeyboardFocus()
  focusKeyboard()
}

// Stop any notes still held when the app loses focus, so nothing gets stuck on.
function releaseAllKeys() {
  keysDown.forEach((index) => {
    if (index >= 0 && index < keyboardKeys.value)
      pianoKeyboard.value?.setNote(false, index)
    handleNote(false, index)
  })
  keysDown.clear()
}

function onWindowBlur() {
  releaseAllKeys()
  updateNoteInputState()
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
    if (!isPianoMode() && isLhCsharp(keyboardIndex)) lhCsharpStuckDown = !lhCsharpStuckDown
    let simulatedEvent = {
      // Note is WebMidi's Note (imported from @/lib/webmidi.js), not Tonal's
      note: new Note(note, { attack: 0.5 })
    }
    onNoteOn(simulatedEvent)
    store.inc()   // just for fun
  }
  else {
    globals.currentRawLiveNote = NONOTE
    if (!isPianoMode() && isLhCsharp(keyboardIndex) && lhCsharpStuckDown) {
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

  // Leave keystrokes alone while the user is typing in a form field.
  if (isTypingTarget(e.target))
    return

  // In normal piano mode Z / X shift the computer keyboard by an octave.
  if (isPianoMode()) {
    if (e.code === 'KeyZ') {
      e.preventDefault()
      globals.computerKeyboard.octaveShift = Math.max(-4, globals.computerKeyboard.octaveShift - 1)
      return
    }
    if (e.code === 'KeyX') {
      e.preventDefault()
      globals.computerKeyboard.octaveShift = Math.min(5, globals.computerKeyboard.octaveShift + 1)
      return
    }
  }

  // While scale filtering is on, the number row is the 1-5 scale shortcuts in
  // magic mode, so do not also play a note. When filtering is off these keys
  // play as right-hand black notes.
  if (!isPianoMode() && globals.scaleFilteringEnabled && isNumberRowCode(e.code))
    return

  const key = getNoteKeyForCode(e.code, isPianoMode() ? 'piano' : 'magic')
  if (!key || keysDown.has(e.code))
    return
  const index = resolveKeyboardIndex(key)
  keysDown.set(e.code, index)
  if (index >= 0 && index < keyboardKeys.value)
    pianoKeyboard.value?.setNote(true, index)
  handleNote(true, index)
}

function onKeyUp(e) {
  if (!keysDown.has(e.code))
    return
  const index = keysDown.get(e.code)
  keysDown.delete(e.code)
  if (index >= 0 && index < keyboardKeys.value)
    pianoKeyboard.value?.setNote(false, index)
  handleNote(false, index)
}

function onLiveNote(event) {
  // Custom event, detail has 'note' which is a Note object and 'state' boolean
  // indicating whether note is on or off. Playback re-uses this event (with
  // source 'playback') to light the recorded notes as they play.
  const baseMidi = 12 * (globals.keyboard.lhTriggerOctave + 1)  // MIDI number of the leftmost key
  const noteNumber = event.detail.note.number - baseMidi  // map note number to our visual keyboard range
  pianoKeyboard.value?.setNote(event.detail.state, noteNumber)

  // Automated lights (playback, pattern, audition) skip the raw live-note readout.
  if (event.detail.source)
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
  attachedEl = null
}

// The widget only reads `keys`/`width` once, and it defines their setters in
// connectedCallback, so apply the geometry by property after mount. Setting
// `keys` reruns the widget's layout, which also redraws at the new key width.
function applyKeyboardGeometry() {
  const el = pianoKeyboard.value
  if (!el)
    return
  el.min = 0
  el.width = keyboardWidth.value
  el.keys = keyboardKeys.value
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
  applyKeyboardGeometry()

  el.addEventListener('change', onChange)
  attachedEl = el
  updateKeyboardFocus()
  updateNoteInputState()
  // Focus now if a request was made before this keyboard mounted.
  if (consumePendingKeyboardFocus())
    focusKeyboard()
}

watch(pianoKeyboard, attachKeyboard)
watch([keyboardKeys, keyboardWidth], applyKeyboardGeometry)

onMounted(() => {
  attachKeyboard()
  // Notes play while the app window has focus, wherever the user is looking,
  // so the listeners are global rather than tied to the on-screen keyboard.
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('focus', updateNoteInputState)
  window.addEventListener('resize', onWindowResize)
  document.addEventListener('live-note', onLiveNote)
  document.addEventListener('focusin', onFocusChange)
  document.addEventListener('focusout', onFocusChange)
  document.addEventListener('focus-keyboard', onFocusKeyboardRequest)
  updateNoteInputState()
})

onUnmounted(() => {
  detachKeyboard()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('focus', updateNoteInputState)
  window.removeEventListener('resize', onWindowResize)
  document.removeEventListener("live-note", onLiveNote)
  document.removeEventListener('focusin', onFocusChange)
  document.removeEventListener('focusout', onFocusChange)
  document.removeEventListener('focus-keyboard', onFocusKeyboardRequest)
})


</script>

<template>
  <!-- piano keyboard -->
  <div class="ui container mb-4" data-step="piano-keyboard">
    <div class="keyboard-hint-row">
      <p class="keyboard-focus-hint" :class="{ 'keyboard-focus-hint-hidden': !noteInputSuspended }"
        role="button" tabindex="0" title="Click to focus the keyboard" @click="focusKeyboard()"
        @keydown.enter="focusKeyboard()">
        Computer-keyboard notes pause while you type in a field.
      </p>
      <div class="key-labels-group">
        <div class="octave-control"
          title="Change how many octaves are shown. Playing is not limited to the visible keys, and the chord-trigger octave is always the lowest.">
          <span class="octave-label">Octaves</span>
          <button type="button" class="octave-button" :disabled="globals.keyboardOctaves <= KEYBOARD_OCTAVE_MIN"
            aria-label="Show fewer octaves" @click="changeOctaves(-1)">&minus;</button>
          <span class="octave-value">{{ globals.keyboardOctaves }}</span>
          <button type="button" class="octave-button" :disabled="globals.keyboardOctaves >= KEYBOARD_OCTAVE_MAX"
            aria-label="Show more octaves" @click="changeOctaves(1)">+</button>
        </div>
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
        <button type="button" class="shortcuts-help-button" title="Show the keyboard shortcuts quick reference"
          @click="showShortcutsHelp = true">Shortcuts help</button>
      </div>
    </div>
    <div class="piano-keyboard-wrap" :class="{ 'keyboard-focused': keyboardFocused }">
      <webaudio-keyboard ref="pianoKeyboard" keys="49" width="1130"></webaudio-keyboard>
      <PlaybackKeysOverlay :keyboard-el="pianoKeyboard" :keys="keyboardKeys" />
      <KeyboardHelpOverlay v-if="globals.keyboardHelpMode !== 'off' || globals.showKeyShortcuts" :keyboard-el="pianoKeyboard"
        :keys="keyboardKeys" />
    </div>
    <KeyboardShortcutsHelp v-model="showShortcutsHelp" />
  </div>
</template>

<style scoped>
.piano-keyboard-wrap {
  position: relative;
  display: block;
  max-width: 100%;
  overflow-x: auto;
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

.octave-control {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: #333;
  user-select: none;
  white-space: nowrap;
}

.octave-label {
  margin-right: 0.1rem;
}

.octave-button {
  width: 1.35rem;
  height: 1.35rem;
  line-height: 1;
  padding: 0;
  border: 1px solid #2f4fa8;
  border-radius: 4px;
  background: #4a6fd4;
  color: #fff;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
}

.octave-button:hover:not(:disabled) {
  background: #3a5cc0;
}

.octave-button:disabled {
  opacity: 0.4;
  cursor: default;
}

.octave-value {
  min-width: 1em;
  text-align: center;
  font-weight: bold;
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

.shortcuts-help-button {
  padding: 0.1rem 0.5rem;
  border: 1px solid #2f4fa8;
  border-radius: 999px;
  background: #4a6fd4;
  color: #fff;
  font-size: 0.72rem;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
}

.shortcuts-help-button:hover {
  background: #3a5cc0;
}
</style>
