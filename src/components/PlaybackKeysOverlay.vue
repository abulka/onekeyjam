<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { globals } from '@/lib/globals.js'

// Draws a translucent blue tint over the keys whose notes sound during
// playback, shown alongside the widget's red "played keys" highlight. Reads its
// geometry from the shared webaudio-keyboard element, like KeyboardHelpOverlay
// does.

const props = defineProps({
  keyboardEl: { type: Object, default: null },
  keys: { type: Number, default: 49 },
})

const DEFAULT_KF = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]
const DEFAULT_KO = [0, 0, (7 * 2) / 12 - 1, 0, (7 * 4) / 12 - 2, (7 * 5) / 12 - 3, 0, (7 * 7) / 12 - 4, 0, (7 * 9) / 12 - 5, 0, (7 * 11) / 12 - 6]

const geometry = ref(null)

function readGeometry() {
  const el = props.keyboardEl
  if (!el)
    return null

  const min = Number.isFinite(el.min) ? el.min : 0
  const max = Number.isFinite(el.max) ? el.max : min + props.keys - 1
  const width = Number.isFinite(el.width) ? el.width : (Number.isFinite(el._width) ? el._width : 1130)
  const height = Number.isFinite(el.height) ? el.height : (Number.isFinite(el._height) ? el._height : 128)
  const wwidth = Number.isFinite(el.wwidth) ? el.wwidth : width / (max - min + 2)
  const bwidth = Number.isFinite(el.bwidth) ? el.bwidth : wwidth * 7 / 12
  const bheight = Number.isFinite(el.bheight) ? el.bheight : height * 0.55

  return {
    min,
    max,
    height,
    wwidth,
    bwidth,
    bheight,
    kf: Array.isArray(el.kf) ? el.kf : DEFAULT_KF,
    ko: Array.isArray(el.ko) ? el.ko : DEFAULT_KO,
  }
}

async function updateGeometry() {
  await nextTick()
  geometry.value = readGeometry()
}

let resizeObserver = null

onMounted(async () => {
  await updateGeometry()
  if (typeof ResizeObserver !== 'undefined' && props.keyboardEl) {
    resizeObserver = new ResizeObserver(updateGeometry)
    resizeObserver.observe(props.keyboardEl)
  }
})

onUnmounted(() => {
  if (resizeObserver)
    resizeObserver.disconnect()
})

watch(() => props.keyboardEl, updateGeometry)
watch(() => props.keys, updateGeometry)

const keyRects = computed(() => {
  const geo = geometry.value
  if (!geo)
    return []

  const sounding = globals.recording.playback.soundingKeys
  if (!sounding || sounding.length === 0)
    return []

  const baseMidi = 12 * (globals.keyboard.lhTriggerOctave + 1)
  const minMod = ((geo.min % 12) + 12) % 12
  const blackBase = geo.wwidth * geo.ko[minMod]
  const isBlackAt = (semitone) => geo.kf[((semitone % 12) + 12) % 12] === 1

  // White key position for each semitone in the visible range.
  const whiteIndexOf = {}
  let whiteIndex = 0
  for (let i = geo.min; i <= geo.max; i++) {
    if (!isBlackAt(i)) {
      whiteIndexOf[i] = whiteIndex
      whiteIndex++
    }
  }

  const rects = []
  for (const midi of sounding) {
    const i = midi - baseMidi
    if (i < geo.min || i > geo.max)
      continue
    if (isBlackAt(i)) {
      rects.push({
        id: `b-${i}`,
        isBlack: true,
        x: blackBase + geo.bwidth * (i - geo.min) + 1,
        y: 0,
        width: geo.bwidth,
        height: geo.bheight,
      })
    }
    else {
      rects.push({
        id: `w-${i}`,
        isBlack: false,
        x: geo.wwidth * whiteIndexOf[i] + 1,
        y: geo.bheight,
        width: geo.wwidth - 1,
        height: Math.max(geo.height - geo.bheight - 2, 0),
      })
    }
  }
  return rects
})
</script>

<template>
  <div class="playback-keys-overlay" aria-hidden="true">
    <div v-for="rect in keyRects" :key="rect.id" class="sounding-key"
      :class="{ 'sounding-key-black': rect.isBlack }"
      :style="{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` }">
    </div>
  </div>
</template>

<style scoped>
.playback-keys-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sounding-key {
  position: absolute;
  box-sizing: border-box;
  background: rgba(70, 130, 230, 0.55);
  border: 1px solid rgba(40, 80, 180, 0.8);
}

.sounding-key-black {
  background: rgba(70, 130, 230, 0.75);
}
</style>
