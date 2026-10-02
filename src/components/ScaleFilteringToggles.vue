<script setup>
import { onMounted, onUnmounted } from "vue";
import { globals } from '@/lib/globals.js'

function setMagicMode() {
  globals.bypass = false
}

function setNormalPiano() {
  globals.bypass = true
}

function keyUpListener(e) {
  // console.log('keyup', e.key, e.keyCode, 'this', this, 'meta', e.metaKey, 'ctrl', e.ctrlKey, 'shift', e.shiftKey);  // 'this' is the window

  const normal = () => e.ctrlKey && !e.shiftKey
  const shifted = () => e.ctrlKey && e.shiftKey

  if (e.code === "Digit1" && normal()) {
    globals.bypass = true  // if want to toggle instead use !globals.bypass
  }
  if (e.code === "Digit1" && shifted()) {
    globals.bypass = false
  }
}

onMounted(() => {
  window.addEventListener('keyup', keyUpListener);
});

onUnmounted(() => {
  window.removeEventListener("keyup", keyUpListener);
});


</script>

<template>

  <div class="ui one column centered padded grid">
    <div class="one column centered row andyshade">
      <div class="center aligned column">
        <div class="ui compact buttons mode-toggle" data-step="bypass-filtering">
          <button type="button" class="ui button" :class="{ active: !globals.bypass, boldy: !globals.bypass }"
            title="One note chords, white notes conform to the current scale"
            @click="setMagicMode()">
            ✨ Magic mode
          </button>
          <button type="button" class="ui button" :class="{ active: globals.bypass, boldy: globals.bypass }"
            title="Bypass filtering, use when playing chords to add to project"
            @click="setNormalPiano()">
            🎹 Normal piano
          </button>
        </div>
        <div class="mode-description">
          {{ globals.bypass
            ? 'Bypass filtering: play a normal piano keyboard to add chords to your project.'
            : 'One note chords, white notes conform to the current scale.' }}
        </div>
      </div>
    </div>
    <div class="three column centered row">
      <div class="center aligned column">
        <label class="checkboxLabel"
          title="Left hand: Left Hand Chord Triggers so that you can play notes and chords on the whole keyboard. 🥸 Note this also turns off Scale Filtering.">
          White note C{{globals.keyboard.lhTriggerOctave}}⇢B{{globals.keyboard.rhJamSoundOctave-1}} one finger chords 
          <input type="checkbox" v-model="globals.enableLhChordTriggers" />
        </label>
      </div>
      <div class="center aligned column">
        <label class="checkboxLabel"
          title="Show the meaning of the black keys and the chord/scale mappings of the white keys on the main keyboard.">
          Key labels
          <select v-model="globals.keyboardHelpMode" class="key-labels-select">
            <option value="off">Off</option>
            <option value="black">Black keys</option>
            <option value="white">White keys</option>
            <option value="all">Black + white</option>
          </select>
        </label>
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
.mode-toggle {
  margin-bottom: 0.4rem;
}

.mode-description {
  font-size: 0.9rem;
  color: #555;
}

.key-labels-select {
  margin-left: 0.4rem;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid #999;
  background: #fff;
  color: #333;
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
