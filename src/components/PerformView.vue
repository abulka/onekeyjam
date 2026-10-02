<script setup>
import { onMounted, onUnmounted } from "vue";
import { keyDownListener, keyUpListener } from "@/lib/midi/livePianoKeyboardShortcuts"
import GrandSummary from './GrandSummary.vue'
import Sequencer from './Sequencer.vue'
import GrandStatus from './GrandStatus.vue';
import ScaleFilteringToggles from './ScaleFilteringToggles.vue'
import KeyboardNoteMeaningsLegend from './KeyboardNoteMeaningsLegend.vue'
import ActiveScale from './ActiveScale.vue'
import ActiveChord from './ActiveChord.vue'
import LivePianoKeyboard from './LivePianoKeyboard.vue'

onMounted(() => {
  console.log('PERFORM onMounted')
  window.addEventListener('keyup', keyUpListener);
  window.addEventListener('keydown', keyDownListener);

  // Wire up fomantic events using jquery 
  $("#big-accordion-perform")  // For nested accordions you only need to initialize the parent accordion.
    .accordion({ exclusive: false })
});

onUnmounted(() => {
  // console.log('PERFORM onUnmounted')
  window.removeEventListener("keyup", keyUpListener);
  window.removeEventListener('keydown', keyDownListener);
});

</script>

<template>

  <GrandStatus />
  <div class="mb-3"></div>
  <div class="ui container mb-4">
    <ScaleFilteringToggles />
  </div>
  <LivePianoKeyboard />
  <div class="ui container mb-4">
    <KeyboardNoteMeaningsLegend />
  </div>
  <div class="ui container">
    <GrandSummary />
  </div>


  <br>

  <!-- accordion -->
  <div class="ui container">
    <div id="big-accordion-perform" class="ui fluid styled accordion" style="background-color: burlywood;">

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

      <div class="title">
        <i class="dropdown icon"></i>
        Chord Sequencer
      </div>
      <div class="content">
        <Sequencer />
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
