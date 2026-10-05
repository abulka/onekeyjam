<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { globals } from '@/lib/globals.js'
import { buildKeyLabels, buildWhiteNoteMappings, chooseTextOrientation, getBlackKeyDisplay, RIGHT_HAND_SCALE_BADGE } from '@/lib/keyboard-help.js'
import { labelForOffset } from '@/lib/midi/piano-key-map.js'
import { indexToNote } from '@/lib/note-tools.js'

const props = defineProps({
  keyboardEl: { type: Object, default: null },
  keys: { type: Number, default: 49 },
})

const WHITE_FONT_PX = 10
const WHITE_FONT = `${WHITE_FONT_PX}px sans-serif`

// Black-key labels start below a small top gap, and the text grows with the key
// width (wide keys come from showing few octaves), within readable limits.
const BLACK_LABEL_TOP = 4
const BLACK_FONT_MIN = 9
const BLACK_FONT_MAX = 12

// Computer-keyboard shortcut badges grow with the key they sit on, so a wide
// keyboard gets larger, more legible badges.
const BADGE_MIN_WIDTH = 15
const BADGE_MAX_WIDTH = 24

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function blackFontSize(blackKeyWidth) {
  return clamp(Math.round(blackKeyWidth * 0.3), BLACK_FONT_MIN, BLACK_FONT_MAX)
}

