<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { keyDownListener, keyUpListener } from "@/lib/midi/livePianoKeyboardShortcuts"
import { registerAccordion } from "@/lib/accordionState.js"
import { globals } from '@/lib/globals.js'
import PageMenubar from './PageMenubar.vue'
import GrandSummary from './GrandSummary.vue'
import GrandStatus from './GrandStatus.vue';
import ScaleFilteringToggles from './ScaleFilteringToggles.vue'
import ActiveScale from './ActiveScale.vue'
import ActiveChord from './ActiveChord.vue'
import LivePianoKeyboard from './LivePianoKeyboard.vue'
import RecordControls from './RecordControls.vue'
import RecordingPianoRoll from './RecordingPianoRoll.vue'
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

function captureTake() {
  // The capture prompt and result live in the Record section, so make sure it
  // is open even when the action is triggered from this menu.
  $('#big-accordion-perform').accordion('open', 0)
  recorder.value?.captureTake()
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
        {{ sequencer?.isPlaying ? 'Stop Chord Sequencer' : 'Play Chord Sequencer' }}
      </a>
      <a class="item" @click="toggleRecord()">{{ globals.recording.isRecording ? 'Stop Recording' : 'Record' }}</a>
      <a class="item" :class="{ disabled: globals.recording.isRecording || !globals.recording.background.enabled || !globals.recording.background.available }" @click="captureTake()">Flashback Capture</a>
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

      <div class="title">
        <i class="dropdown icon"></i>
        Record
      </div>
      <div class="content">
        <RecordControls ref="recorder" />
      </div>

      <div class="title">
        <i class="dropdown icon"></i>
        Recording Sequencer
      </div>
      <div class="content">
        <RecordingPianoRoll />
      </div>

      <div class="title">
        <i class="dropdown icon"></i>
        Chord Sequencer
      </div>
      <div class="content">
        <Sequencer ref="sequencer" />
      </div>

      <div class="title">
        <i class="dropdown icon"></i>
        Chord / Scale Table
      </div>
      <div class="content">
        <GrandSummary />
      </div>

      <div class="title">
        <i class="dropdown icon"></i>
        Active Chord
      </div>
      <div id="activeChord" class="content">
        <ActiveChord />
      </div>

      <div class="title">
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
