<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '../../src/lib/globals.js'
import { getProjectChordsTriggers } from "../lib/project-chord-triggers.js"
import { clearKeyboard, displayScaleOnKeyboard } from "@/lib/midi/midi-keyboard-util"

// DUPLICATED FROM src/components/JammerView.vue
const currentChordConfig = computed({
  get: () => globals.currentChordConfig(),
})

const projectChordsTriggers = computed({
  get: () => getProjectChordsTriggers(),
})

// TODO need to show notes from proper start position in array upwards
const pianoKeyboard = ref(null)
const pianoKeyboardBass = ref(null)

function onChordChanged(event) {
  // console.log('chord-changed', event.detail.notes)
  // remove octave suffix from notes
  if (!event.detail.notes) {
    console.log('chord-changed', event.detail, 'skipping because notes is empty')
    return
  }
  let notes = event.detail.notes.map(note => note.replace(/[0-9]$/, ''))
  clearKeyboard(pianoKeyboard.value)
  displayScaleOnKeyboard(pianoKeyboard.value, notes)

  // Show Bass note on visual keyboard
  let notesBass = [event.detail.bass.replace(/[0-9]$/, '')]
  clearKeyboard(pianoKeyboardBass.value)
  displayScaleOnKeyboard(pianoKeyboardBass.value, notesBass)
}

onMounted(() => {
  document.addEventListener("chord-changed", onChordChanged)
})

// it is important to remove the event listeners or they get added again
// on each mount, and you get multiple function calls for each event, with wrong data
onUnmounted(() => {
  document.removeEventListener("chord-changed", onChordChanged)
})

</script>

<template>
  <p>Play one of the white note Trigger Notes [
    <span v-for="name in projectChordsTriggers" :key="name"
      :class="{ 'boldy': name === globals.currentChordTriggerNote }">
      <code class="chord-note-padding">{{ name }}</code>
    </span>
    ] to play a full, rich chord and to auto-change the Active jamming 🥳 Scale.
  </p>

  <div class="ui grid">

    <div class="eight wide column">

      <div class="ui very compact centered grid">
        <div class="row">
          <webaudio-keyboard keys="12" ref="pianoKeyboardBass" width="300" height="80" enable="0">
          </webaudio-keyboard>
        </div>
        <div class="row">
          Bass
        </div>
        <div class="row">
          <p class="boldy">{{ currentChordConfig.bass }} </p>
        </div>
      </div>

    </div>

    <div class="eight wide column">

      <div class="ui very compact centered grid">
        <div class="row">
          <webaudio-keyboard keys="24" ref="pianoKeyboard" width="300" height="80" enable="0">
          </webaudio-keyboard>
        </div>

        <!-- same as {{ globals.currentChordName() }} -->
        <div class="row"> {{ currentChordConfig.name }} </div>

        <div class="row">
          <p><b>
              <span v-for="note in currentChordConfig.chordNotes" :key="note">
                {{ note }} &nbsp;
              </span>
              <br>
            </b></p>
        </div>
      </div>

    </div>


  </div>
  <br>
  <div>
    <p>Other Chord Trigger Notes:
      <span v-for="name in projectChordsTriggers" class="chord-note-padding" :key="name"
        :class="{ 'boldy': name === globals.currentChordTriggerNote }">
        {{ name }}
      </span>
    </p>
  </div>

  <div>
    <br>
    <p>Options:</p>

    <label class="checkboxLabel" for="playChordBassCheckbox"
      title="Play bass note of chord on channel 2, as well as on the dedicated bass channel 3. Leave off for 'cleaner' chords.">
      Play Bass Note of Chords Channel
      <input type="checkbox" id="playChordBassCheckbox" v-model="globals.playChordBass" />
    </label>

    <label class="checkboxLabel" for="playBassOnlyCheckbox" title="Play bass note only.">
      Bass Channel Only
      <input type="checkbox" id="playBassOnlyCheckbox" v-model="globals.playBassOnly" />
    </label>

    <label class="checkboxLabel" for="playChordOnlyCheckbox" title="Play chord channel only (no bass channel).">
      Bass Channel Off
      <input type="checkbox" id="playChordOnlyCheckbox" v-model="globals.playChordOnly" />
    </label>

    <label class="checkboxLabel">
      Bass To Chord Delay
      <input type="range" min="0" max="1.5" step="0.25" v-model.number="globals.delayBassToChord">
      {{ globals.delayBassToChord }}
    </label>

  </div>
</template>

<style scoped>

</style>
