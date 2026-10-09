<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { globals } from '@/lib/globals.js'
import { setSoloMode } from '@/lib/change-scale.js'
import { projectKeyName } from '@/lib/projectKey.js'
import { registerAccordion } from '@/lib/accordionState.js'

// The filters and mode block is collapsible because the Magic/Normal switch is
// not used often. It starts collapsed and its state is remembered per page
// for the session.
const filtersAccordion = ref(null)
let stopAccordion = () => {}

onMounted(() => {
  document.addEventListener('open-mode-filters', openFiltersAccordion)
  if (!filtersAccordion.value)
    return
  stopAccordion = registerAccordion(filtersAccordion.value, 'modeFilters')
  $(filtersAccordion.value).accordion({ exclusive: false })
})

onUnmounted(() => {
  document.removeEventListener('open-mode-filters', openFiltersAccordion)
  stopAccordion()
})

function openFiltersAccordion() {
  const root = filtersAccordion.value ?? document.querySelector('.mode-filters-accordion')
  if (!root)
    return
  try {
    const title = root.querySelector(':scope > .title')
    const content = root.querySelector(':scope > .content')
    if (title)
      title.classList.add('active')
    if (content)
      content.classList.add('active')
    // @ts-ignore: jQuery is a browser global
    if (typeof $ === 'function' && typeof $(root).accordion === 'function')
      // @ts-ignore: Fomantic accordion behaviour
      $(root).accordion('open', 0)
    if (typeof root.scrollIntoView === 'function')
      root.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } catch (error) {
    console.warn('Could not open Filters & mode section', error)
  }
}

function setMagicMode() {
  globals.bypass = false
}

function setNormalPiano() {
  globals.bypass = true
}

// Solo in key sits with the other performance switches above the keyboard:
// it is a safety toggle you flip while playing, not a scale setting.
const soloInKey = computed({
  get: () => globals.soloMode === 'key',
  set: (value) => setSoloMode(value ? 'key' : 'chord'),
})

const keyModeActive = computed(() => globals.scaleFiltering.keyModeActive)

const soloKeyName = computed(() => {
  const key = globals.getActiveKey()
  return key ? projectKeyName(key) : ''
})

</script>

<template>

  <div ref="filtersAccordion" class="ui fluid styled accordion mode-filters-accordion"
    style="background-color: burlywood;">
    <div class="title">
      <i class="dropdown icon"></i>
      Filters &amp; mode
    </div>
    <div class="content">
      <div class="ui one column centered padded stackable grid">
        <div class="three column centered middle aligned row andyshade">
          <div class="center aligned column">
            <label class="checkboxLabel"
              title="Left hand: Left Hand Chord Triggers so that you can play notes and chords on the whole keyboard. 🥸 Note this also turns off Scale Filtering.">
              White note C{{globals.keyboard.lhTriggerOctave}}⇢B{{globals.keyboard.rhJamSoundOctave-1}} one finger chords 
              <input type="checkbox" v-model="globals.enableLhChordTriggers" />
            </label>
          </div>
          <div class="center aligned column">
            <div class="ui compact buttons mode-toggle" data-step="bypass-filtering">
              <button type="button" class="ui button" :class="{ active: !globals.bypass, boldy: !globals.bypass }"
                :aria-pressed="!globals.bypass"
                title="One note chords, white notes conform to the current scale"
                @click="setMagicMode()">
                ✨ Magic mode
              </button>
              <button type="button" class="ui button" :class="{ active: globals.bypass, boldy: globals.bypass }"
                :aria-pressed="globals.bypass"
                title="Bypass filtering, use when playing chords to add to project"
                @click="setNormalPiano()">
                🎹 Normal piano
              </button>
            </div>
            <div class="mode-description">
              {{ globals.bypass
                ? 'Bypass filtering: play a normal piano keyboard'
                : 'One note chords, white notes conform to the current scale.' }}
            </div>
          </div>
          <div class="center aligned column">
            <div class="rh-toggles">
              <label class="checkboxLabel"
                title="Right hand: filter white notes by scale on/off. 🥸 turn this off to play proper jam chords.">
                White notes C{{globals.keyboard.rhJamSoundOctave}}⇢ conform to current Scale
                <input type="checkbox" v-model="globals.scaleFilteringEnabled" />
              </label>
              <label v-if="globals.isProjectLoaded" class="checkboxLabel solo-label"
                title="Solo in key: while the chords change, the right hand stays on the project key scale instead of switching to each chord's scale. You cannot play a wrong note. The 1-4 shortcuts still switch temporarily; press 0 or Shift+Bb on a MIDI keyboard to toggle this. A safety switch for performing.">
                <!-- The badge sits to the left of the label. The row is
                     right-aligned, so the checkbox keeps its position whether or
                     not the badge is shown. -->
                <span v-if="keyModeActive" class="solo-active-badge"
                  title="Every chord is currently filtered to this key scale">
                  Solo in key → {{ soloKeyName }}
                </span>
                <span v-else-if="soloInKey" class="solo-paused-note"
                  title="A temporary scale switch is in force until the next chord trigger">
                  Solo in key (overridden)
                </span>
                <span class="solo-label-text">Solo in key</span>
                <input type="checkbox" v-model="soloInKey" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
