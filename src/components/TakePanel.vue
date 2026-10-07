<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { globals } from '@/lib/globals.js'
import { startRecording, stopRecording, clearTake, captureTakeFromBackground } from '@/lib/midi/recorder.js'
import { startPlayback, stopPlayback, seekPlayback, previewVisuals, takeDurationSec } from '@/lib/midi/playback.js'
import { downloadRecording } from '@/lib/midi/export-recording.js'
import RecordingPianoRoll from './RecordingPianoRoll.vue'

const rec = globals.recording

// The take plus anything the chord sequencer is sounding right now, so the
// counts tick up live while a pattern plays (the pattern is merged into the
// take when it stops). Chords are counted once each: the chord tones and bass
// of one trigger share a trigger key and an onset, so group on those and snap
// to a 16th note in case the tones landed a tick or two apart.
const takeChordCount = computed(() => {
  const grid = Math.max(1, Math.round((rec.ppq || 480) / 4))
  const chords = new Set()
  for (const note of rec.take.chords) {
    const onset = Math.round(note.startTick / grid)
    const trigger = typeof note.playedMidi === 'number' ? note.playedMidi : '?'
    chords.add(`${trigger}:${onset}`)
  }
  return chords.size
})
const chordCount = computed(() => takeChordCount.value + rec.live.chords)
const jamCount = computed(() => rec.take.jam.length + rec.live.jam)
const canClear = computed(() => rec.hasTake || rec.isRecording || rec.playback.isPlaying)
const durationSec = computed(() => takeDurationSec(rec))

// Hidden background capture: the last few minutes of playing are kept so they
// can be recovered even though Record was never pressed.
const background = globals.recording.background
const canCapture = computed(() => background.enabled && !rec.isRecording && background.available)
const backgroundWindowLabel = computed(() => formatWindow(background.windowSec))
const readyLabel = computed(() => `${background.noteCount} note${background.noteCount === 1 ? '' : 's'} ready`)

function formatWindow(sec) {
  const value = Number(sec) || 0
  if (value < 60)
    return `${value}s`
  return `${Math.round(value / 60)} min`
}

function showToast(message, className) {
  $('body').toast({ message, displayTime: className === 'teal' ? 3500 : 2500, class: className })
}

function requestCapture() {
  if (!canCapture.value)
    return
  // Capture overwrites any existing take straight away, with no confirmation,
  // so recovering a doodle stays a single click and the result is a toast.
  const result = captureTakeFromBackground()
  if (result.ok)
    showToast(`Flashback Capture recovered ${result.noteCount} note${result.noteCount === 1 ? '' : 's'}, replacing the previous take.`, 'teal')
  else if (result.reason === 'empty')
    showToast('Nothing has been played in the capture window yet.', 'brown')
  else if (result.reason === 'disabled')
    showToast('Background capture is turned off in Settings.', 'brown')
}

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

// Re-draw the keyboard when the highlight mode changes while parked.
watch(() => rec.playback.highlightMode, () => {
  previewVisuals(rec.playback.positionSec)
})

function toggleRecord() {
  if (rec.isRecording)
    stopRecording()
  else
    startRecording()
}

function togglePlay() {
  if (rec.playback.isPlaying) {
    // Pause, keeping the play head where it is so play resumes from there.
    stopPlayback(false)
    return
  }
  // Start from the scrub position, unless it is already at the end.
  const atEnd = rec.playback.durationSec > 0
    && rec.playback.positionSec >= rec.playback.durationSec - 1e-6
  startPlayback(atEnd ? 0 : rec.playback.positionSec)
}

function rewind() {
  // Stop and return the play head to the start.
  stopPlayback(true)
}

function onScrubInput(event) {
  scrubbing.value = true
  rec.playback.isScrubbing = true
  scrubValue.value = Number(event.target.value)
  // Show the notes at the dragged position straight away, not only on release.
  previewVisuals(scrubValue.value)
}

