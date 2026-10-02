<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { globals } from "@/lib/globals.js"
import { Note } from '@/lib/midi/webmidi.js'
import { Note as TonalNote } from '@tonaljs/tonal'
import { indexToNote } from "@/lib/note-tools.js"
import { audioContext } from '@/lib/audio/general-midi.js'
import { onNoteOn } from "@/lib/midi/wire-events.js"
import { auditionMidiNote, auditionChord, broadcastLiveNote } from '@/lib/midi/audition-note.js'
import { commitTakeEdit } from '@/lib/midi/recorder.js'
import { patternToTakeNotes } from '@/lib/sequencer-notes.js'
import { savePattern, loadPattern, clearPattern } from '@/lib/midi/pattern-store.js'
import PianoRollPanel from './PianoRollPanel.vue'

// The pattern sequencer. Renders on the shared PianoRollPanel. It is mainly a
// chord-sequence loop, with the option to add single notes too.

const PANEL_TIMEBASE = 16  // ticks per whole note; one 4/4 bar = one whole note
const DEFAULT_BARS = 4

const panel = ref(null)
const inputSequencerPersist = ref(null)
const includeInRecording = ref(false)

let patternPlaying = false
let saveTimer = null
let visualTimers = []

function clearVisualTimers() {
  for (const id of visualTimers)
    clearTimeout(id)
  visualTimers = []
}

// Light a note on the main keyboard and the strips when it is due, rather than
// when the widget's preload calls us ahead of time.
function scheduleLiveNote(midi, startSec, endSec) {
  if (typeof midi !== 'number' || !audioContext)
    return
  const now = audioContext.currentTime
  const onDelay = Math.max(0, (startSec - now) * 1000)
  const offDelay = Math.max(onDelay + 20, (endSec - now) * 1000)
  visualTimers.push(setTimeout(() => broadcastLiveNote(midi, true, 'pattern'), onDelay))
  visualTimers.push(setTimeout(() => broadcastLiveNote(midi, false, 'pattern'), offDelay))
}

// The widget's rows are relative to C4 (60), so a sounding MIDI note lights the
// row the sequencer maps it to: row = midi - rowOffset.
const rowOffset = computed(() => 12 * globals.keyboard.lhTriggerOctave + 12 - 60)

function rowToSoundingMidi(row) {
  const noteName = indexToNote(row - 60, globals.keyboard.lhTriggerOctave)
  const midi = TonalNote.midi(noteName)
  return typeof midi === 'number' ? midi : undefined
}

// Expand a pattern row into the notes it should sound in the take: a chord
// trigger becomes its chord notes (and bass), anything else a single raw note.
// `playedMidi` is the trigger key, matching live chord recording.
function rowToTakeNotes(row) {
  const triggerNote = indexToNote(row - 60, globals.keyboard.lhTriggerOctave)
  const triggerMidi = TonalNote.midi(triggerNote)
  const config = globals.chordTriggerMap[triggerNote]
  if (!config)
    return typeof triggerMidi === 'number' ? [{ midi: triggerMidi, playedMidi: triggerMidi }] : []

  const out = []
  const playedMidi = typeof triggerMidi === 'number' ? triggerMidi : undefined
  if (!globals.playBassOnly) {
    for (const name of config.chordNotes || []) {
      if (!globals.playChordBass && name === config.bassNote)
        continue
      const midi = TonalNote.midi(name)
      if (typeof midi === 'number')
        out.push({ midi, playedMidi: playedMidi ?? midi })
    }
  }
  if (!globals.playChordOnly && config.bassNote) {
    const midi = TonalNote.midi(config.bassNote)
    if (typeof midi === 'number')
      out.push({ midi, playedMidi: playedMidi ?? midi })
  }
  return out
}

// ── Audition ───────────────────────────────────────────────────────────────

function onAudition({ midi: row }) {
  // Same rule the pattern uses when it plays: a chord trigger plays its chord,
  // anything else plays the single (raw) note. Only the trigger key is lit
  // (not the chord tones), matching how a real chord trigger behaves.
  const triggerNote = indexToNote(row - 60, globals.keyboard.lhTriggerOctave)
  const triggerMidi = TonalNote.midi(triggerNote)
  const config = globals.chordTriggerMap[triggerNote]
  if (config) {
    const notes = Array.isArray(config.chordNotes) ? config.chordNotes : []
    if (notes.length > 0)
      auditionChord(notes, config.bassNote, typeof triggerMidi === 'number' ? triggerMidi : undefined)
  }
  else {
    const sounding = rowToSoundingMidi(row)
    if (sounding != null)
      auditionMidiNote(sounding)
  }
}

