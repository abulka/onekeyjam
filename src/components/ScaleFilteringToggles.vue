<script setup>
import { globals } from '@/lib/globals.js'

function setMagicMode() {
  globals.bypass = false
}

function setNormalPiano() {
  globals.bypass = true
}


</script>

<template>

  <div class="ui one column centered padded stackable grid">
    <div class="three column centered middle aligned row andyshade">
      <div class="center aligned column">
        <label class="checkboxLabel"
          title="Left hand: Left Hand Chord Triggers so that you can play notes and chords on the whole keyboard. 🥸 Note this also turns off Scale Filtering.">
          White note C{{globals.keyboard.lhTriggerOctave}}⇢B{{globals.keyboard.rhJamSoundOctave-1}} one finger chords 
          <input type="checkbox" v-model="globals.enableLhChordTriggers" />
        </label>
      </div>
      <div class="center aligned column">
        <div class="ui compact buttons mode-toggle" data-step="bypass-filtering">
          <button type="button" class="ui button" :class="{ active: !globals.bypass, boldy: !globals.bypass }"
            :aria-pressed="!globals.bypass"
            title="One note chords, white notes conform to the current scale"
            @click="setMagicMode()">
            ✨ Magic mode
          </button>
          <button type="button" class="ui button" :class="{ active: globals.bypass, boldy: globals.bypass }"
            :aria-pressed="globals.bypass"
            title="Bypass filtering, use when playing chords to add to project"
            @click="setNormalPiano()">
            🎹 Normal piano
          </button>
        </div>
        <div class="mode-description">
          {{ globals.bypass
            ? 'Bypass filtering: play a normal piano keyboard'
            : 'One note chords, white notes conform to the current scale.' }}
        </div>
      </div>
      <div class="center aligned column">
        <label class="checkboxLabel"
          title="Right hand: filter white notes by scale on/off. 🥸 turn this off to play proper jam chords.">
          White notes C{{globals.keyboard.rhJamSoundOctave}}⇢ conform to current Scale
          <input type="checkbox" v-model="globals.scaleFilteringEnabled" />
        </label>
      </div>
    </div>
  </div>

</template>

<style scoped>
.ui.grid > .row.andyshade {
  padding-top: 6px;
  padding-bottom: 6px;
}

.mode-toggle {
  margin-bottom: 0.4rem;
}

.mode-toggle .ui.button {
  background: #efe3cf;
  color: #5b4326;
  border: 1px solid #c9a86a;
  box-shadow: none;
}

.mode-toggle .ui.button:hover {
  background: #e7d5b5;
  color: #3a2c1a;
}

.mode-toggle .ui.button.active {
  background: #4a6fd4;
  border-color: #2f4fa8;
  color: #fff;
}

.mode-toggle .ui.button.active:hover {
  background: #3a5cc0;
}

.mode-description {
  font-size: 0.9rem;
  color: #5b4326;
}

.ui.column.OFFLINE {
  border-width: 2px;
  border-color: green;
  border-style: dashed;
}

.ui.row.OFFLINE {
  border-width: 1px;
  border-color: red;
  border-style: dashed;
}

.ui.grid.OFFLINE {
  border-width: 1px;
  border-color: blue;
  border-style: dashed;
}

.andyshade.OFFLINE {
  border-color: green;
  box-shadow: 0 0 0 1px rgba(34,36,38,.15), 0 0 0 0 rgba(34,36,38,.15) inset;
  border-style: dashed;
  border-width: 1px;
  background-color: #d49969;
}
</style>
