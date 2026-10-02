<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '../../src/lib/globals.js'
import JamNote from './JamNote.vue'
import { changeScaleFilter } from "../lib/change-scale.js"
import { clearKeyboard, displayScaleOnKeyboard } from "@/lib/midi/midi-keyboard-util"

// DUPLICATED FROM src/components/JammerView.vue
const currentChordConfig = computed({
  get: () => globals.currentChordConfig(),
})

// Unique to this component

const alignTonicOnC = computed({
  get: () => globals.scaleFiltering.strategy == 'CToScaleTonic',
  set: (v) => { globals.scaleFiltering.strategy = v ? 'CToScaleTonic' : 'CToC'; changeScaleFilter() },
})

const preserveOctaves = computed({
  get: () => globals.scaleFiltering.preserveOctaves,
  set: (v) => { globals.scaleFiltering.preserveOctaves = v; changeScaleFilter(); },
})

const padWithLastGoodNote = computed({
  get: () => globals.scaleFiltering.padWithLastGoodNote,
  set: (v) => { globals.scaleFiltering.padWithLastGoodNote = v; changeScaleFilter(); },
})

const autoDropOctave = computed({
  get: () => globals.scaleFiltering.autoDropOctave,
  set: (v) => { globals.scaleFiltering.autoDropOctave = v; changeScaleFilter(); },
})

const backfill = computed({
  get: () => globals.scaleFiltering.backfill,
  set: (v) => { globals.scaleFiltering.backfill = v; changeScaleFilter(); },
})

const pianoKeyboard = ref(null) // could just refer by element id which is unique to each view
const scaleFilteringSwitch = ref(null)
const showVintageSwitch = true

function onScaleChanged(event) {
  // console.log('scale-changed', event.detail.notes)
  clearKeyboard(pianoKeyboard.value)
  displayScaleOnKeyboard(pianoKeyboard.value, event.detail.notes)
}
function onScaleFilteringChanged(e) {
  const alwaysDisplayScale = true  // TODO should be a user setting
  const scaleFiltering = e.detail.state == 0

  function displayScale() {
    displayScaleOnKeyboard(pianoKeyboard.value, e.detail.notes)
  }
  if (alwaysDisplayScale)
    displayScale()
  else {
    // Display Scale if Scale filtering is on
    (scaleFiltering) ? clearKeyboard(pianoKeyboard.value) : displayScale()
  }
}

onMounted(() => {
  document.addEventListener("scale-changed", onScaleChanged)
  document.addEventListener('scale-filtering-changed', onScaleFilteringChanged)

  scaleFilteringSwitch.value.addEventListener('change', (e) => {
    // The vintage switch reflects 'scaleFiltering' ok using v-model but when you click it, it
    // doesn't seem to work . So we have to manually set it.
    globals.scaleFilteringEnabled = e.target.checked

    // Could call onScaleFilteringChanged() above, directly but this is more consistent
    if (!globals.currentScaleNotes) {
      console.log('No scale notes? - aborting scale-filtering-changed broadcast')
      return
    }
    document.broadcastEvent('scale-filtering-changed', { state: globals.scaleFilteringEnabled, notes: globals.currentScaleNotes })
  })
})

// it is important to remove the event listeners or they get added again
// on each mount, and you get multiple function calls for each event, with wrong data
onUnmounted(() => {
  document.removeEventListener("scale-changed", onScaleChanged)
  document.removeEventListener('scale-filtering-changed', onScaleFilteringChanged)

})

function firstTriggerNoteForScales(obj) {
  for (var a in globals.scaleTriggerMap) return a; // gets first property
}

</script>

<template>
  <p>Play (jam/improvise 🥳) using any white note from <code>{{ firstTriggerNoteForScales() }}</code>
    upwards, and it will automatically be adjusted to conform to the active scale.</p>
  <div class="ui grid">
    <div class="ten wide column">

      <div class="ui very compact centered grid">
        <div class="row">
          <webaudio-keyboard keys="25" ref="pianoKeyboard" width="300" height="80" enable="0">
          </webaudio-keyboard>
        </div>
        <div class="row">
          {{ currentChordConfig[globals.currentScaleFilter] }}
          <span v-if="globals.currentScaleEmpty" style="color:brown">No scale specified for <b>{{
              globals.currentScaleFilter
          }}</b>
            - jam notes will not be filtered</span>
        </div>
        <div class="row">
          <p><b>
              <span v-for="note in globals.currentScaleNotes" :key="note">
                {{ note }} &nbsp;
              </span>
              <br>
            </b></p>
        </div>
      </div>

      <ul id="mappings-list">
        <!-- eslint-disable-next-line vue/require-v-for-key -->
        <li v-for="(value, name) in globals.scaleTriggerMap" :class="{ 'boldy': name[0] === 'C' }">
          {{ name }}: {{ value }}
        </li>
      </ul>

    </div>

    <div class="six wide column">

      <!-- vintage toggle switch - is actually more powerful since it also causes the broadcast of
      the scale-filtering-changed event - need to look at this more deeply one day. -->
      <div v-if="showVintageSwitch" class="ui centered very compact grid">
        <div class="row">
          <webaudio-switch v-model="globals.scaleFilteringEnabled" ref="scaleFilteringSwitch"
            src="../knobs/switch_toggle.png" width="32" height="32" tooltip="filter by scale on/off">
          </webaudio-switch>
        </div>
        <div class="row">
          White notes conform to current Scale
        </div>

        <div style="min-height:2em;">
          <JamNote />
        </div>

        <div class="row">
          <p>Scale Mapping Strategy: <b>{{ globals.scaleFiltering.strategy }}</b></p>
        </div>

        <div class="row">
          <div class="ui toggle checkbox">
            <input type="checkbox" v-model="alignTonicOnC">
            <label>Align Scale Tonics On C</label>
          </div>
        </div>

        <div class="row">
          <div class="ui toggle checkbox">
            <input type="checkbox" v-model="preserveOctaves">
            <label>preserveOctaves</label>
          </div>
        </div>

        <div class="row">
          <div class="ui toggle checkbox">
            <input type="checkbox" v-model="padWithLastGoodNote" :disabled="!globals.scaleFiltering.preserveOctaves">
            <label>padWithLastGoodNote</label>
          </div>
        </div>

        <div class="row">
          <div class="ui toggle checkbox">
            <input type="checkbox" v-model="autoDropOctave">
            <label>autoDropOctave</label>
          </div>
        </div>

        <div class="row">
          <div class="ui toggle checkbox">
            <input type="checkbox" v-model="backfill">
            <label>backfill</label>
          </div>
        </div>

      </div>

    </div>

  </div>

  <div>
    <p>Other Scale Trigger Notes:
      <code class="scale-description-padding"><b>C#4</b> {{ currentChordConfig.scale1 }}</code>
      <code class="scale-description-padding"><b>D#4</b> {{ currentChordConfig.scale2 }}</code>
      <code class="scale-description-padding"><b>F#4</b> {{ currentChordConfig.scale3 }}</code>
      <code class="scale-description-padding"><b>G#4</b> notes of current chord</code>
      <code class="scale-description-padding"><b>A#4</b> lock curr scale (so it doesn't change when changing chord)</code>
    </p>
  </div>

</template>

<style scoped>

</style>
