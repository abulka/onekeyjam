<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { globals } from "@/lib/globals.js"
import { Note as TonalNote } from '@tonaljs/tonal'
import { indexToNote, indexToWhiteNote } from "@/lib/note-tools.js"
import { resolveTriggerNote } from "@/lib/resolveTriggerNote.js"
import { audioContext } from '@/lib/audio/general-midi.js'
import { auditionMidiNote, auditionChord } from '@/lib/midi/audition-note.js'
import { commitTakeEdit } from '@/lib/midi/recorder.js'
import { patternToTakeNotes, rowToTakeNotes, scalePatternNoteLengths } from '@/lib/sequencer-notes.js'
import { triggerRowCountFor } from '@/lib/demo-pattern.js'
import { patternOnNote, clearPatternTimers, resetLiveCounts } from '@/lib/pattern-playback.js'
import { noteSequencerStarted, noteSequencerStopped } from '@/lib/pattern-snapshot.js'
import { sequencerControl, registerSequencer, unregisterSequencer, sequenceOptions, resolveSequenceName } from '@/lib/sequencer-control.js'
import { storedMmlHasNotes, shouldPreserveStoredPattern, createSerialQueue } from '@/lib/pattern-write-guard.js'
import { applyProjectTempo } from '@/lib/boot-project.js'
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
// Debounces the loop restart when the global BPM changes mid-play.
let bpmRestartTimer = null
// Set while a project's pattern is being loaded, so the edits that the load
// itself produces (allowed-row stripping, loop fitting) are not written back.
let suppressProjectSave = false
// Set only by the Clear pattern button, the one deliberate route to saving an
// empty panel over a stored sequence. See writeProjectPattern().
let explicitClear = false
// Note count of the last change the user made by hand (null until the first
// load or edit). Deleting every note by hand reports zero, which is deliberate
// and must still save; any other route to an empty panel is an accident and
// the stored sequence is kept instead.
let lastUserEditCount = null
// Loads and their saves run strictly one at a time, so a save can never catch
// a mid-load empty panel (which once wiped a stored sequence for good).
const enqueueSequencerLoad = createSerialQueue()

function refreshNoteCount() {
  noteCount.value = panel.value ? panel.value.getNotes().length : 0
}

// The widget applies MML on its next tick, so recount just after the call.
function scheduleCountRefresh() {
  setTimeout(refreshNoteCount, 0)
}