/* Collapsible "Filters & mode" header, matching the app's other accordions. */
.mode-filters-accordion > .title {
  font-weight: bold;
  color: #5b4326;
}

.mode-filters-accordion > .content {
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
}

.ui.grid > .row.andyshade {
  padding-top: 6px;
  padding-bottom: 6px;
}

.mode-toggle {
  margin-bottom: 0.4rem;
}

.mode-toggle .ui.button {
  background: #efe3cf;
  color: #5b4326;
  border: 1px solid #c9a86a;
  box-shadow: none;
}

.mode-toggle .ui.button:hover {
  background: #e7d5b5;
  color: #3a2c1a;
}

.mode-toggle .ui.button.active {
  background: #4a6fd4;
  border-color: #2f4fa8;
  color: #fff;
}

.mode-toggle .ui.button.active:hover {
  background: #3a5cc0;
}

.mode-description {
  font-size: 0.9rem;
  color: #5b4326;
}

/* Right-hand toggles. The column shrinks to the widest label and right-aligns
   its content, so the Solo in key checkbox lines up with the "White notes
   conform" checkbox. */
.rh-toggles {
  display: inline-block;
  text-align: right;
}

.rh-toggles > .checkboxLabel {
  display: block;
}

.rh-toggles .checkboxLabel input[type="checkbox"] {
  vertical-align: middle;
}

/* Keep the label text and its checkbox apart. */
.rh-toggles .solo-label input[type="checkbox"] {
  margin-left: 0.55rem;
}

.rh-toggles .solo-label {
  /* inline-flex keeps the row a fixed height, so the checkbox is steady
     whether or not the badge is shown. */
  display: inline-flex;
  align-items: center;
  min-height: 1.4rem;
  margin-top: 0.35rem;
}

/* Solo in key: a performance safety switch. The badge sits to the left of the
   label; the row is right-aligned and narrower than the "White notes conform"
   row, so the checkbox cannot move when the badge appears. */
.solo-active-badge {
  display: inline-block;
  vertical-align: middle;
  margin: 0 0.5rem 0 0;
  padding: 0.02rem 0.4rem;
  border-radius: 999px;
  /* A muted status green, so it does not read as a clickable blue button. */
  background: #d8f0d8;
  color: #256b25;
  border: 1px solid #a8d8a8;
  font-size: 0.7rem;
  font-weight: bold;
  line-height: 1.5;
  white-space: nowrap;
  cursor: default;
}

.solo-paused-note {
  margin: 0 0.5rem 0 0;
  font-size: 0.72rem;
  color: #8a6d3b;
  font-style: italic;
  white-space: nowrap;
  cursor: default;
}

.ui.column.OFFLINE {
  border-width: 2px;
  border-color: green;
  border-style: dashed;
}

.ui.row.OFFLINE {
  border-width: 1px;
  border-color: red;
  border-style: dashed;
}

.ui.grid.OFFLINE {
  border-width: 1px;
  border-color: blue;
  border-style: dashed;
}

.andyshade.OFFLINE {
  border-color: green;
  box-shadow: 0 0 0 1px rgba(34,36,38,.15), 0 0 0 0 rgba(34,36,38,.15) inset;
  border-style: dashed;
  border-width: 1px;
  background-color: #d49969;
}
</style>