/** Size a shortcut badge for the key width it sits on. */
function badgeMetrics(keyWidth) {
  const width = clamp(Math.round(keyWidth * 0.5), BADGE_MIN_WIDTH, BADGE_MAX_WIDTH)
  const height = Math.round(width * 0.8)
  const fontSize = clamp(Math.round(height * 0.72), 9, 15)
  return { width, height, fontSize }
}

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

  const pianoMode = globals.bypass
  const whiteNoteMappings = buildWhiteNoteMappings(globals.chordTriggerMap, globals.scaleTriggerMap)
  const raw = buildKeyLabels({
    min: geo.min,
    max: geo.max,
    kf: geo.kf,
    lhTriggerOctave: globals.keyboard.lhTriggerOctave,
    whiteNoteMappings,
    chordTriggerNotes: Object.keys(globals.chordTriggerMap),
    keyboardHelpMode: globals.keyboardHelpMode,
    piano: pianoMode
      ? { baseIndex: 12 * (globals.getRhJamSoundOctave() - globals.getLhTriggerOctave()), octaveShift: globals.computerKeyboard.octaveShift }
      : null,
    scaleFilteringEnabled: globals.scaleFilteringEnabled,
  })

  const minMod = ((geo.min % 12) + 12) % 12
  const shiftActive = globals.blackShiftState
  const blackBadge = badgeMetrics(geo.bwidth)
  // Keep the bottom of the black key clear for the shortcut badge (magic mode only)
  const blackReserve = (globals.showKeyShortcuts && !globals.bypass) ? blackBadge.height + 4 : 2
  const blackFontPx = blackFontSize(geo.bwidth)
  const blackFont = `${blackFontPx}px sans-serif`

  return raw.map((item) => {
    if (item.isBlack) {
      const { help, shiftHelp } = getBlackKeyDisplay(item.help, item.shiftHelp, item.isLeftHand && shiftActive, item.isShiftKey)
      const x = geo.wwidth * geo.ko[minMod] + geo.bwidth * (item.semitoneIndex - geo.min) + 1
      const lines = [shiftHelp, help].filter(Boolean)
      const bottom = geo.bheight - blackReserve
      return {
        ...item,
        help,
        shiftHelp,
        x,
        y: BLACK_LABEL_TOP,
        width: geo.bwidth,
        height: Math.max(bottom - BLACK_LABEL_TOP, 0),
        fontSize: `${blackFontPx}px`,
        orientation: chooseTextOrientation(longestLine(lines), geo.bwidth, blackFont),
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

// Small coloured badges showing the computer keyboard key for each piano key.
const shortcutBadges = computed(() => {
  // In normal piano mode the key letters are the main labels, so no magic
  // computer-key badges are drawn.
  if (globals.bypass || !globals.showKeyShortcuts)
    return []
  const geo = geometry.value
  if (!geo)
    return []

  const minMod = ((geo.min % 12) + 12) % 12
  const blackBase = geo.wwidth * geo.ko[minMod]
  const blackKeyX = (semitone) => blackBase + geo.bwidth * (semitone - geo.min) + 1
  const isBlackAt = (semitone) => geo.kf[((semitone % 12) + 12) % 12] === 1
  const blackBadge = badgeMetrics(geo.bwidth)
  const whiteBadge = badgeMetrics(geo.wwidth)
  const badges = []
  let whiteIndex = 0

  for (let i = geo.min; i <= geo.max; i++) {
    const isBlack = isBlackAt(i)
    const offset = i - geo.min
    const label = labelForOffset(offset)

    if (isBlack) {
      let badgeLabel = label
      // While scale filtering is on, the right-hand black keys are the 1-5
      // scale shortcuts rather than notes, so badge them 1-5.
      if (globals.scaleFilteringEnabled) {
        const note = indexToNote(i - geo.min, globals.keyboard.lhTriggerOctave)
        const pitchClass = note.replace(/-?\d+$/, '')
        const octave = Number((note.match(/-?\d+$/) || ['0'])[0])
        const isLeftHand = Number(octave) === Number(globals.keyboard.lhTriggerOctave)
        if (!isLeftHand)
          badgeLabel = RIGHT_HAND_SCALE_BADGE[pitchClass] || ''
      }
      if (badgeLabel) {
        const keyX = blackKeyX(i)
        badges.push({
          id: `black-${i}`,
          label: badgeLabel,
          isBlack: true,
          x: keyX + geo.bwidth / 2 - blackBadge.width / 2,
          y: geo.bheight - blackBadge.height - 1,
          width: blackBadge.width,
          height: blackBadge.height,
          fontSize: blackBadge.fontSize,
        })
      }
    }
    else {
      if (label) {
        const keyX = geo.wwidth * whiteIndex + 1
        const keyRight = keyX + geo.wwidth - 1
        // White keys are centred under a neighbouring black key, so nudge the
        // badge into the clear strip at the top of the key instead.
        const hasBlackLeft = i - 1 >= geo.min && isBlackAt(i - 1)
        const hasBlackRight = i + 1 < geo.max && isBlackAt(i + 1)
        let freeLeft = keyX
        let freeRight = keyRight
        if (hasBlackLeft)
          freeLeft = Math.max(freeLeft, blackKeyX(i - 1) + geo.bwidth)
        if (hasBlackRight)
          freeRight = Math.min(freeRight, blackKeyX(i + 1))

        let x
        if (freeRight - freeLeft >= whiteBadge.width)
          x = freeLeft + (freeRight - freeLeft) / 2 - whiteBadge.width / 2
        else
          x = keyX + (geo.wwidth - 1) / 2 - whiteBadge.width / 2
        x = Math.max(keyX, Math.min(x, keyRight - whiteBadge.width))

        badges.push({
          id: `white-${i}`,
          label,
          isBlack: false,
          x,
          y: 3,
          width: whiteBadge.width,
          height: whiteBadge.height,
          fontSize: whiteBadge.fontSize,
        })
      }
      whiteIndex++
    }
  }
  return badges
})
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
        <span class="key-label-text" :class="{ 'key-label-chord': item.kind === 'chord' }">{{ item.mapping }}</span>
      </div>
    </template>
    <div v-for="badge in shortcutBadges" :key="badge.id" class="key-shortcut-badge"
      :class="badge.isBlack ? 'key-shortcut-badge-black' : 'key-shortcut-badge-white'"
      :style="{ left: `${badge.x}px`, top: `${badge.y}px`, width: `${badge.width}px`, height: `${badge.height}px`, fontSize: `${badge.fontSize}px` }">
      {{ badge.label }}
    </div>
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

.key-label-chord {
  background-color: #cfe8c8;
  border: 1px solid #8fbf82;
  border-radius: 0;
  padding: 0 3px;
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

.key-shortcut-badge {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
  color: #fff;
  background: #4a6fd4;
  border: 1px solid #2f4fa8;
  border-radius: 3px;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.key-shortcut-badge-black {
  background: #e08b3c;
  border-color: #a9621f;
}
</style>