// ── Playback ───────────────────────────────────────────────────────────────

function sequencerPlay(e, from = 'beginning') {
  if (audioContext && audioContext.state === 'suspended' && typeof audioContext.resume === 'function')
    audioContext.resume()
  const starttick = (from == 'beginning') ? 0 : undefined
  panel.value.play(audioContext, function (options) {
    // options: {t:noteOnTime, g:noteOffTime, n:noteNumber}
    const allowedNote = indexToNote(options.n - 60, globals.keyboard.lhTriggerOctave)
    const simulatedEvent = {
      note: new Note(allowedNote, { attack: 0.5 }),
      duration: options.g - options.t,
      when: options.t,
    }
    // The pattern drives chords and scale changes, but is never captured live;
    // it is merged into the take on stop instead.
    const wasSuppressed = globals.recording.suppressCapture
    globals.recording.suppressCapture = true
    try {
      onNoteOn(simulatedEvent)
    }
    finally {
      globals.recording.suppressCapture = wasSuppressed
    }
    // Light the played key on the main keyboard and the strips, in time.
    scheduleLiveNote(TonalNote.midi(allowedNote), options.t, options.g)
  }, starttick)
}

function sequencerResume(e) {
  sequencerPlay(e, 'current')
}

function sequencerStop() {
  panel.value.stop()
  clearVisualTimers()
  saveNow()
}

// ── Persistence ────────────────────────────────────────────────────────────

function panelState() {
  const el = panel.value
  const loop = el ? el.getLoop() : { start: 0, end: PANEL_TIMEBASE * DEFAULT_BARS }
  return {
    mml: el ? el.getMML() : '',
    markstart: loop.start,
    markend: loop.end,
    tempo: 100,
    enabled: includeInRecording.value,
  }
}

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => savePattern(panelState()), 500)
}

function saveNow() {
  clearTimeout(saveTimer)
  savePattern(panelState())
}

function loadFromProject() {
  const entry = getDefaultEntry()
  panel.value.setMML(entry.mml || '')
  const start = Number.isFinite(entry.markstart) ? entry.markstart : 0
  const end = Number.isFinite(entry.markend) && entry.markend > start
    ? entry.markend
    : PANEL_TIMEBASE * DEFAULT_BARS
  panel.value.setLoop(start, end)
  includeInRecording.value = !!entry.enabled
}

function getDefaultEntry() {
  let entry
  if (globals.project.chordSequences != undefined && globals.project.chordSequences.default != undefined) {
    entry = globals.project.chordSequences.default
  }
  else {
    globals.project.chordSequences = {}
    entry = { mml: '', tempo: 99 }
    globals.project.chordSequences.default = entry
  }
  return entry
}

function sequencerSaveToProject() {
  const state = panelState()
  const entry = getDefaultEntry()
  entry.mml = state.mml
  entry.markstart = state.markstart
  entry.markend = state.markend
  entry.enabled = state.enabled
  saveNow()
}

function sequencerLoadFromProject() {
  loadFromProject()
}

function sequencerSave() {
  inputSequencerPersist.value.value = panel.value.getMML()
}

function sequencerLoad() {
  panel.value.setMML(inputSequencerPersist.value.value)
  saveNow()
}

function sequencerPatternAscendingWhiteNotes() {
  const s = "t100o4l8c4d4e4f4g4a4b4o5c4d4e4f4g4a4b4o6c4d4e4f4g4a4b4o7c4d4e4f4g4a4b4o8c4d4e4f4g4a4b4"
  inputSequencerPersist.value.value = s
  panel.value.setMML(s)
  saveNow()
}

// ── Pattern actions ────────────────────────────────────────────────────────

/** Set the loop markers to the first and last notes, rounded out to whole bars. */
function fitLoopToNotes() {
  const notes = panel.value.getNotes()
  if (!notes || notes.length === 0)
    return
  let min = Infinity
  let max = -Infinity
  for (const note of notes) {
    min = Math.min(min, note.t)
    max = Math.max(max, note.t + note.g)
  }
  const start = Math.floor(min / PANEL_TIMEBASE) * PANEL_TIMEBASE
  let end = Math.ceil(max / PANEL_TIMEBASE) * PANEL_TIMEBASE
  if (end <= start)
    end = start + PANEL_TIMEBASE
  panel.value.setLoop(start, end)
  saveNow()
}

