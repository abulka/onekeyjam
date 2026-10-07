<script setup>
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { globals } from "@/lib/globals.js"
import { Note } from '@/lib/midi/webmidi.js'
import { Note as TonalNote } from '@tonaljs/tonal'
import { indexToNote, indexToWhiteNote } from "@/lib/note-tools.js"
import { resolveTriggerNote } from "@/lib/resolveTriggerNote.js"
import { audioContext } from '@/lib/audio/general-midi.js'
import { onNoteOnSequenced } from "@/lib/midi/wire-events.js"
import { clearPendingChordState } from "@/lib/midi/play-chord.js"
import { auditionMidiNote, auditionChord, broadcastLiveNote } from '@/lib/midi/audition-note.js'
import { commitTakeEdit } from '@/lib/midi/recorder.js'
import { patternToTakeNotes } from '@/lib/sequencer-notes.js'
import { triggerRowCountFor } from '@/lib/demo-pattern.js'
import PianoRollPanel from './PianoRollPanel.vue'

// The pattern sequencer. Renders on the shared PianoRollPanel. The pattern is
// part of the current project (`globals.project.chordSequences.default`), so it
// loads when a project loads and is saved when the project is saved. There is no
// separate device-level copy.

const PANEL_TIMEBASE = 16  // ticks per whole note; one 4/4 bar = one whole note
const DEFAULT_BARS = 4

const panel = ref(null)
const includeInRecording = ref(false)

// Exposed state: whether the widget is playing, and whether the pattern has any
// notes (so the Perform page's Actions menu can label and gate its items).
const isPlaying = ref(false)
const noteCount = ref(0)
const hasNotes = computed(() => noteCount.value > 0)

let patternPlaying = false
let saveTimer = null
let visualTimers = []
// Debounces the loop restart when the global BPM changes mid-play.
let bpmRestartTimer = null
// Set while a project's pattern is being loaded, so the edits that the load
// itself produces (allowed-row stripping, loop fitting) are not written back.
let suppressProjectSave = false

function refreshNoteCount() {
  noteCount.value = panel.value ? panel.value.getNotes().length : 0
}

// The widget applies MML on its next tick, so recount just after the call.
function scheduleCountRefresh() {
  setTimeout(refreshNoteCount, 0)
}

function onPanelChange() {
  refreshNoteCount()
  if (suppressProjectSave)
    return
  // Keep the loop covering the notes unless the user has moved a marker.
  if (!loopManuallySet.value)
    fitLoopToNotes(false)
  scheduleProjectPatternSave()
}

// A loop marker was dragged: stop auto-fitting from now on.
function onLoopChange() {
  loopManuallySet.value = true
  if (!suppressProjectSave)
    saveProjectPatternNow()
}

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

// The white trigger keys starting in the chord-trigger octave (C..B) and
// continuing into higher octaves when more chords are assigned. Notes may only
// be entered on these rows, whether or not a chord is assigned yet. Small
// songs keep seven rows so there is room to grow; larger songs extend rather
// than dropping chords.
const triggerRowCount = computed(() => {
  const allocated = globals.chordTriggerMap ? Object.keys(globals.chordTriggerMap).length : 0
  return triggerRowCountFor(allocated)
})
const triggerRowsInfo = computed(() => {
  const info = []
  const off = rowOffset.value
  for (let i = 0; i < triggerRowCount.value; i++) {
    const note = resolveTriggerNote(indexToWhiteNote(i))
    const midi = TonalNote.midi(note)
    if (typeof midi !== 'number')
      continue
    const row = midi - off
    if (row < 0 || row > 127)
      continue
    const config = globals.chordTriggerMap ? globals.chordTriggerMap[note] : undefined
    info.push({ row, note, chord: config && config.chord ? config.chord : '' })
  }
  return info
})
const triggerRows = computed(() => triggerRowsInfo.value.map(item => item.row))
// Label every trigger row: the chord name when assigned, otherwise a prompt.
const rowLabels = computed(() => {
  const labels = {}
  for (const item of triggerRowsInfo.value)
    labels[item.row] = item.chord
      ? { text: item.chord, assigned: true }
      : { text: 'no chord', assigned: false }
  return labels
})

// True once the user has dragged a loop marker by hand; while false the loop is
// kept fitted to the notes.
const loopManuallySet = ref(false)

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

/** Run a note-on without letting the recorder capture the pattern. */
function runSuppressed(fn) {
  const wasSuppressed = globals.recording.suppressCapture
  globals.recording.suppressCapture = true
  try {
    fn()
  }
  finally {
    globals.recording.suppressCapture = wasSuppressed
  }
}

