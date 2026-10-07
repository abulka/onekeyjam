<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { fitRange, filterAllowedRows } from '@/lib/sequencer-notes.js'
import { clamp, normalizeWheelDelta, zoomFactor, zoomAxis, panAxis, sliderWheelSteps } from '@/lib/sequencer-view.js'

// A reusable wrapper around the g200kg <webaudio-pianoroll> custom element.
// It owns the widget, the zoom/scroll sliders and the plumbing for editing
// changes and piano-strip auditions, so several panels can share one component.

// View limits, shared by the sliders and the wheel gestures. Horizontal values
// are bars, vertical values are rows (MIDI notes).
const XRANGE_MIN = 1
const XRANGE_MAX = 64
const XOFFSET_MIN = 0
const XOFFSET_MAX = 256
const YRANGE_MIN = 3
const YRANGE_MAX = 48
const YOFFSET_MIN = 0
const YOFFSET_MAX = 127

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
  // Marks whole rows with a label (the chord sequencer uses it to show which
  // rows are chord triggers and their chord names). Keys are widget rows, and
  // values are { text, assigned } so unassigned rows can look different.
  rowLabels: { type: Object, default: () => ({}) },
  // When set, notes may only be added on these rows, and any loaded note off
  // them is removed. null means every row is allowed (the recording panel).
  allowedRows: { type: Array, default: null },
  // Length in ticks of a newly drawn note; 0 keeps the widget default of 1.
  newNoteTicks: { type: Number, default: 0 },
})

const emit = defineEmits(['change', 'audition', 'loop-change'])

const pianoroll = ref(null)
const mainEl = ref(null)
const measuredWidth = ref(0)

// The four scroll/zoom sliders, so their wheel events can be given a gentler
// step than the vendor's default 5% of range.
const yScrollSlider = ref(null)
const yZoomSlider = ref(null)
const xScrollSlider = ref(null)
const xZoomSlider = ref(null)

const xrange = ref(props.initialBars)
const xoffset = ref(0)
const yrange = ref(props.initialYRange)
const yoffset = ref(props.initialYOffset)

// Length of the notes in bars. Used to bound horizontal scrolling so it stops
// at the end of the content instead of running into empty space.
const contentBars = ref(0)

function refreshContentBars(list) {
  const notes = list || getNotes()
  const noteBars = notes.length ? contentBarsFor(notes) : 0
  // Include the loop markers so the end marker is always scrollable into view,
  // even when it sits beyond the last note or the pattern is empty.
  const loop = getLoop()
  const tb = finite(props.timebase, 1920)
  const loopBars = Math.max(Number(loop.start) || 0, Number(loop.end) || 0) / tb
  contentBars.value = Math.max(noteBars, loopBars)
}

// Furthest the view can scroll right, so the last note can reach the right edge.
const xScrollMax = computed(() => {
  const extra = contentBars.value - xrange.value
  return extra > 0 ? Math.ceil(extra) : 0
})

// The scroll sliders and wheel handlers all clamp horizontal scroll to this.
const xOffsetLimit = computed(() => clamp(xScrollMax.value, XOFFSET_MIN, XOFFSET_MAX))

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
  el.xoffset = clamp(Number.isFinite(xo) ? xo : 0, XOFFSET_MIN, xOffsetLimit.value) * tb
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
  // Editing snap: a 16th note, so drawn notes land musically (1 tick at the
  // pattern panel's timebase of 16, which is what it always used).
  el.snap = Math.max(1, Math.round(tb / 16))
  el.tempo = finite(props.tempo, 120)
  el.octadj = Number.isFinite(Number(props.octadj)) ? Number(props.octadj) : 0
  el.colnote = props.noteColor
  el.collt = props.rowLight
  el.coldk = props.rowDark
  el.colgrid = props.gridColor
  el.colrulerbg = props.rulerColor
  el.enable = props.editable
  el.deflen = props.newNoteTicks > 0 ? props.newNoteTicks : 1
  el.rowrestrict = Array.isArray(props.allowedRows) ? 1 : 0
  el.allownotes = Array.isArray(props.allowedRows) ? props.allowedRows.join(',') : ''
  applyX()
  applyY()
}

