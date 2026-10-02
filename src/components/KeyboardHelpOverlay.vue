<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { globals } from '@/lib/globals.js'
import { buildKeyLabels, buildWhiteNoteMappings, chooseTextOrientation } from '@/lib/keyboard-help.js'

const props = defineProps({
  keyboardEl: { type: Object, default: null },
  keys: { type: Number, default: 49 },
})

const BLACK_FONT_PX = 9
const WHITE_FONT_PX = 10
const BLACK_FONT = `${BLACK_FONT_PX}px sans-serif`
const WHITE_FONT = `${WHITE_FONT_PX}px sans-serif`

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

function longestLine(lines) {
  return lines.reduce((longest, line) => (line.length >= longest.length ? line : longest), '')
}

const keyLabels = computed(() => {
  const geo = geometry.value
  if (!geo)
    return []

  const whiteNoteMappings = buildWhiteNoteMappings(globals.chordTriggerMap, globals.scaleTriggerMap)
  const raw = buildKeyLabels({
    min: geo.min,
    max: geo.max,
    kf: geo.kf,
    lhTriggerOctave: globals.keyboard.lhTriggerOctave,
    whiteNoteMappings,
    keyboardHelpMode: globals.keyboardHelpMode,
  })

  const minMod = ((geo.min % 12) + 12) % 12

  return raw.map((item) => {
    if (item.isBlack) {
      const x = geo.wwidth * geo.ko[minMod] + geo.bwidth * (item.semitoneIndex - geo.min) + 1
      const lines = [item.shiftHelp, item.help].filter(Boolean)
      return {
        ...item,
        x,
        y: 1,
        width: geo.bwidth,
        height: geo.bheight - 2,
        fontSize: `${BLACK_FONT_PX}px`,
        orientation: chooseTextOrientation(longestLine(lines), geo.bwidth, BLACK_FONT),
      }
    }

    return {
      ...item,
      x: geo.wwidth * item.whiteIndex + 1,
      y: geo.bheight + 2,
      width: geo.wwidth - 1,
      height: Math.max(geo.height - geo.bheight - 4, 0),
      fontSize: `${WHITE_FONT_PX}px`,
      orientation: chooseTextOrientation(item.mapping, geo.wwidth, WHITE_FONT),
    }
  })
})

function labelStyle(item) {
  return {
    left: `${item.x}px`,
    top: `${item.y}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
    fontSize: item.fontSize,
  }
}
</script>

<template>
  <div class="keyboard-help-overlay" aria-hidden="true">
    <template v-for="item in keyLabels" :key="item.note">
      <div v-if="item.isBlack" class="key-label key-label-black"
        :class="{ 'key-label-vertical': item.orientation === 'vertical' }" :style="labelStyle(item)">
        <div v-if="item.shiftHelp" class="key-label-shift">
          <span class="key-shift-badge">SHIFT</span>
          <span>{{ item.shiftHelp }}</span>
        </div>
        <div v-if="item.help" class="key-label-help">{{ item.help }}</div>
      </div>
      <div v-else-if="item.mapping" class="key-label key-label-white"
        :class="{ 'key-label-vertical': item.orientation === 'vertical' }" :style="labelStyle(item)">
        {{ item.mapping }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.keyboard-help-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.key-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  text-align: center;
  line-height: 1.05;
  overflow: hidden;
}

.key-label-black {
  color: #fff;
  justify-content: flex-start;
}

.key-label-white {
  color: #333;
  font-family: 'Courier New', Courier, monospace;
}

.key-label-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  justify-content: center;
}

.key-label-shift {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.key-shift-badge {
  background-color: #7c6b45;
  font-size: 0.75em;
  padding: 0 2px;
  margin-bottom: 2px;
}

.key-label-help {
  margin-bottom: 2px;
}
</style>
