<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '../../src/lib/globals.js'
import { stringify } from '../lib/prettyjson.js'
import { requestMidiAccess } from '../../src/lib/boot-webmidi.js'

// keyboard combo select
const optionsKeyboards = computed({
  get: () => globals.keyboardsAvailable,
})
const selectedKeyboard = computed({
  get: () => globals.keyboard.name,
  set: (v) => document.broadcastEvent("switch-keyboard", { name: v }),
})

function enableMidi() {
  requestMidiAccess()
}

</script>

<template>
  <h5>MIDI Keyboards detected on this machine:</h5>
  <p v-if="globals.keyboardsDetected.length == 0">No midi keyboards detected</p>
  <ul v-else style="font-family: Courier, monospace;">
    <li v-for="keyboardName in globals.keyboardsDetected" :key="keyboardName">
      {{ keyboardName }}
    </li>
  </ul>

  <p v-if="globals.midiAccess.status === 'denied'" class="text-red-600">
    {{ globals.midiAccess.message }}
  </p>
  <p v-else-if="globals.midiAccess.status === 'unsupported'" class="text-red-600">
    {{ globals.midiAccess.message }}
  </p>
  <p v-else-if="globals.midiAccess.status === 'error'" class="text-red-600">
    {{ globals.midiAccess.message }}
  </p>
  <p v-else-if="globals.midiAccess.status === 'granted' && globals.keyboardsDetected.length == 0">
    MIDI access is granted, but no input devices are visible to the browser.
    Check that the keyboard is connected, then try the button below. Also make
    sure another app (such as a DAW) is not holding the device.
  </p>

  <button v-if="globals.midiAccess.status !== 'granted'" class="ui tiny button" @click="enableMidi()">
    Enable MIDI access
  </button>
  <button v-else class="ui tiny button" @click="enableMidi()">
    Re-scan MIDI devices
  </button>

  <h5 v-if="globals.superUser">MIDI Keyboards configs available:</h5>
  <pre v-if="globals.superUser" class="mono-json">{{ stringify(globals.keyboardsAvailable) }}</pre>

  <div>
    <label class="mr-2">Switch Current MIDI Keyboard:</label>
    <select v-model="selectedKeyboard">
      <option v-for="option in optionsKeyboards" :key="option" v-bind:value="option">
        {{ option }}
      </option>
    </select>

    <div v-if="globals.superUser">
      <h5>Current MIDI Keyboard config:</h5>
      <p>globals.keyboard:</p>
      <pre>{{ globals.keyboard }}</pre>
    </div>

  </div>
</template>

<style scoped>

</style>