watch([xrange, xoffset], applyX)
watch([yrange, yoffset], applyY)
watch(() => [props.timebase, props.tempo, props.octadj, props.noteColor, props.rowLight, props.rowDark, props.gridColor, props.rulerColor, props.newNoteTicks, props.allowedRows], applyConfig)
watch(() => props.editable, (value) => {
  if (pianoroll.value)
    pianoroll.value.enable = value
})
// When the allowed rows change (for example a project loads and brings chord
// triggers), drop any notes that are now off-limits.
watch(() => props.allowedRows, () => enforceAllowedRows())

// Keep the horizontal scroll slider's range and value within the content.
function applyXScrollMax() {
  const slider = xScrollSlider.value
  if (slider)
    slider.max = Math.max(1, xOffsetLimit.value)
}

watch([xScrollSlider, xOffsetLimit], () => {
  if (xoffset.value > xOffsetLimit.value)
    xoffset.value = Math.max(XOFFSET_MIN, xOffsetLimit.value)
  applyXScrollMax()
})

// ── Wheel pan and zoom ─────────────────────────────────────────────────────

function rollGeometry() {
  const el = pianoroll.value
  if (!el)
    return null
  const xruler = Number(el.xruler) || 24
  const yruler = Number(el.yruler) || 24
  const kbwidth = Number(el.kbwidth) || 40
  const width = Number(el.width) || computedWidth.value
  const height = Number(el.height) || props.height
  return {
    rect: el.getBoundingClientRect(),
    xruler,
    yruler,
    kbwidth,
    swidth: Math.max(1, width - yruler - kbwidth),
    sheight: Math.max(1, height - xruler),
  }
}

// Two-finger scroll pans; Ctrl/Cmd-wheel (which is also what trackpad pinch
// sends) zooms, holding the time/row under the pointer still. Registered in the
// capture phase so it runs before the widget canvas's own wheel handling.
function onWheel(event) {
  const geo = rollGeometry()
  if (!geo)
    return
  event.preventDefault()
  event.stopPropagation()

  const dy = normalizeWheelDelta(event.deltaY, event.deltaMode)
  const dx = normalizeWheelDelta(event.deltaX, event.deltaMode)
  const px = event.clientX - geo.rect.left
  const py = event.clientY - geo.rect.top

  if (event.ctrlKey || event.metaKey) {
    const factor = zoomFactor(dy)
    // Anchor measured from the left of the time area and the bottom of the rows.
    const fx = clamp((px - geo.yruler - geo.kbwidth) / geo.swidth, 0, 1)
    const x = zoomAxis({
      range: xrange.value, offset: xoffset.value,
      min: XRANGE_MIN, max: XRANGE_MAX,
      offsetMin: XOFFSET_MIN, offsetMax: xOffsetLimit.value,
      factor, anchor: fx,
    })
    xoffset.value = x.offset
    xrange.value = Math.round(x.range * 1000) / 1000

    const fy = clamp((geo.sheight - (py - geo.xruler)) / geo.sheight, 0, 1)
    const y = zoomAxis({
      range: yrange.value, offset: yoffset.value,
      min: YRANGE_MIN, max: YRANGE_MAX,
      offsetMin: YOFFSET_MIN, offsetMax: YOFFSET_MAX,
      factor, anchor: fy,
    })
    yoffset.value = y.offset
    yrange.value = Math.round(y.range * 100) / 100
    return
  }

  // Shift turns a vertical wheel into horizontal (time) panning.
  const shiftPansTime = event.shiftKey && dx === 0
  if (Math.abs(dx) > Math.abs(dy) || shiftPansTime) {
    const deltaPx = shiftPansTime ? dy : dx
    if (!deltaPx)
      return
    xoffset.value = panAxis({
      range: xrange.value, offset: xoffset.value, deltaPx,
      viewportPx: geo.swidth, offsetMin: XOFFSET_MIN, offsetMax: xOffsetLimit.value,
    }).offset
  }
  else {
    if (!dy)
      return
    yoffset.value = panAxis({
      range: yrange.value, offset: yoffset.value, deltaPx: dy,
      viewportPx: geo.sheight, offsetMin: YOFFSET_MIN, offsetMax: YOFFSET_MAX,
      invert: true,
    }).offset
  }
}

