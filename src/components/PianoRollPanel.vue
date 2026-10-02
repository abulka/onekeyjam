<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { fitRange } from '@/lib/sequencer-notes.js'

// A reusable wrapper around the g200kg <webaudio-pianoroll> custom element.
// It owns the widget, the zoom/scroll sliders and the plumbing for editing
// changes and piano-strip auditions, so several panels can share one component.

const props = defineProps({
  // 0 means "measure the container and fill it".
  width: { type: Number, default: 0 },
  height: { type: Number, default: 320 },
  timebase: { type: Number, default: 1920 },
  tempo: { type: Number, default: 120 },
  octadj: { type: Number, default: 0 },
  editable: { type: Boolean, default: true },
  noteColor: { type: String, default: '#f22' },
  // Grid palette: light background with subtly alternating rows and light grey
  // grid lines, rather than the widget's darker defaults.
  rowLight: { type: String, default: '#f4f4f4' },
  rowDark: { type: String, default: '#e2e2e2' },
  gridColor: { type: String, default: '#c8c8c8' },
  rulerColor: { type: String, default: '#666666' },
  // Maps a sounding MIDI note to a widget row: row = midi - rowOffset.
  // 0 when the rows are real MIDI notes (the recording panel); the sequencer
  // offsets rows because its notes are trigger positions.
  rowOffset: { type: Number, default: 0 },
  minWidth: { type: Number, default: 600 },
  maxWidth: { type: Number, default: 1400 },
  initialBars: { type: Number, default: 4 },
  initialYRange: { type: Number, default: 24 },
  initialYOffset: { type: Number, default: 72 },
})

const emit = defineEmits(['change', 'audition'])

const pianoroll = ref(null)
const mainEl = ref(null)
const measuredWidth = ref(0)

const xrange = ref(props.initialBars)
const xoffset = ref(0)
const yrange = ref(props.initialYRange)
const yoffset = ref(props.initialYOffset)

const computedWidth = computed(() => {
  const raw = props.width || measuredWidth.value || props.minWidth
  return Math.max(props.minWidth, Math.min(props.maxWidth, Math.round(raw)))
})

async function widget() {
  await nextTick()
  return pianoroll.value
}

