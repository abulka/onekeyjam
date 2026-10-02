<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { globals } from '@/lib/globals.js'
import PianoRollPanel from './PianoRollPanel.vue'
import { takeToPanelNotes, panelNotesToTakeNotes } from '@/lib/sequencer-notes.js'
import { commitTakeEdit } from '@/lib/midi/recorder.js'
import { auditionMidiNote } from '@/lib/midi/audition-note.js'

// Shows the current recording in a piano roll and lets it be edited. One panel
// with a track toggle: Chords and Solo are editable; Both is a merged preview.

const rec = globals.recording
const panel = ref(null)
const activeTrack = ref('both')

// Set while we write an edit back to the take, so the load watcher does not
// immediately reload the panel and fight the user's drag.
let suppressReload = false

const ppq = computed(() => rec.ppq || 480)
const bpm = computed(() => rec.bpm || 120)
const panelTimebase = computed(() => ppq.value * 4)
const editable = computed(() => activeTrack.value !== 'both')

const COLORS = { chords: '#d94a3d', jam: '#3d6fd9', both: '#7a4fd0' }
const noteColor = computed(() => COLORS[activeTrack.value] || COLORS.both)

function tracksForActive() {
  return activeTrack.value === 'both' ? ['chords', 'jam'] : [activeTrack.value]
}

// Seconds -> widget ticks. A whole note is four beats, so 240 / bpm seconds
// per whole note at this tempo.
function secondsToPanelTicks(seconds) {
  return seconds * panelTimebase.value * bpm.value / 240
}

function barEndTick() {
  const bar = panelTimebase.value * 4  // 4/4
  const ticks = secondsToPanelTicks(rec.playback.durationSec)
  return Math.max(bar, Math.ceil(ticks / bar) * bar)
}

function currentPanelNotes() {
  return takeToPanelNotes(rec.take, {
    ppq: ppq.value,
    panelTimebase: panelTimebase.value,
    tracks: tracksForActive(),
  })
}

async function loadFromTake() {
  const el = panel.value
  if (!el)
    return
  const notes = currentPanelNotes()
  await el.setNotes(notes)
  el.setLoop(0, barEndTick())
  await el.fitToNotes(notes)
  el.setCursor(secondsToPanelTicks(rec.playback.positionSec))
}

async function onChange({ notes }) {
  if (!editable.value)
    return
  const track = activeTrack.value
  const takeNotes = panelNotesToTakeNotes(notes, { ppq: ppq.value, panelTimebase: panelTimebase.value })
  suppressReload = true
  rec.take[track] = takeNotes
  commitTakeEdit()
  await nextTick()
  suppressReload = false
}

function onAudition({ midi }) {
  auditionMidiNote(midi)
}

function setTrack(track) {
  activeTrack.value = track
}

watch(activeTrack, loadFromTake)
watch(() => [rec.hasTake, rec.playback.durationSec, ppq.value], () => {
  if (!suppressReload)
    loadFromTake()
})
watch(() => rec.playback.positionSec, (seconds) => {
  if (panel.value)
    panel.value.setCursor(secondsToPanelTicks(seconds))
})

onMounted(loadFromTake)
</script>

<template>
  <div class="recording-piano-roll">
    <div class="ui small buttons track-toggle">
      <button class="ui button" :class="{ active: activeTrack === 'chords' }" @click="setTrack('chords')">Chords</button>
      <button class="ui button" :class="{ active: activeTrack === 'jam' }" @click="setTrack('jam')">Solo</button>
      <button class="ui button" :class="{ active: activeTrack === 'both' }" @click="setTrack('both')">Both</button>
    </div>
    <button class="ui basic small button" @click="loadFromTake">
      <i class="sync icon"></i> Refresh from take
    </button>
    <span class="track-hint" v-if="editable">Pick a track and drag to edit; changes are saved to the take.</span>
    <span class="track-hint" v-else>Choose Chords or Solo to edit. Both is a merged preview.</span>

    <PianoRollPanel
      ref="panel"
      :timebase="panelTimebase"
      :tempo="bpm"
      :editable="editable"
      :note-color="noteColor"
      :initial-bars="8"
      @change="onChange"
      @audition="onAudition"
    />
  </div>
</template>

<style scoped>
.recording-piano-roll {
  padding-top: 0.25rem;
}

.track-toggle {
  margin-right: 0.5rem;
}

.track-toggle .button.active {
  background-color: #7c6b45;
  color: #fff;
}

.track-hint {
  font-size: 0.78rem;
  color: #4a3d2a;
  margin-left: 0.5rem;
}
</style>