function onPanelChange(payload) {
  refreshNoteCount()
  if (suppressProjectSave)
    return
  const { notes = [], origin = 'edit' } = payload || {}
  if (origin === 'strip') {
    // Programmatic row enforcement, not a user edit: update the counts but
    // never write back, so a stale row set cannot prune the stored sequence.
    return
  }
  lastUserEditCount = Array.isArray(notes) ? notes.length : 0
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

function startPatternPlayback(starttick) {
  return panel.value.play(audioContext, patternOnNote, starttick)
}

function markSequencerClock(info) {
  if (!info)
    noteSequencerStarted()
  else
    noteSequencerStarted(info.startTime, info.startTick * info.tick2time)
}

function sequencerPlay(e, from = 'beginning') {
  if (audioContext && audioContext.state === 'suspended' && typeof audioContext.resume === 'function')
    audioContext.resume()
  clearTimeout(bpmRestartTimer)
  bpmRestartTimer = null
  clearPatternTimers()
  resetLiveCounts()
  const starttick = (from == 'beginning') ? 0 : undefined
  const info = startPatternPlayback(starttick)
  isPlaying.value = true
  markSequencerClock(info)
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
  noteSequencerStopped()
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
    const info = startPatternPlayback(undefined)  // undefined resumes from the widget's cursor
    markSequencerClock(info)
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

// The named sequences the current project offers (excerpt, full form, ...).
const sequenceOptionsList = computed(() => sequenceOptions())

function getSequenceEntry(name) {
  if (!globals.project.chordSequences)
    globals.project.chordSequences = {}
  let entry = globals.project.chordSequences[name]
  if (!entry) {
    entry = { mml: '', tempo: globals.recording.bpm }
    globals.project.chordSequences[name] = entry
  }
  return entry
}

/** Copy the sequencer's current state into the active chord sequence. */
function writeProjectPattern() {
  clearTimeout(saveTimer)
  const state = panelState()
  const name = globals.currentChordSequenceName || 'default'
  const entry = getSequenceEntry(name)
  const wasExplicitClear = explicitClear
  explicitClear = false
  const panelNoteCount = panel.value ? panel.value.getNotes().length : 0
  if (shouldPreserveStoredPattern({
    panelNoteCount,
    storedMml: entry.mml,
    explicitClear: wasExplicitClear,
    lastUserEditCount,
  })) {
    // The panel is empty but the stored sequence is not, and the user did not
    // empty it by hand: a save raced ahead of a load. Keep the stored notes.
    console.warn(`Sequencer: refusing to overwrite the "${name}" pattern with an empty panel; the stored notes are kept.`)
    if (typeof $ === 'function') {
      $('body').toast({
        message: `Kept the stored "${sequenceLabel(name)}" pattern instead of saving an empty panel.`,
        displayTime: 4000,
        class: 'brown',
      })
    }
    return
  }
  entry.mml = state.mml
  entry.markstart = state.markstart
  entry.markend = state.markend
  entry.tempo = state.tempo
  entry.enabled = state.enabled
  entry.loopManual = state.loopManual
}

/** Display label for a stored sequence, falling back to its key. */
function sequenceLabel(name) {
  const entry = globals.project && globals.project.chordSequences
    ? globals.project.chordSequences[name]
    : null
  return (entry && entry.label) || name
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

/** Load the current project's active chord sequence into the sequencer. */
async function loadPatternFromProject() {
  clearTimeout(saveTimer)
  if (!panel.value)
    return
  suppressProjectSave = true
  try {
    // Resolve from the remembered preference, so a song without that mode falls
    // back without losing the preference for the next song that has it.
    const name = resolveSequenceName(globals.preferredChordSequenceName)
    globals.currentChordSequenceName = name
    const entry = getSequenceEntry(name)
    migrateDevicePattern(entry)
    await panel.value.setMML(entry.mml || '')
    applyLoadedLoop(entry.markstart, entry.markend, entry.loopManual)
    includeInRecording.value = !!entry.enabled
    // The row whitelist can settle a tick after the project loads; a first
    // pass with stale rows would show an empty panel, so retry once rather
    // than presenting (and later saving) nothing.
    let noteCount = panel.value.getNotes().length
    if (storedMmlHasNotes(entry.mml) && noteCount === 0) {
      await nextTick()
      if (!panel.value)
        return
      await panel.value.setMML(entry.mml || '')
      applyLoadedLoop(entry.markstart, entry.markend, entry.loopManual)
      noteCount = panel.value.getNotes().length
    }
    if (storedMmlHasNotes(entry.mml) && noteCount === 0)
      console.error(`Sequencer: the "${name}" pattern has stored notes but the panel stayed empty after a retry.`)
    lastUserEditCount = noteCount
    scheduleCountRefresh()
    await panel.value.fitToNotes()
    applyProjectTempo(name)
  }
  catch (error) {
    console.error('Sequencer: could not load the pattern from the project:', error)
  }
  finally {
    suppressProjectSave = false
  }
}

/** Switch to another named sequence, saving the current one first. */
function selectSequence(name) {
  if (!name)
    return Promise.resolve()
  // An explicit choice becomes the remembered preference, so it is restored on
  // the next song that offers it.
  globals.preferredChordSequenceName = name
  // Serialized with every other load, so the save below can never catch a
  // mid-load empty panel. The current-sequence check runs again inside, after
  // earlier queued work has finished.
  return enqueueSequencerLoad(async () => {
    if (name === globals.currentChordSequenceName)
      return
    saveProjectPatternNow()
    await loadPatternFromProject()
  })
}

function onSequenceChange(event) {
  selectSequence(event.target.value)
}

function onProjectLoaded() {
  enqueueSequencerLoad(loadPatternFromProject)
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
  // Deliberately emptying the panel: let this one empty save through the
  // write-back guard below.
  explicitClear = true
  writeProjectPattern()
  lastUserEditCount = 0
  scheduleCountRefresh()
}

// ── Note length scaling ────────────────────────────────────────────────

/** Whether the length buttons can run: notes exist and no take is recording. */
const canScaleLengths = computed(() => hasNotes.value && !globals.recording.isRecording)

/**
 * Double (factor 2) or halve (factor 0.5) every trigger note proportionally,
 * so the progression runs slower or quicker with gaps scaled too. The loop is
 * always refit. When the pattern is playing it is stopped first and restarted
 * from the beginning, because live-mutating the widget sequence mid-play is
 * unreliable; during a take recording the buttons are disabled instead so the
 * take merge stays consistent.
 */
async function scaleNoteLengths(factor) {
  if (!panel.value || globals.recording.isRecording)
    return
  const notes = panel.value.getNotes()
  if (!notes || notes.length === 0)
    return
  const wasPlaying = isPlaying.value
  if (wasPlaying)
    sequencerStop()
  const scaled = scalePatternNoteLengths(notes, factor)
  await panel.value.setNotes(scaled)
  lastUserEditCount = scaled.length
  loopManuallySet.value = false
  fitLoopToNotes(false)
  await panel.value.fitToNotes()
  writeProjectPattern()
  scheduleCountRefresh()
  if (wasPlaying)
    playIfHasNotes()
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
  noteSequencerStopped()
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

// Keep the shared transport (the global toolbar) in step with this component.
watch([isPlaying, hasNotes], () => {
  sequencerControl.isPlaying = isPlaying.value
  sequencerControl.hasNotes = hasNotes.value
}, { immediate: true })

onMounted(async () => {
  registerSequencer({
    toggle: () => { isPlaying.value ? sequencerStop() : playIfHasNotes() },
    play: () => playIfHasNotes(),
    stop: () => sequencerStop(),
    selectSequence,
  })
  await enqueueSequencerLoad(loadPatternFromProject)
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
  unregisterSequencer()
  noteSequencerStopped()
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
    <button :disabled="!canScaleLengths" title="Double every trigger note and stretch the pattern, so the progression runs slower"
      @click="scaleNoteLengths(2)" class="ui button">Double lengths</button>
    <button :disabled="!canScaleLengths" title="Halve every trigger note and shrink the pattern, so the progression runs quicker"
      @click="scaleNoteLengths(0.5)" class="ui button">Halve lengths</button>

    <br><br>
    <label v-if="sequenceOptionsList.length > 1" class="sequence-picker">
      Song sequence
      <select class="sequence-select" :value="globals.currentChordSequenceName" @change="onSequenceChange">
        <option v-for="option in sequenceOptionsList" :key="option.name" :value="option.name">{{ option.label }}</option>
      </select>
    </label>

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

.sequence-picker {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-right: 0.75rem;
  font-size: 0.85rem;
  color: #333;
}

.sequence-select {
  padding: 2px 4px;
  font-size: 0.85rem;
  color: #333;
  background: #fff;
  border: 1px solid #999;
  border-radius: 4px;
}
</style>
