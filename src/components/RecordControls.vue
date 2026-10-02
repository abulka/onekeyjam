<script setup>
import { computed, onUnmounted } from 'vue'
import { globals } from '@/lib/globals.js'
import { startRecording, stopRecording, clearTake } from '@/lib/midi/recorder.js'
import { downloadRecording } from '@/lib/midi/export-recording.js'

const rec = globals.recording

const chordCount = computed(() => rec.take.chords.length)
const jamCount = computed(() => rec.take.jam.length)
const noteCount = computed(() => chordCount.value + jamCount.value)
const canClear = computed(() => rec.hasTake || rec.isRecording)

function toggleRecord() {
  if (rec.isRecording)
    stopRecording()
  else
    startRecording()
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

onUnmounted(() => {
  // Do not leave a recording running when the user leaves the page.
  if (rec.isRecording)
    stopRecording()
})
</script>

<template>
  <div class="ui container record-controls">
    <div class="ui segment">
      <div class="ui grid middle aligned">
        <div class="row">
          <div class="four wide column">
            <button
              class="ui large button"
              :class="rec.isRecording ? 'red' : 'basic'"
              @click="toggleRecord"
            >
              <i class="circle icon"></i>
              {{ rec.isRecording ? 'Stop' : 'Record' }}
            </button>
            <span v-if="rec.isRecording" class="recording-label">
              <i class="red circle icon"></i> Recording
            </span>
          </div>

          <div class="eight wide column">
            <div class="ui small statistics">
              <div class="statistic">
                <div class="value">{{ chordCount }}</div>
                <div class="label">Chord notes</div>
              </div>
              <div class="statistic">
                <div class="value">{{ jamCount }}</div>
                <div class="label">Jam notes</div>
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
        <div class="row" v-if="!rec.isRecording && noteCount > 0">
          <div class="sixteen wide column">
            <div class="ui positive message">
              Take ready: {{ noteCount }} notes. Export it as a two-track MIDI file.
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
</style>
