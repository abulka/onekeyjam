<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import { keyDownListener, keyUpListener } from "@/lib/midi/livePianoKeyboardShortcuts"
import { registerAccordion } from "@/lib/accordionState.js"
import { consumeTakeSectionOpenRequest } from "@/lib/takeSectionRequest.js"
import { globals } from '@/lib/globals.js'
import PageMenubar from './PageMenubar.vue'
import GrandSummary from './GrandSummary.vue'
import GrandStatus from './GrandStatus.vue';
import ScaleFilteringToggles from './ScaleFilteringToggles.vue'
import ActiveScale from './ActiveScale.vue'
import ActiveChord from './ActiveChord.vue'
import LivePianoKeyboard from './LivePianoKeyboard.vue'
import TakePanel from './TakePanel.vue'
import Sequencer from './Sequencer.vue'

const recorder = ref(null)
const sequencer = ref(null)

function playChordSequencer() {
  if (sequencer.value?.isPlaying)
    sequencer.value.stop()
  else
    sequencer.value?.playIfHasNotes()
}

function toggleRecord() {
  recorder.value?.toggleRecord()
}

function exportTake() {
  recorder.value?.exportTake()
}

/**
 * The Take section's title element (the first `.title` in the accordion).
 * @returns {Element|null}
 */
function takeSectionTitle() {
  const accordion = document.querySelector('#big-accordion-perform')
  if (!accordion)
    return null
  return Array.from(accordion.children).find(child => child.classList.contains('title')) || null
}

/** Bring the Take section into view. */
function scrollToTakeSection() {
  const title = takeSectionTitle()
  if (title)
    title.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Open the Take accordion section (the first one). Safe to call when it is
 * already open. `scrollToSection` also brings it into view, which the
 * cross-page Flashback Capture needs because it sits below the keyboard.
 * @param {boolean} [scrollToSection]
 */
function openTakeSection(scrollToSection = false) {
  const accordion = document.querySelector('#big-accordion-perform')
  if (!accordion || typeof $ !== 'function')
    return
  $(accordion).accordion('open', 0)
  if (scrollToSection)
    scrollToTakeSection()
}

function captureTake() {
  // The capture prompt and result live in the Take section, so make sure it
  // is open even when the action is triggered from this menu.
  openTakeSection()
  recorder.value?.captureTake()
}

function clearFlashbackBuffer() {
  // The Take section owns the toast, so open it first.
  openTakeSection()
  recorder.value?.clearFlashback()
}

let stopAccordion = () => {}

onMounted(() => {
  console.log('PERFORM onMounted')
  window.addEventListener('keyup', keyUpListener);
  window.addEventListener('keydown', keyDownListener);

  // Wire up fomantic events using jquery 
  stopAccordion = registerAccordion(document.querySelector('#big-accordion-perform'), 'perform')
  $("#big-accordion-perform")  // For nested accordions you only need to initialize the parent accordion.
    .accordion({ exclusive: false })

  // Flashback Capture on the Edit page navigates here and asks for the Take
  // section to be open. The request is read only after the accordion above is
  // initialised; the scroll waits a beat so the router's own scroll
  // restoration and the open animation settle first.
  if (consumeTakeSectionOpenRequest()) {
    nextTick(() => {
      openTakeSection()
      setTimeout(scrollToTakeSection, 300)
    })
  }
});

onUnmounted(() => {
  // console.log('PERFORM onUnmounted')
  window.removeEventListener("keyup", keyUpListener);
  window.removeEventListener('keydown', keyDownListener);
  stopAccordion();
});

</script>

<template>

  <PageMenubar>
    <template #actions>
      <a class="item" :class="{ disabled: !sequencer?.hasNotes }" @click="playChordSequencer()">
        {{ sequencer?.isPlaying ? 'Pause Pattern Sequencer' : 'Play Pattern Sequencer' }}
      </a>
      <a class="item" @click="toggleRecord()">{{ globals.recording.isRecording ? 'Stop Recording' : 'Record' }}</a>
      <a class="item" :class="{ disabled: globals.recording.isRecording || !globals.recording.background.enabled || !globals.recording.background.available }" @click="captureTake()">Flashback Capture</a>
      <a class="item" :class="{ disabled: !globals.recording.background.enabled || !globals.recording.background.available }" @click="clearFlashbackBuffer()">Clear Flashback Capture</a>
      <a class="item" :class="{ disabled: !globals.recording.hasTake }" @click="exportTake()">Export MIDI</a>
    </template>
  </PageMenubar>

  <!-- A bit of spacing -->
  <div class="mb-4"></div>

  <GrandStatus />
  <div class="mb-3"></div>
  <div class="ui container mb-1">
    <ScaleFilteringToggles />
  </div>
  <LivePianoKeyboard />

  <br>

  <!-- accordion -->
  <div class="ui container">
    <div id="big-accordion-perform" class="ui fluid styled accordion" style="background-color: burlywood;">

      <div class="title" data-accordion-section="take">
        <i class="dropdown icon"></i>
        Take
      </div>
      <div class="content">
        <TakePanel ref="recorder" />
      </div>

      <div class="title" data-accordion-section="pattern-sequencer">
        <i class="dropdown icon"></i>
        Pattern Sequencer
      </div>
      <div class="content">
        <Sequencer ref="sequencer" />
      </div>

      <div class="title" data-accordion-section="chord-scale-table">
        <i class="dropdown icon"></i>
        Chord / Scale Table
      </div>
      <div class="content">
        <GrandSummary />
      </div>

      <div class="title" data-accordion-section="active-chord">
        <i class="dropdown icon"></i>
        Active Chord
      </div>
      <div id="activeChord" class="content">
        <ActiveChord />
      </div>

      <div class="title" data-accordion-section="active-scale">
        <i class="dropdown icon"></i>
        Active Scale
      </div>
      <div class="content">
        <ActiveScale />
      </div>

    </div> <!-- end of main accordion -->
  </div> <!-- end of container -->


</template>

<style scoped>
.ui.container.OFFLINE {
  border-width: 1px;
  border-color: green;
  border-style: dashed;
}
</style>