// The widget's redraw loops do not terminate if given a zero, negative or
// non-finite range/timebase, so never let a bad number through.
function finite(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function applyX() {
  const el = pianoroll.value
  if (!el)
    return
  const tb = finite(props.timebase, 1920)
  const xr = finite(xrange.value, props.initialBars)
  const xo = Number(xoffset.value)
  el.xrange = Math.max(tb, xr * tb)
  el.xoffset = Math.max(0, Number.isFinite(xo) ? xo : 0) * tb
}

function applyY() {
  const el = pianoroll.value
  if (!el)
    return
  const yr = finite(yrange.value, props.initialYRange)
  const yo = Number(yoffset.value)
  el.yrange = Math.max(1, yr)
  el.yoffset = Number.isFinite(yo) ? yo : props.initialYOffset
}

function applyConfig() {
  const el = pianoroll.value
  if (!el)
    return
  const tb = finite(props.timebase, 1920)
  el.timebase = tb
  // Grid lines every quarter note. The widget's default of 4 ticks was fine
  // for a timebase of 16, but at 1920 the lines land a fraction of a pixel
  // apart and merge into a solid grey wash.
  el.grid = Math.max(1, Math.round(tb / 4))
  el.tempo = finite(props.tempo, 120)
  el.octadj = Number.isFinite(Number(props.octadj)) ? Number(props.octadj) : 0
  el.colnote = props.noteColor
  el.collt = props.rowLight
  el.coldk = props.rowDark
  el.colgrid = props.gridColor
  el.colrulerbg = props.rulerColor
  el.enable = props.editable
  applyX()
  applyY()
}

watch([xrange, xoffset], applyX)
watch([yrange, yoffset], applyY)
watch(() => [props.timebase, props.tempo, props.octadj, props.noteColor, props.rowLight, props.rowDark, props.gridColor, props.rulerColor], applyConfig)
watch(() => props.editable, (value) => {
  if (pianoroll.value)
    pianoroll.value.enable = value
})

// ── Public API ─────────────────────────────────────────────────────────────

/** Replace the notes shown, tagging each one with any extra fields (playedMidi, _track). */
async function setNotes(notes) {
  const el = await widget()
  if (!el)
    return
  el.setMMLString('')
  for (const note of notes || []) {
    const t = Math.round(note.t)
    const g = Math.round(note.g)
    const n = Number(note.n)
    if (!Number.isFinite(t) || !Number.isFinite(g) || !Number.isFinite(n) || t < 0 || n < 0 || n > 127)
      continue
    const event = el.addNote(
      t,
      n,
      Math.max(1, g),
      typeof note.v === 'number' ? note.v : el.defvelo,
      note.f || 0,
    )
    if (!event)
      continue
    if (typeof note.playedMidi === 'number')
      event.playedMidi = note.playedMidi
    if (note._track)
      event._track = note._track
  }
  el.redraw()
}

/** The current notes, including any extra fields we tagged them with. */
function getNotes() {
  const el = pianoroll.value
  if (!el || !Array.isArray(el.sequence))
    return []
  return el.sequence.map(event => {
    /** @type {Record<string, unknown>} */
    const copy = { t: event.t, n: event.n, g: event.g, v: event.v, f: event.f }
    if (typeof event.playedMidi === 'number')
      copy.playedMidi = event.playedMidi
    if (event._track)
      copy._track = event._track
    return copy
  })
}

async function setMML(mml) {
  const el = await widget()
  if (el)
    el.setMMLString(mml)
}

function getMML() {
  return pianoroll.value ? pianoroll.value.getMMLString() : ''
}

async function clear() {
  const el = await widget()
  if (el) {
    el.setMMLString('')
    el.redraw()
  }
}

/** Start the widget's looping playback. `callback` receives {t, g, n}. */
function play(audioContext, callback, fromTick) {
  if (pianoroll.value)
    pianoroll.value.play(audioContext, callback, fromTick)
}

function stop() {
  if (pianoroll.value)
    pianoroll.value.stop()
}

function setCursor(tick) {
  if (pianoroll.value)
    pianoroll.value.cursor = tick
}

function setLoop(startTick, endTick) {
  const el = pianoroll.value
  if (!el)
    return
  el.markstart = startTick
  el.markend = endTick
}

function getLoop() {
  const el = pianoroll.value
  if (!el)
    return { start: 0, end: props.timebase * 4 }
  return { start: el.markstart, end: el.markend }
}

/** Frame the given notes (or the current ones) in the view. */
async function fitToNotes(notes) {
  const el = await widget()
  if (!el)
    return
  const list = notes || getNotes()
  if (!list.length)
    return
  const range = fitRange(list)
  yoffset.value = range.yoffset
  yrange.value = range.yrange

  let maxTick = 0
  for (const note of list) {
    const end = Number(note.t) + Number(note.g)
    if (Number.isFinite(end))
      maxTick = Math.max(maxTick, end)
  }
  const bars = Math.max(1, Math.ceil(maxTick / finite(props.timebase, 1920)))
  xoffset.value = 0
  xrange.value = Math.min(64, Number.isFinite(bars) ? bars + 1 : 1)
}

defineExpose({ setNotes, getNotes, setMML, getMML, clear, play, stop, setCursor, setLoop, getLoop, fitToNotes })

// ── Audition, strip highlighting and change detection ─────────────────────

let interacting = false
let changeTimer = null
let stripDragging = false
let lastAuditionRow = null
let lastAuditionAt = 0

const liveRows = ref([])   // rows lit by live-note events (main keyboard, playback, audition flash)
const dragRow = ref(null)  // key under a pressed pointer on the strip
const stripGeometry = ref(null)

function readStripGeometry() {
  const el = pianoroll.value
  if (!el || !el.canvas)
    return null
  const height = Number(el.height) || props.height
  const xruler = Number(el.xruler) || 24
  const yruler = Number(el.yruler) || 24
  const kbwidth = Number(el.kbwidth) || 40
  const yrangeValue = Number(el.yrange)
  const steph = (height - xruler) / (Number.isFinite(yrangeValue) && yrangeValue > 0 ? yrangeValue : 1)
  return { height, xruler, yruler, kbwidth, steph, yoffset: Number(el.yoffset) || 0 }
}

function updateStripGeometry() {
  stripGeometry.value = readStripGeometry()
}

const stripHighlights = computed(() => {
  const geo = stripGeometry.value
  if (!geo)
    return []
  const rows = new Set(liveRows.value)
  if (dragRow.value != null)
    rows.add(dragRow.value)
  const rects = []
  for (const row of rows) {
    if (!Number.isFinite(row))
      continue
    const rawTop = geo.height - (row - geo.yoffset + 1) * geo.steph
    const top = Math.max(geo.xruler, rawTop)
    const bottom = Math.min(geo.height, rawTop + geo.steph)
    if (bottom <= top)
      continue
    rects.push({ row, top, height: bottom - top })
  }
  return rects
})

function onLiveNote(event) {
  const midi = event && event.detail && event.detail.note ? event.detail.note.number : undefined
  if (typeof midi !== 'number')
    return
  const row = midi - props.rowOffset
  const rows = new Set(liveRows.value)
  if (event.detail.state)
    rows.add(row)
  else
    rows.delete(row)
  liveRows.value = [...rows]
}

// pointerdown and mousedown can both fire for one click, so a repeated row is
// only re-auditioned after a short pause (which also throttles fast drags).
function emitAudition(row) {
  const now = Date.now()
  if (row === lastAuditionRow && now - lastAuditionAt < 250)
    return
  lastAuditionRow = row
  lastAuditionAt = now
  emit('audition', { midi: row })
}

function stripRowAt(event) {
  const el = pianoroll.value
  if (!el || !el.canvas || typeof el.hitTest !== 'function')
    return null
  const rect = el.canvas.getBoundingClientRect()
  const hit = el.hitTest({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  if (!hit || hit.m !== 'y')
    return null
  return Math.max(0, Math.min(127, Math.floor(hit.n)))
}

// Returns true when the event is on the piano strip (an audition, not an edit).
function tryAudition(event) {
  const row = stripRowAt(event)
  if (row == null)
    return false
  stripDragging = true
  dragRow.value = row
  emitAudition(row)
  return true
}

function onPointerDown(event) {
  if (tryAudition(event))
    return
  interacting = true
}

// Some environments dispatch mouse events without a matching pointer event;
// treating mousedown as the start of an interaction keeps change detection
// reliable in both cases. The piano strip is handled as an audition instead.
function onMouseDownCapture(event) {
  if (tryAudition(event))
    return
  interacting = true
}

function onTouchStartCapture(event) {
  const touch = event.touches && event.touches[0]
  if (touch && tryAudition(touch))
    return
  interacting = true
}

// Dragging along the strip plays each key it passes over.
function onPointerMove(event) {
  if (!stripDragging)
    return
  const row = stripRowAt(event)
  if (row == null || row === dragRow.value)
    return
  dragRow.value = row
  emitAudition(row)
}

function onPointerUp() {
  stripDragging = false
  dragRow.value = null
  if (!interacting)
    return
  interacting = false
  if (!props.editable)
    return
  clearTimeout(changeTimer)
  changeTimer = setTimeout(() => {
    // MML is deliberately not computed here: it is only needed on demand and is
    // expensive (and used to loop on very short notes).
    emit('change', { notes: getNotes() })
  }, 0)
}

watch([yoffset, yrange, xoffset, xrange, computedWidth], () => nextTick(updateStripGeometry))

let resizeObserver = null

onMounted(() => {
  applyConfig()
  updateStripGeometry()
  if (typeof ResizeObserver !== 'undefined' && mainEl.value) {
    resizeObserver = new ResizeObserver(() => {
      measuredWidth.value = mainEl.value ? mainEl.value.clientWidth : 0
      updateStripGeometry()
    })
    resizeObserver.observe(mainEl.value)
    measuredWidth.value = mainEl.value.clientWidth
  }
  mainEl.value?.addEventListener('pointerdown', onPointerDown, true)
  mainEl.value?.addEventListener('mousedown', onMouseDownCapture, true)
  mainEl.value?.addEventListener('touchstart', onTouchStartCapture, true)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('mouseup', onPointerUp)
  window.addEventListener('touchend', onPointerUp)
  document.addEventListener('live-note', onLiveNote)
})

onUnmounted(() => {
  if (resizeObserver)
    resizeObserver.disconnect()
  mainEl.value?.removeEventListener('pointerdown', onPointerDown, true)
  mainEl.value?.removeEventListener('mousedown', onMouseDownCapture, true)
  mainEl.value?.removeEventListener('touchstart', onTouchStartCapture, true)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('mouseup', onPointerUp)
  window.removeEventListener('touchend', onPointerUp)
  document.removeEventListener('live-note', onLiveNote)
  clearTimeout(changeTimer)
})
</script>

<template>
  <!-- doco https://github.com/g200kg/webaudio-pianoroll -->

  <div class="piano-roll-panel">
    <div class="piano-roll-main" ref="mainEl">
      <webaudio-pianoroll
        ref="pianoroll"
        :width="computedWidth"
        :height="height"
        wheelzoom="0"
      ></webaudio-pianoroll>
      <div class="piano-roll-key-overlay" aria-hidden="true">
        <div v-for="rect in stripHighlights" :key="rect.row" class="strip-key"
          :style="{
            top: `${rect.top}px`,
            left: `${stripGeometry ? stripGeometry.yruler : 24}px`,
            width: `${stripGeometry ? stripGeometry.kbwidth : 40}px`,
            height: `${rect.height}px`,
          }">
        </div>
      </div>
    </div>

    <div class="piano-roll-side">
      <div class="side-control">
        <span>Scroll</span>
        <webaudio-slider v-model="yoffset" tracking="abs" direction="vert" width="24" height="180"
          min="0" max="127"></webaudio-slider>
      </div>
      <div class="side-control">
        <span>Zoom</span>
        <webaudio-slider v-model="yrange" tracking="abs" direction="vert" width="24" height="120"
          min="3" max="48"></webaudio-slider>
      </div>
    </div>
  </div>

  <div class="piano-roll-foot">
    <span class="foot-label">Scroll</span>
    <webaudio-slider v-model="xoffset" direction="horz" tracking="abs" width="420" height="24"
      min="0" max="256" step="1"></webaudio-slider>
    <span class="foot-label">Zoom</span>
    <webaudio-slider v-model="xrange" direction="horz" tracking="abs" width="280" height="24"
      min="1" max="64" step="1"></webaudio-slider>
  </div>
</template>

<style scoped>
.piano-roll-panel {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.piano-roll-main {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.piano-roll-key-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.strip-key {
  position: absolute;
  box-sizing: border-box;
  background: rgba(70, 130, 230, 0.55);
  border: 1px solid rgba(40, 80, 180, 0.85);
}

.piano-roll-side {
  display: flex;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.side-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.72rem;
  color: #333;
}

.piano-roll-foot {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.foot-label {
  font-size: 0.72rem;
  color: #333;
}
</style>