function clearPatternAndLoop() {
  panel.value.setMML('t100o4l8')
  panel.value.setLoop(0, PANEL_TIMEBASE * DEFAULT_BARS)
  clearPattern()
}

// ── Recording integration ──────────────────────────────────────────────────

function startPatternForRecording() {
  if (patternPlaying)
    return
  const notes = panel.value ? panel.value.getNotes() : []
  if (notes.length === 0)
    return
  patternPlaying = true
  sequencerPlay(null, 'beginning')
}

function stopPatternForRecording() {
  if (!patternPlaying)
    return
  patternPlaying = false
  panel.value.stop()
  clearVisualTimers()
}

function mergePatternIntoTake() {
  const rec = globals.recording
  const notes = panel.value ? panel.value.getNotes() : []
  if (!notes || notes.length === 0)
    return
  const loop = panel.value.getLoop()
  const spt = 60 / rec.bpm / rec.ppq
  const recordedTicks = Math.round((rec.lastRecordingSeconds || 0) / spt)
  const noteTicks = Math.round(rec.playback.durationSec / spt)
  const totalTakeTicks = Math.max(recordedTicks, noteTicks)
  if (totalTakeTicks <= 0)
    return
  const merged = patternToTakeNotes(notes, {
    ppq: rec.ppq,
    panelTimebase: PANEL_TIMEBASE,
    loopStart: loop.start,
    loopEnd: loop.end,
    totalTakeTicks,
    rowToNotes: rowToTakeNotes,
  })
  if (merged.length === 0)
    return
  rec.take.chords.push(...merged)
  commitTakeEdit()
}

function onRecordingStarted() {
  saveNow()
  if (includeInRecording.value)
    startPatternForRecording()
}

function onRecordingStopped() {
  const wasPlaying = patternPlaying
  stopPatternForRecording()
  if (wasPlaying && includeInRecording.value)
    mergePatternIntoTake()
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(() => {
  const saved = loadPattern()
  if (saved && saved.mml) {
    panel.value.setMML(saved.mml)
    const end = Number.isFinite(saved.markend) && saved.markend > saved.markstart
      ? saved.markend
      : PANEL_TIMEBASE * DEFAULT_BARS
    panel.value.setLoop(Number.isFinite(saved.markstart) ? saved.markstart : 0, end)
    includeInRecording.value = !!saved.enabled
  }
  else {
    loadFromProject()
  }
  document.addEventListener('recording-started', onRecordingStarted)
  document.addEventListener('recording-stopped', onRecordingStopped)
})

onUnmounted(() => {
  clearTimeout(saveTimer)
  clearVisualTimers()
  document.removeEventListener('recording-started', onRecordingStarted)
  document.removeEventListener('recording-stopped', onRecordingStopped)
})
</script>

<template>
  <!-- doco https://github.com/g200kg/webaudio-pianoroll -->

  <PianoRollPanel
    ref="panel"
    :timebase="16"
    :tempo="100"
    :octadj="-1"
    :initial-bars="1"
    :initial-y-range="16"
    :initial-y-offset="60"
    :min-width="500"
    :row-offset="rowOffset"
    @audition="onAudition"
    @change="scheduleSave"
  />

  <br>
  <button @click="sequencerPlay()" class="ui button">Play</button>
  <button @click="sequencerStop()" class="ui button">Stop</button>
  <button @click="sequencerResume()" class="ui button">Resume</button>
  <button @click="fitLoopToNotes()" class="ui button">Fit loop to notes</button>
  <button @click="clearPatternAndLoop()" class="ui button">Clear pattern</button>

  <br><br>
  <label class="include-toggle">
    <input type="checkbox" v-model="includeInRecording" @change="saveNow">
    Include in recording (loop the pattern while you record a solo)
  </label>

  <br><br>
  <button @click="sequencerSaveToProject()" class="ui button">Save To Project</button>
  <button @click="sequencerLoadFromProject()" class="ui button">Load From Project</button>

  <div>
    <input ref="inputSequencerPersist" type="text" style="width: 100%; font-size: larger; margin-top: 0.5em;"
      placeholder="" value="t100o4l8c1d1c1d1e1f1g1g1" />
  </div>
  <button @click="sequencerSave()" class="ui button">Save</button>
  <button @click="sequencerLoad()" class="ui button">Load</button>
  <button @click="sequencerPatternAscendingWhiteNotes()" class="ui button">Pattern Ascending White Notes</button>

</template>

<style scoped>
.include-toggle {
  font-size: 0.85rem;
  color: #333;
  user-select: none;
}
</style>
