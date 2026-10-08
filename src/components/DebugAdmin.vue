<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { globals } from '../../src/lib/globals.js'
import { audioStatus, recoverAudio } from '../../src/lib/audio/general-midi.js'
import { ping } from '../../src/lib/audio/general-midi-soundfont-player.js'

function wireGMSwitchUI() {
  // Toggle GM on/off
  var _switch = document.getElementById('switch-gm')  // should use ref but this works ok
  _switch.addEventListener('change', function (e) {
    console.log('switch-gm', e.target.value)
    globals.GM = (e.currentTarget.value == 1)
    if (globals.GM)
      document.broadcastEvent("authorise-gm-cmd", {})  // just plays a note to authorise
  })
}

// Live snapshot of the sound system, so a silent device can report where the
// failure is: a waiting audio state, samples still loading or failed, or a
// running system the device itself keeps silent (Silent Mode, volume, route).
const soundStatus = ref(null)
const soundMessage = ref('')
let soundTimer = null

function refreshSoundStatus() {
  try {
    soundStatus.value = audioStatus()
  }
  catch (error) {
    soundStatus.value = null
  }
}

async function testSound() {
  soundMessage.value = 'Waking sound…'
  // Full restart rather than a plain resume: this also clears the iOS state
  // where everything reports ready yet nothing is heard.
  const ready = await recoverAudio()
  refreshSoundStatus()
  if (!ready) {
    soundMessage.value = 'Sound is still waiting (suspended). Tap Play test sound again.'
    return
  }
  try {
    ping()
    soundMessage.value = 'Test note played. If you heard nothing, see the device notes below.'
  }
  catch (error) {
    soundMessage.value = 'Test note failed: ' + String(error && error.message ? error.message : error)
  }
}

onMounted(() => {
  wireGMSwitchUI() // no need to remove listener cos el is destroyed when component is destroyed
  refreshSoundStatus()
  soundTimer = setInterval(refreshSoundStatus, 1000)
})

onUnmounted(() => {
  if (soundTimer)
    clearInterval(soundTimer)
  soundTimer = null
})

</script>

