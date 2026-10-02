<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { globals } from '@/lib/globals.js'
import { startRecording, stopRecording, clearTake } from '@/lib/midi/recorder.js'
import { startPlayback, stopPlayback, seekPlayback, takeDurationSec } from '@/lib/midi/playback.js'
import { downloadRecording } from '@/lib/midi/export-recording.js'

const rec = globals.recording

const chordCount = computed(() => rec.take.chords.length)
const jamCount = computed(() => rec.take.jam.length)
const noteCount = computed(() => chordCount.value + jamCount.value)
const canClear = computed(() => rec.hasTake || rec.isRecording || rec.playback.isPlaying)
const durationSec = computed(() => takeDurationSec(rec))

// The scrubber tracks the play head unless the user is dragging it.
const scrubbing = ref(false)
const scrubValue = ref(0)

watch(() => rec.playback.positionSec, (value) => {
  if (!scrubbing.value)
    scrubValue.value = value
}, { immediate: true })

watch(durationSec, () => {
  if (!scrubbing.value)
    scrubValue.value = rec.playback.positionSec || 0
})

function toggleRecord() {
  if (rec.isRecording)
    stopRecording()
  else
    startRecording()
}

function togglePlay() {
  if (rec.playback.isPlaying)
    stopPlayback(true)
  else
    startPlayback(0)
}

function onScrubInput(event) {
  scrubbing.value = true
  scrubValue.value = Number(event.target.value)
}

function onScrubChange(event) {
  scrubbing.value = false
  seekPlayback(Number(event.target.value))
}

function exportTake() {
  if (!rec.hasTake)
    return
  const name = globals.project.name ? `${globals.project.name}-take` : 'onekeyjam-take'
  downloadRecording(rec.take, name, rec.bpm, rec.ppq)
}

function clear() {
  clearTake()
}

function formatTime(sec) {
  const value = Math.max(0, sec || 0)
  const whole = Math.floor(value)
  const tenths = Math.floor((value - whole) * 10)
  const minutes = Math.floor(whole / 60)
  const seconds = whole % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
}

onUnmounted(() => {
  // Do not leave a recording or playback running when the user leaves the page.
  if (rec.isRecording)
    stopRecording()
  stopPlayback(true)
})
</script>

<template>
  <div class="ui container record-controls">
    <div class="ui segment">
      <div class="ui grid middle aligned">
        <div class="row">
          <div class="five wide column">
            <button
              class="ui large red button"
              :class="{ pulsing: rec.isRecording }"
              @click="toggleRecord"
            >
              <i class="circle icon"></i>
              {{ rec.isRecording ? 'Stop' : 'Record' }}
            </button>
            <span v-if="rec.isRecording" class="recording-label">
              <i class="red circle icon"></i> Recording
            </span>
          </div>

          <div class="seven wide column">
            <div class="ui small statistics">
              <div class="statistic">
                <div class="value">{{ jamCount }}</div>
                <div class="label">Solo notes</div>
              </div>
              <div class="statistic">
                <div class="value">{{ chordCount }}</div>
                <div class="label">Chord notes</div>
              </div>
              <div class="statistic">
                <div class="value">{{ rec.bpm }}</div>
                <div class="label">BPM</div>
              </div>
            </div>
          </div>

          <div class="four wide column right aligned">
            <button class="ui button" :class="{ disabled: !rec.hasTake }" :disabled="!rec.hasTake" @click="exportTake">
              <i class="download icon"></i> Export MIDI
            </button>
            <button class="ui basic button" :class="{ disabled: !canClear }" :disabled="!canClear" @click="clear">
              Clear
            </button>
          </div>
        </div>

        <div class="row">
          <div class="sixteen wide column">
            <div class="playback">
              <button
                class="ui icon button"
                :class="{ disabled: !rec.hasTake }"
                :disabled="!rec.hasTake"
                @click="togglePlay"
              >
                <i :class="rec.playback.isPlaying ? 'pause icon' : 'play icon'"></i>
              </button>
              <span class="time">{{ formatTime(scrubValue) }}</span>
              <input
                class="scrubber"
                type="range"
                min="0"
                :max="durationSec || 0"
                step="0.01"
                :value="scrubValue"
                :disabled="!rec.hasTake"
                @input="onScrubInput"
                @change="onScrubChange"
              />
              <span class="time">{{ formatTime(durationSec) }}</span>
            </div>
          </div>
        </div>

        <div class="row" v-if="!rec.isRecording && noteCount > 0">
          <div class="sixteen wide column">
            <div class="ui positive message">
              Take ready: {{ noteCount }} notes. Play it back or export it as a two-track MIDI file.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record-controls {
  margin-bottom: 1rem;
}

.recording-label {
  color: #db2828;
  font-weight: bold;
  margin-left: 0.5rem;
}

.ui.statistics .statistic {
  margin: 0 1.5rem 0 0;
}

.ui.statistics .statistic .value {
  font-size: 1.6rem;
}

.playback {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.playback .scrubber {
  flex: 1 1 auto;
}

.playback .time {
  font-variant-numeric: tabular-nums;
  color: #6b5a45;
  min-width: 3.5rem;
  text-align: center;
}
</style>