// One note from the widget's play loop. The widget calls this ahead of time
// (its ~1s preload) with the note's real time in `options.t`, so anything that
// must line up with the sound is scheduled for `options.t` rather than run now.
function onPatternNote(options) {
  // options: {t: note on time, g: note off time, n: note number}
  const allowedNote = indexToNote(options.n - 60, globals.keyboard.lhTriggerOctave)
  const simulatedEvent = {
    note: new Note(allowedNote, { attack: 0.5 }),
    duration: options.g - options.t,
    when: options.t,
  }

  // Light the played key on the main keyboard and the strips, in time.
  scheduleLiveNote(TonalNote.midi(allowedNote), options.t, options.g)

  const isTrigger = globals.enableLhChordTriggers && (allowedNote in globals.chordTriggerMap)
  if (isTrigger) {
    // Count this chord for the Record section's live "Chords" readout (it is
    // merged into the take on stop).
    if (rowToTakeNotes(options.n).length > 0)
      globals.recording.live.chords += 1
    // playChord schedules the chord audio for `when` now and defers the
    // scale/chord state to `when` too (see deferStateToWhen).
    runSuppressed(() => onNoteOnSequenced(simulatedEvent))
    return
  }

  // A single note (an unassigned trigger row): play it at its real time.
  globals.recording.live.jam += 1
  const delayMs = Math.max(0, (options.t - audioContext.currentTime) * 1000)
  const play = () => runSuppressed(() => onNoteOnSequenced(simulatedEvent))
  if (delayMs > 8)
    visualTimers.push(setTimeout(play, delayMs))
  else
    play()
}

function resetLiveCounts() {
  globals.recording.live.chords = 0
  globals.recording.live.jam = 0
}

// Cancel the pattern's pending visual and deferred-state timers.
function clearPatternTimers() {
  clearVisualTimers()
  clearPendingChordState()
}

function startPatternPlayback(starttick) {
  panel.value.play(audioContext, onPatternNote, starttick)
}

function sequencerPlay(e, from = 'beginning') {
  if (audioContext && audioContext.state === 'suspended' && typeof audioContext.resume === 'function')
    audioContext.resume()
  clearTimeout(bpmRestartTimer)
  bpmRestartTimer = null
  clearPatternTimers()
  resetLiveCounts()
  const starttick = (from == 'beginning') ? 0 : undefined
  startPatternPlayback(starttick)
  isPlaying.value = true
}

function sequencerResume(e) {
  sequencerPlay(e, 'current')
}

function sequencerStop() {
  panel.value.stop()
  isPlaying.value = false
  clearTimeout(bpmRestartTimer)
  bpmRestartTimer = null
  clearPatternTimers()
  resetLiveCounts()
  saveProjectPatternNow()
}

// The widget pre-schedules ~1s ahead, so a tempo change would otherwise take a
// second to be heard. Restart the loop from its current position instead.
function scheduleBpmRestart() {
  clearTimeout(bpmRestartTimer)
  bpmRestartTimer = setTimeout(() => {
    bpmRestartTimer = null
    if (!isPlaying.value)
      return
    panel.value.stop()
    clearPatternTimers()
    startPatternPlayback(undefined)  // undefined resumes from the widget's cursor
  }, 150)
}

watch(() => globals.recording.bpm, () => {
  if (isPlaying.value)
    scheduleBpmRestart()
})

/** Play the pattern from the beginning, but only if it has any notes. */
function playIfHasNotes() {
  refreshNoteCount()
  if (!hasNotes.value)
    return
  sequencerPlay(null, 'beginning')
}

// ── Persistence (the pattern belongs to the current project) ────────────────

function panelState() {
  const el = panel.value
  const loop = el ? el.getLoop() : { start: 0, end: PANEL_TIMEBASE * DEFAULT_BARS }
  return {
    mml: el ? el.getMML() : '',
    markstart: loop.start,
    markend: loop.end,
    tempo: globals.recording.bpm,
    enabled: includeInRecording.value,
    loopManual: loopManuallySet.value,
  }
}

function getDefaultEntry() {
  let entry
  if (globals.project.chordSequences != undefined && globals.project.chordSequences.default != undefined) {
    entry = globals.project.chordSequences.default
  }
  else {
    globals.project.chordSequences = {}
    entry = { mml: '', tempo: globals.recording.bpm }
    globals.project.chordSequences.default = entry
  }
  return entry
}