// Gentle wheel stepping for the scroll/zoom sliders, replacing the vendor's
// coarse 5%-of-range jump. The slider's shadow root retargets the event to the
// host element, so `event.target` identifies which control was scrolled.
function onSliderWheel(event) {
  const steps = sliderWheelSteps(event.deltaY, event.shiftKey)
  if (!steps)
    return
  const target = event.target
  if (target === yScrollSlider.value)
    yoffset.value = clamp(yoffset.value + steps, YOFFSET_MIN, YOFFSET_MAX)
  else if (target === yZoomSlider.value)
    yrange.value = clamp(yrange.value + steps, YRANGE_MIN, YRANGE_MAX)
  else if (target === xScrollSlider.value)
    xoffset.value = clamp(xoffset.value + steps, XOFFSET_MIN, xOffsetLimit.value)
  else if (target === xZoomSlider.value)
    xrange.value = clamp(xrange.value + steps, XRANGE_MIN, XRANGE_MAX)
  else
    return
  event.preventDefault()
  event.stopPropagation()
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Remove notes that sit on a row outside the allowed set. Does nothing when no
 * whitelist is configured. Pass `emitChange = false` during a load, where the
 * caller already handles saving and fitting.
 */
function enforceAllowedRows(emitChange = true) {
  const el = pianoroll.value
  if (!el || !Array.isArray(props.allowedRows) || !Array.isArray(el.sequence))
    return false
  const kept = filterAllowedRows(el.sequence, props.allowedRows)
  if (kept.length === el.sequence.length)
    return false
  el.sequence = kept
  el.redraw()
  refreshContentBars()
  if (emitChange)
    emit('change', { notes: getNotes() })
  return true
}

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
  refreshContentBars()
  enforceAllowedRows(false)
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
  if (el) {
    el.setMMLString(mml)
    // The MML may carry its own tempo; the component's tempo wins so the app's
    // global BPM is not overridden by old or ready-made patterns.
    el.tempo = finite(props.tempo, 120)
    refreshContentBars()
    enforceAllowedRows(false)
  }
}

function getMML() {
  return pianoroll.value ? pianoroll.value.getMMLString() : ''
}

async function clear() {
  const el = await widget()
  if (el) {
    el.setMMLString('')
    el.redraw()
    refreshContentBars()
  }
}

/**
 * Start the widget's looping playback. `callback` receives {t, g, n}.
 * Returns the widget's real start info — `startTime` is the audio-context time
 * of the loop origin (tick 0), `startTick` the loop-relative start position, and
 * `tick2time` the seconds-per-tick at the current tempo — so callers can align
 * the metronome exactly instead of guessing the widget's start lead.
 */
function play(audioContext, callback, fromTick) {
  const el = pianoroll.value
  if (!el)
    return null
  el.play(audioContext, callback, fromTick)
  return { startTime: el.time0, startTick: el.cursor, tick2time: el.tick2time }
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
  // The loop sets the furthest the view can scroll, so refresh the bound.
  refreshContentBars()
}

function getLoop() {
  const el = pianoroll.value
  if (!el)
    return { start: 0, end: props.timebase * 4 }
  return { start: el.markstart, end: el.markend }
}

// The end of the notes in bars, used to stop horizontal scrolling running off
// into empty space beyond the content.
function contentBarsFor(list) {
  let maxTick = 0
  for (const note of list) {
    const end = Number(note.t) + Number(note.g)
    if (Number.isFinite(end))
      maxTick = Math.max(maxTick, end)
  }
  return maxTick / finite(props.timebase, 1920)
}

/** Frame the notes horizontally (fit width). */
async function fitWidth(notes) {
  await widget()
  const list = notes || getNotes()
  if (!list.length)
    return
  const bars = Math.max(1, Math.ceil(contentBarsFor(list)))
  xoffset.value = 0
  xrange.value = Math.min(XRANGE_MAX, bars + 1)
  refreshContentBars(list)
}

/** Frame the notes vertically (fit height). */
async function fitHeight(notes) {
  await widget()
  const list = notes || getNotes()
  if (!list.length)
    return
  const range = fitRange(list)
  yoffset.value = range.yoffset
  yrange.value = range.yrange
}

