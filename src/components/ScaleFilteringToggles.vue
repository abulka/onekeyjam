<script setup>
import { onMounted, onUnmounted } from "vue";
import { globals } from '@/lib/globals.js'

function keyUpListener(e) {
  // console.log('keyup', e.key, e.keyCode, 'this', this, 'meta', e.metaKey, 'ctrl', e.ctrlKey, 'shift', e.shiftKey);  // 'this' is the window

  const normal = () => e.ctrlKey && !e.shiftKey
  const shifted = () => e.ctrlKey && e.shiftKey

  if (e.key === "1" && normal()) {
    globals.bypass.value = true  // if want to toggle instead use !bypass.value
  }
  if (e.key === "1" && shifted()) {
    globals.bypass.value = false
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
    <div class="two column centered row andyshade">
      <div class="right aligned column">✨✨Magic mode (one note chords, white notes conform to scale)</div>
      <div class="left aligned column">
        <div class="ui toggle checkbox"
          title="Bypass filtering, use when playing chords to add to project">
          <input type="checkbox" v-model="globals.bypass" data-step="bypass-filtering">
          <label>Bypass (normal piano keyboard) 🎹</label>
        </div>
      </div>
    </div>
    <div class="two column centered row">
      <div class="center aligned column">
        <label class="checkboxLabel"
          title="Left hand: Left Hand Chord Triggers so that you can play notes and chords on the whole keyboard. 🥸 Note this also turns off Scale Filtering.">
          White note C{{globals.keyboard.lhTriggerOctave}}⇢B{{globals.keyboard.rhJamSoundOctave-1}} one finger chords 
          <input type="checkbox" v-model="globals.enableLhChordTriggers" />
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