/** Copy the sequencer's current state into the project's chord sequence. */
function writeProjectPattern() {
  clearTimeout(saveTimer)
  const state = panelState()
  const entry = getDefaultEntry()
  entry.mml = state.mml
  entry.markstart = state.markstart
  entry.markend = state.markend
  entry.tempo = state.tempo
  entry.enabled = state.enabled
  entry.loopManual = state.loopManual
}

function scheduleProjectPatternSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(writeProjectPattern, 500)
}

function saveProjectPatternNow() {
  clearTimeout(saveTimer)
  writeProjectPattern()
}

/**
 * One-time move of a pattern saved by the old device-level store into the
 * project, so upgrading users do not lose their last pattern.
 * @param {object} entry
 */
function migrateDevicePattern(entry) {
  if (entry.mml)
    return
  try {
    const raw = localStorage.getItem('onekeyjam.pattern')
    if (!raw)
      return
    const data = JSON.parse(raw)
    if (data && data.version === 1 && typeof data.mml === 'string' && data.mml) {
      entry.mml = data.mml
      if (Number.isFinite(data.markstart))
        entry.markstart = data.markstart
      if (Number.isFinite(data.markend))
        entry.markend = data.markend
      entry.enabled = !!data.enabled
      entry.loopManual = !!data.loopManual
    }
    localStorage.removeItem('onekeyjam.pattern')
  }
  catch (error) {
    // Ignore a corrupt legacy value.
  }
}

/** Load the current project's pattern into the sequencer. */
async function loadPatternFromProject() {
  clearTimeout(saveTimer)
  suppressProjectSave = true
  try {
    const entry = getDefaultEntry()
    migrateDevicePattern(entry)
    await panel.value.setMML(entry.mml || '')
    applyLoadedLoop(entry.markstart, entry.markend, entry.loopManual)
    includeInRecording.value = !!entry.enabled
    scheduleCountRefresh()
    await panel.value.fitToNotes()
  }
  finally {
    suppressProjectSave = false
  }
}

async function onProjectLoaded() {
  await loadPatternFromProject()
}

// Ready-made trigger patterns. Each note is one bar long and sits on a white
// trigger key. Progressions here are trigger order, not musical intervals: a
// ii-V-I project assigns ii, V and I to triggers 1, 2 and 3, so the pattern is
// simply triggers 1-2-3. These only sound like named progressions when the
// project happens to map those triggers to those chords.
const triggerPatterns = [
  { id: 'ascending', label: 'Ascending (triggers 1-7)', mml: 't100o4c1d1e1f1g1a1b1' },
  { id: 'descending', label: 'Descending (triggers 7-1)', mml: 't100o4b1a1g1f1e1d1c1' },
  // The I is held for two bars (the second "e1" ties onto the first).
  { id: 'ii-v-i', label: 'ii-V-I (triggers 1-2-3, I held)', mml: 't100o4c1d1e1&e1' },
  { id: 'one-five-six-four', label: 'I-V-vi-IV (triggers 1-5-6-4)', mml: 't100o4c1g1a1f1' },
  { id: 'up-down', label: 'Up and down (triggers 1-2-3-4-5-4-3-2)', mml: 't100o4c1d1e1f1g1f1e1d1' },
]
const selectedPattern = ref('')

async function applyTriggerPattern() {
  const pattern = triggerPatterns.find(entry => entry.id === selectedPattern.value)
  if (!pattern)
    return
  await panel.value.setMML(pattern.mml)
  loopManuallySet.value = false
  fitLoopToNotes(false)
  await panel.value.fitToNotes()
  writeProjectPattern()
  scheduleCountRefresh()
}

// ── Pattern actions ────────────────────────────────────────────────────────

/** The loop that frames the current notes, rounded out to whole bars. */
function fittedLoop() {
  const notes = panel.value ? panel.value.getNotes() : []
  if (!notes || notes.length === 0)
    return null
  let min = Infinity
  let max = -Infinity
  for (const note of notes) {
    min = Math.min(min, note.t)
    max = Math.max(max, note.t + note.g)
  }
  const start = Math.floor(min / PANEL_TIMEBASE) * PANEL_TIMEBASE
  const end = Math.max(start + PANEL_TIMEBASE, Math.ceil(max / PANEL_TIMEBASE) * PANEL_TIMEBASE)
  return { start, end }
}

/**
 * Set the loop markers to the first and last notes, rounded out to whole bars.
 * Used by the button and automatically whenever the notes change, unless the
 * user has positioned the loop by hand. Pass `save = false` for the automatic
 * case, where the caller already schedules a save.
 */