function onScrubChange(event) {
  scrubbing.value = false
  rec.playback.isScrubbing = false
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

// Exposed so the Perform page's Actions menu can drive the same controls.
defineExpose({ toggleRecord, exportTake, captureTake: requestCapture })
</script>

<template>
  <div class="ui container record-controls">
    <div class="ui segment">
      <div class="ui grid middle aligned">
        <div class="row">
          <div class="six wide column">
            <div class="record-actions">
              <button
                class="ui large red button"
                :class="{ pulsing: rec.isRecording }"
                @click="toggleRecord"
              >
                <i class="circle icon"></i>
                {{ rec.isRecording ? 'Stop' : 'Record' }}
              </button>
              <button
                class="ui teal button capture-button"
                :class="{ disabled: !canCapture }"
                :disabled="!canCapture"
                :title="`Flashback Capture: recover the last ${backgroundWindowLabel} of playing${background.available ? ` (${readyLabel})` : ''}, including the pattern chords, even though Record was not pressed`"
                @click="requestCapture"
              >
                <i class="undo icon"></i> Flashback Capture
                <span
                  v-if="background.enabled && background.available"
                  class="ui mini circular label capture-count"
                >{{ background.noteCount }}</span>
              </button>
              <span v-if="rec.isRecording" class="recording-label">
                <i class="red circle icon"></i> Recording
              </span>
            </div>
          </div>

          <div class="six wide column">
            <div class="ui small statistics">
              <div class="statistic">
                <div class="value">{{ jamCount }}</div>
                <div class="label">Solo notes</div>
              </div>
              <div class="statistic">
                <div class="value">{{ chordCount }}</div>
                <div class="label">Chords</div>
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
                title="Rewind to start"
                @click="rewind"
              >
                <i class="step backward icon"></i>
              </button>
              <button
                class="ui icon button"
                :class="{ disabled: !rec.hasTake }"
                :disabled="!rec.hasTake"
                :title="rec.playback.isPlaying ? 'Pause' : 'Play'"
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
              <div class="highlight-mode-block">
                <label class="highlight-mode" title="Which keys light up when playing back this recording">
                  Keys (playback)
                  <select v-model="rec.playback.highlightMode" :disabled="!rec.hasTake"
                    aria-label="Which keys light up when playing back this recording">
                    <option value="played">Played keys (red)</option>
                    <option value="sounding">Sounding notes (blue)</option>
                    <option value="both">Sounding + played</option>
                  </select>
                </label>
                <p class="highlight-caption">
                  Which keys light up when playing back this recording. Live playing and the sequencer always light the single trigger or solo key.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ui divider take-editor-divider"></div>
      <h4 class="take-editor-heading">Edit the take</h4>
      <RecordingPianoRoll />
    </div>
  </div>
</template>

<style scoped>
.record-controls {
  margin-bottom: 1rem;
}

/* Match the app's tan/green panel style instead of Fomantic's bright white. */
.record-controls .ui.segment {
  background-color: rgba(240, 195, 134, 0.543);
  border-color: #2e8b57;
  box-shadow: chocolate 0 0 10px;
}

.take-editor-divider {
  margin: 0.75rem 0 0.5rem;
}

.take-editor-heading {
  margin: 0 0 0.25rem;
  color: #4a3d2a;
}

/* Record and Capture share one row so they stay aligned with each other. */
.record-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.record-actions .capture-button {
  white-space: nowrap;
}

.capture-count {
  margin-left: 0.35rem;
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

.playback .highlight-mode {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: #333;
  white-space: nowrap;
}

.highlight-mode-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  max-width: 22rem;
  flex: 0 1 auto;
}

.playback .highlight-mode select {
  padding: 1px 3px;
  font-size: 0.78rem;
  color: #333;
  background: #fff;
  border: 1px solid #999;
  border-radius: 4px;
}

.highlight-caption {
  margin: 0;
  font-size: 0.75rem;
  color: #6b5a45;
  text-align: right;
  line-height: 1.2;
}
</style>