<template>

  <!-- sub accordion for debug stuff -->
  <div class="ui fluid styled accordion" style="background-color: burlywood;">


    <div class="title">
      <i class="dropdown icon"></i>
      Sound
    </div>
    <div class="content">
      <p>Audio state: <strong>{{ soundStatus ? soundStatus.state : 'not started' }}</strong><span
          v-if="soundStatus">, sample rate {{ soundStatus.sampleRate }}</span>
        <button type="button" class="ui mini button" @click="refreshSoundStatus()">Refresh</button>
      </p>
      <div v-if="soundStatus">
        <p>Samples: jam {{ soundStatus.samples.jam ? 'ready' : 'loading' }}, chord
          {{ soundStatus.samples.chord ? 'ready' : 'loading' }}, bass
          {{ soundStatus.samples.bass ? 'ready' : 'loading' }}</p>
        <ul v-if="Object.keys(soundStatus.samples.errors).length > 0">
          <li v-for="(message, name) in soundStatus.samples.errors" :key="name">
            {{ name }} failed: {{ message }}
          </li>
        </ul>
      </div>
      <p>
        <button type="button" class="ui small primary button" @click="testSound()">Play test sound</button>
        <span v-if="soundMessage"> {{ soundMessage }}</span>
      </p>
      <p>On iPhone/iPad: if the state says running, the samples are ready, and the test still makes no
        sound while other apps are audible, the device itself is keeping it silent. Turn Silent Mode off in
        Control Center, turn the volume up, and disconnect Bluetooth or AirPlay output, then try the test again.</p>
    </div>

    <div class="title">
      <i class="dropdown icon"></i>
      Chord Trigger Map
    </div>
    <div class="content">
      <pre class="mono-json">{{ globals.getResolvedChordsConfig() }}</pre>
    </div>




    <div class="title">
      <i class="dropdown icon"></i>
      Scale Trigger Map
    </div>
    <div class="content">
      <pre class="mono-json">{{ globals.scaleTriggerMap }}</pre>
    </div>




    <div class="title">
      <i class="dropdown icon"></i>
      Project JSON
    </div>
    <div class="content">

      <div class="ui grid">
        <div class="ten wide column">
          Current Project: <b>{{ globals.project.name }}</b>
        </div>
        <div class="six wide column">
          <p class="mb-1">Number of chords: <code>{{ globals.project.chords.length }}</code></p>
          <p class="mb-1">Number of chordsTriggerMap entries:
            <code>{{ Object.keys(globals.chordTriggerMap).length }}</code>
            &nbsp; maxChordConfigs: <code>{{ globals.maxChordConfigs }}</code>
          </p>
        </div>
      </div>

      <pre class="mono-json">{{ globals.getProjectConfig() }}</pre>

    </div>



    <div class="title">
      <i class="dropdown icon"></i>
      Debug Variables
    </div>
    <div class="content">
      <p>keyboardsDetected: {{ globals.keyboardsDetected }}</p>
      <p>scaleFilteringEnabled: {{ globals.scaleFilteringEnabled }}</p>
      <p>scaleFilteringModificationSticky: {{ globals.scaleFilteringModificationSticky }}</p>

      <p>pendingNoteOffs:</p>
      <ul>
        <li v-for="(value, propertyName) in globals.pendingNoteOffs" :key="value">
          {{ propertyName }}: {{ value.allowedNote }}
          <span v-if="value.envelope">(GM, pitch: {{ value.pitch }}, velocity: {{ value.velocity }},
            duration: {{
                value.envelope.duration
            }}
            <!-- loop: {{ value.envelope.audioBufferSourceNode.loop }} -->
            )
          </span>
        </li>
      </ul>

      <p>pendingChordNoteOffs:</p>
      <ul>
        <li v-for="(value, propertyName) in globals.pendingChordNoteOffs" :key="value">
          {{ propertyName }}:
          <ul>
            <li v-for="noteOffInfo in value" :key="noteOffInfo">
              {{ noteOffInfo.allowedNote }}
              <span v-if="noteOffInfo.envelope">(GM, pitch: {{ noteOffInfo.pitch }}, velocity: {{
                  noteOffInfo.velocity
              }})</span>
            </li>
          </ul>
        </li>
      </ul>

      <p>pendingChordBassNoteOffs:</p>
      <ul>
        <li v-for="(value, propertyName) in globals.pendingChordBassNoteOffs" :key="value">
          {{ propertyName }}: {{ value.allowedNote }}
          <span v-if="value.envelope">(GM, pitch: {{ value.pitch }}, velocity: {{ value.velocity }},
            duration: {{
                value.envelope.duration
            }}
            <!-- loop: {{ value.envelope.audioBufferSourceNode.loop }} -->
            )
          </span>
        </li>
      </ul>

      <p>blackKeysDownMap: {{ globals.blackKeysDownMap }}</p>
      <p>blackShiftState: {{ globals.blackShiftState }}</p>
      <p>computer keyboard keyState: {{ globals.keyState }}</p>

      <h3>Log</h3>
      <p id="generalLog" style="font-family: 'Courier New', Courier, monospace;"></p>

    </div>




    <div class="title">
      <i class="dropdown icon"></i>
      MIDI
    </div>
    <div class="content">
      <p>midiAccess: <strong>{{ globals.midiAccess.status }}</strong> {{ globals.midiAccess.message }}</p>
      <p>keyboardsDetected: {{ globals.keyboardsDetected }}</p>
      <p>midiActivity seen: {{ globals.midiActivity.seen }}, last:
        {{ globals.midiActivity.lastState }} {{ globals.midiActivity.lastNote }}
        <template v-if="globals.midiActivity.lastInput">from {{ globals.midiActivity.lastInput }}</template>
      </p>
      <p v-if="globals.superUser">keyboardsAvailable:</p>
      <pre v-if="globals.superUser" class="mono-json">{{ globals.keyboardsAvailable }}</pre>
      <p>Current keyboard config:</p>
      <pre class="mono-json">{{ globals.keyboard }}</pre>
    </div>

    <div class="title">
      <i class="dropdown icon"></i>
      Volume
    </div>
    <div class="content">

      <label>GM Sound:</label>
      <webaudio-switch id="switch-gm" src="../knobs/switch_toggle.png" value="1" width="32" height="32"
        tooltip="Use internal General Midi sounds or output to your DAW via (mac) IAC Driver">
      </webaudio-switch>

      <ul>
        <li>master volume <input type="range" value="1.3" min="0.0" max="1.4" step="0.1"
            onchange="channelMaster.output.gain.setTargetAtTime(value,0,0.0001);"></li>
        <!-- <li>drum volume <input type="range" value="1.0" min="0.0" max="1.5" step="0.1" onchange="channelDrums.output.gain.setTargetAtTime(value,0,0.0001);"></li>
              <li>bass volume <input type="range" value="1.0" min="0.0" max="1.5" step="0.1" onchange="channelBass.output.gain.setTargetAtTime(value,0,0.0001);"></li>
              <li>guitar volume <input type="range" value="1.0" min="0.0" max="1.5" step="0.1" onchange="channelDistortion.output.gain.setTargetAtTime(value,0,0.0001);"></li> -->
        <li>echo <input type="range" value="0.0" min="0.0" max="1.5" step="0.1"
            onchange="reverberator.wet.gain.setTargetAtTime(value,0,0.0001);"></li>
        <li>compressor <input type="range" value="0.0" min="0.0" max="1.0" step="0.1"
            onchange="reverberator.compressorWet.gain.setTargetAtTime(value,0,0.0001);reverberator.compressorDry.gain.setTargetAtTime(1-value,0,0.0001);">
        </li>
        <li>compressor threshold <input type="range" value="-50" min="-100" max="0" step="10"
            onchange="reverberator.compressor.threshold.setValueAtTime(value, 0);"></li>
        <li>compressor knee <input type="range" value="40" min="0" max="40" step="5"
            onchange="reverberator.compressor.knee.setValueAtTime(value, 0)"></li>
        <li>compressor ratio <input type="range" value="12" min="1" max="20" step="1"
            onchange="reverberator.compressor.ratio.setValueAtTime(value, 0);"></li>
        <li>compressor attack <input type="range" value="0" min="0" max="1" step="0.01"
            onchange="reverberator.compressor.attack.setValueAtTime(value, 0);"></li>
        <li>compressor release <input type="range" value="0.25" min="0" max="1" step="0.01"
            onchange="reverberator.compressor.release.setValueAtTime(value, 0);"></li>
      </ul>
    </div>



  </div> <!-- end of debug accordion -->
</template>

<style scoped>

</style>