function fitLoopToNotes(save = true) {
  const fitted = fittedLoop()
  if (!fitted)
    return
  panel.value.setLoop(fitted.start, fitted.end)
  loopManuallySet.value = false
  if (save)
    saveProjectPatternNow()
}

/**
 * Apply a loaded loop. A hand-positioned loop is respected; otherwise the loop
 * is fitted to the notes so the end marker stays at the end of the content.
 */
function applyLoadedLoop(markstart, markend, manual) {
  const start = Number.isFinite(markstart) ? markstart : 0
  const hasEnd = Number.isFinite(markend) && markend > start
  if (hasEnd && manual) {
    panel.value.setLoop(start, markend)
    loopManuallySet.value = true
    return
  }
  loopManuallySet.value = false
  fitLoopToNotes(false)
}

async function clearPatternAndLoop() {
  await panel.value.setMML('')
  panel.value.setLoop(0, PANEL_TIMEBASE * DEFAULT_BARS)
  loopManuallySet.value = false
  writeProjectPattern()
  scheduleCountRefresh()
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
  isPlaying.value = false
  clearTimeout(bpmRestartTimer)
  bpmRestartTimer = null
  clearPatternTimers()
  resetLiveCounts()
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
  saveProjectPatternNow()
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

onMounted(async () => {
  await loadPatternFromProject()
  document.addEventListener('project-loaded', onProjectLoaded)
  document.addEventListener('recording-started', onRecordingStarted)
  document.addEventListener('recording-stopped', onRecordingStopped)
})

onBeforeUnmount(() => {
  // Flush the latest edits into the project while the panel is still mounted.
  // onUnmounted runs after the child panel has gone, when its MML reads as
  // empty and would wipe the pattern.
  saveProjectPatternNow()
})

onUnmounted(() => {
  clearTimeout(bpmRestartTimer)
  bpmRestartTimer = null
  clearPatternTimers()
  document.removeEventListener('project-loaded', onProjectLoaded)
  document.removeEventListener('recording-started', onRecordingStarted)
  document.removeEventListener('recording-stopped', onRecordingStopped)
})

defineExpose({ playIfHasNotes, stop: sequencerStop, resume: sequencerResume, isPlaying, hasNotes, noteCount })
</script>

<template>
  <!-- doco https://github.com/g200kg/webaudio-pianoroll -->

  <!-- The wrapper keeps the panel out of the accordion content's direct-child
       transition, which otherwise forces display:block and breaks its layout.
       RecordingPianoRoll uses the same pattern. -->
  <div class="sequencer">
    <PianoRollPanel
      ref="panel"
      :timebase="16"
      :tempo="globals.recording.bpm"
      :octadj="-1"
      :initial-bars="1"
      :initial-y-range="16"
      :initial-y-offset="60"
      :min-width="600"
      :row-offset="rowOffset"
      :row-labels="rowLabels"
      :allowed-rows="triggerRows"
      :new-note-ticks="PANEL_TIMEBASE"
      @audition="onAudition"
      @change="onPanelChange"
      @loop-change="onLoopChange"
    />

    <br>
    <button @click="sequencerPlay()" class="ui button">Play</button>
    <button @click="sequencerStop()" class="ui button">Stop</button>
    <button @click="sequencerResume()" class="ui button">Resume</button>
    <button @click="fitLoopToNotes()" class="ui button">Fit loop to notes</button>
    <button @click="clearPatternAndLoop()" class="ui button">Clear pattern</button>

    <br><br>
    <label class="include-toggle">
      <input type="checkbox" v-model="includeInRecording" @change="saveProjectPatternNow">
      Include in recording (loop the pattern while you record a solo)
    </label>

    <label class="trigger-pattern-picker">
      Trigger pattern
      <select v-model="selectedPattern" class="trigger-pattern-select" @change="applyTriggerPattern">
        <option value="" disabled>Choose a pattern…</option>
        <option v-for="pattern in triggerPatterns" :key="pattern.id" :value="pattern.id">{{ pattern.label }}</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.include-toggle {
  font-size: 0.85rem;
  color: #333;
  user-select: none;
}

.trigger-pattern-picker {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: 0.5rem;
  font-size: 0.85rem;
  color: #333;
}

.trigger-pattern-select {
  padding: 2px 4px;
  font-size: 0.85rem;
  color: #333;
  background: #fff;
  border: 1px solid #999;
  border-radius: 4px;
}
</style>