/** Frame the given notes (or the current ones) on both axes (fit all). */
async function fitToNotes(notes) {
  await fitHeight(notes)
  await fitWidth(notes)
}

defineExpose({ setNotes, getNotes, setMML, getMML, clear, play, stop, setCursor, setLoop, getLoop, fitToNotes, fitWidth, fitHeight })

// ── Audition, strip highlighting and change detection ─────────────────────

let interacting = false
let changeTimer = null
let stripDragging = false
let lastAuditionRow = null
let lastAuditionAt = 0
// Loop markers as they were when a pointer gesture began, so a marker drag can
// be told apart from a note edit and reported to the parent.
let loopBeforeInteraction = null

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

// Rows that get a label (the chord sequencer's chord-trigger rows). Each gets a
// band across the grid and a name badge over the piano strip.
const rowLabelRects = computed(() => {
  const geo = stripGeometry.value
  const labels = props.rowLabels || {}
  if (!geo)
    return []
  const rects = []
  for (const [key, value] of Object.entries(labels)) {
    const row = Number(key)
    if (!Number.isFinite(row))
      continue
    const rawTop = geo.height - (row - geo.yoffset + 1) * geo.steph
    const top = Math.max(geo.xruler, rawTop)
    const bottom = Math.min(geo.height, rawTop + geo.steph)
    if (bottom <= top)
      continue
    const shaped = value && typeof value === 'object'
    rects.push({
      row,
      label: shaped ? value.text : value,
      assigned: shaped ? value.assigned !== false : true,
      top,
      height: bottom - top,
      stripLeft: geo.yruler,
      stripWidth: geo.kbwidth,
      gridLeft: geo.yruler + geo.kbwidth,
      showText: bottom - top >= 12,
    })
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

// Returns the row under the pointer when it is on the piano strip or on a note.
// `edit` is true for note hits, which also begin an edit (so change detection
// still fires), and false for the strip.
function auditionRowAt(event) {
  const el = pianoroll.value
  if (!el || !el.canvas || typeof el.hitTest !== 'function')
    return null
  const rect = el.canvas.getBoundingClientRect()
  const hit = el.hitTest({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  if (!hit)
    return null
  const row = Math.max(0, Math.min(127, Math.floor(hit.n)))
  if (hit.m === 'y')
    return { row, edit: false }
  if (hit.m === 'n' || hit.m === 'N' || hit.m === 'B' || hit.m === 'E')
    return { row, edit: true }
  return null
}

function startInteraction(event) {
  loopBeforeInteraction = getLoop()
  const found = auditionRowAt(event)
  if (found) {
    dragRow.value = found.row
    stripDragging = !found.edit
    emitAudition(found.row)
    if (found.edit)
      interacting = true
    return
  }
  interacting = true
}

function onPointerDown(event) {
  startInteraction(event)
}

// Some environments dispatch mouse events without a matching pointer event;
// treating mousedown as the start of an interaction keeps change detection
// reliable in both cases.
function onMouseDownCapture(event) {
  startInteraction(event)
}

function onTouchStartCapture(event) {
  const touch = event.touches && event.touches[0]
  if (touch)
    startInteraction(touch)
  else
    interacting = true
}

// Dragging along the strip plays each key it passes over.
function onPointerMove(event) {
  if (!stripDragging)
    return
  const found = auditionRowAt(event)
  if (!found || found.edit || found.row === dragRow.value)
    return
  dragRow.value = found.row
  emitAudition(found.row)
}

function onPointerUp() {
  stripDragging = false
  dragRow.value = null
  const loopSnapshot = loopBeforeInteraction
  loopBeforeInteraction = null
  if (!interacting)
    return
  interacting = false
  if (!props.editable)
    return
  // An edit may have added or removed notes, so recompute the scroll bound.
  refreshContentBars()
  // Dragging a loop marker is a deliberate choice; tell the parent so it stops
  // auto-fitting the loop to the notes.
  if (loopSnapshot) {
    const loop = getLoop()
    if (loop.start !== loopSnapshot.start || loop.end !== loopSnapshot.end)
      emit('loop-change', { start: loop.start, end: loop.end })
  }
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
  mainEl.value?.addEventListener('wheel', onWheel, { passive: false, capture: true })
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
  mainEl.value?.removeEventListener('wheel', onWheel, { capture: true })
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
        <template v-for="rect in rowLabelRects" :key="`chord-${rect.row}`">
          <div class="chord-row-band" :class="{ 'chord-row-band-unassigned': !rect.assigned }"
            :style="{ top: `${rect.top}px`, height: `${rect.height}px`, left: `${rect.gridLeft}px` }"></div>
          <div class="chord-row-key" :class="{ 'chord-row-key-unassigned': !rect.assigned }"
            :style="{ top: `${rect.top}px`, height: `${rect.height}px`, left: `${rect.stripLeft}px`, width: `${rect.stripWidth}px` }">
            <span v-if="rect.showText" class="chord-row-name">{{ rect.label }}</span>
          </div>
        </template>
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

    <div class="piano-roll-side" @wheel.capture="onSliderWheel">
      <div class="side-control">
        <span>Scroll</span>
        <webaudio-slider ref="yScrollSlider" v-model="yoffset" tracking="abs" direction="vert" width="24" height="260"
          min="0" max="127"></webaudio-slider>
      </div>
      <div class="side-control">
        <span>Zoom</span>
        <webaudio-slider ref="yZoomSlider" v-model="yrange" tracking="abs" direction="vert" width="24" height="260"
          min="3" max="48"></webaudio-slider>
      </div>
    </div>
  </div>

  <div class="piano-roll-foot" @wheel.capture="onSliderWheel">
    <div class="foot-control">
      <span class="foot-label">Scroll</span>
      <webaudio-slider ref="xScrollSlider" v-model="xoffset" direction="horz" tracking="abs" width="360" height="24"
        min="0" max="256" step="1"></webaudio-slider>
    </div>
    <div class="foot-control">
      <span class="foot-label">Zoom</span>
      <webaudio-slider ref="xZoomSlider" v-model="xrange" direction="horz" tracking="abs" width="360" height="24"
        min="1" max="64" step="1"></webaudio-slider>
    </div>
    <div class="foot-fit">
      <button type="button" class="fit-button" title="Fit the notes to the width"
        @click="fitWidth()">Fit width</button>
      <button type="button" class="fit-button" title="Fit the notes to the height"
        @click="fitHeight()">Fit height</button>
      <button type="button" class="fit-button" title="Fit the notes to width and height"
        @click="fitToNotes()">Fit all</button>
    </div>
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

/* Chord-trigger rows in the chord sequencer: a faint lane tint plus a named
   badge over the piano key, so it is clear which rows are chord triggers. */
.chord-row-band {
  position: absolute;
  right: 0;
  box-sizing: border-box;
  background: rgba(76, 160, 90, 0.12);
  border-top: 1px solid rgba(76, 160, 90, 0.35);
  border-bottom: 1px solid rgba(76, 160, 90, 0.35);
}

.chord-row-key {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: hidden;
  background: rgba(60, 140, 74, 0.75);
  border: 1px solid rgba(36, 96, 48, 0.9);
}

/* A trigger row with no chord assigned yet: muted, to prompt assignment. */
.chord-row-band-unassigned {
  background: rgba(120, 120, 120, 0.10);
  border-top: 1px solid rgba(120, 120, 120, 0.3);
  border-bottom: 1px solid rgba(120, 120, 120, 0.3);
}

.chord-row-key-unassigned {
  background: rgba(120, 120, 120, 0.55);
  border: 1px dashed rgba(70, 70, 70, 0.9);
}

.chord-row-name {
  color: #fff;
  font-size: 9px;
  font-weight: bold;
  line-height: 1;
  text-align: center;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.7);
  word-break: break-all;
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
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.foot-control {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.foot-label {
  min-width: 3.2em;
  text-align: right;
  font-size: 0.72rem;
  color: #333;
}

.foot-fit {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.25rem;
}

.fit-button {
  padding: 0.15rem 0.5rem;
  border: 1px solid #999;
  border-radius: 4px;
  background: #f6f6f6;
  color: #333;
  font-size: 0.72rem;
  cursor: pointer;
  white-space: nowrap;
}

.fit-button:hover {
  background: #e8e8e8;
}
</style>
