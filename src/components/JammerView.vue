<script setup>
import { onMounted, onUnmounted } from "vue";
import { globals } from '../lib/globals.js'
import { keyDownListener, keyUpListener } from "@/lib/midi/livePianoKeyboardShortcuts"
import GrandSummary from './GrandSummary.vue'
import ChordPicker from './ChordPicker.vue'
import ScalePicker from './ScalePicker.vue'
import MidiParser from './MidiParser.vue'
import GrandStatus from './GrandStatus.vue';
import ScaleFilteringToggles from './ScaleFilteringToggles.vue'
import KeyboardNoteMeaningsLegend from './KeyboardNoteMeaningsLegend.vue'
import DebugAdmin from './DebugAdmin.vue'
import MidiKeyboardsDetected from './MidiKeyboardsDetected.vue'
import LivePianoKeyboard from './LivePianoKeyboard.vue'

onMounted(() => {
  console.log('JAMMER onMounted')
  window.addEventListener('keyup', keyUpListener);
  window.addEventListener('keydown', keyDownListener);

  // Wire up fomantic events using jquery 
  $("#big-accordion")  // For nested accordions you only need to initialize the parent accordion.
    .accordion({ exclusive: false })
  $('.ui.dropdown')
    .dropdown({ action: 'select' })  // select means activates menu but does not change current text
  $('.ui.dropdown.chordpicker')
    .dropdown({ fullTextSearch: true, ignoreCase: false, ignoreSearchCase: false })
  $('.tabular.menu .item').tab()

});

onUnmounted(() => {
  // console.log('JAMMER onUnmounted')
  // Tip: All jquery events will automatically be unbound when the component is unmounted.
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
    <div id="big-accordion" class="ui fluid styled accordion" style="background-color: burlywood;">


      <div class="title">
        <i class="dropdown icon" data-step="edit-chords"></i>
        Edit Chords
      </div>
      <div id="chordPicker" class="content">
        <ChordPicker />
      </div>


      <div class="title">
        <i class="dropdown icon"></i>
        Edit Scales
      </div>
      <div id="chordPicker" class="content ">
        <ScalePicker />
      </div>



      <!-- 
      <div class="title">
        <i class="dropdown icon"></i>
        Active Chord
      </div>
      <div id="activeChord" class="content">
        <ActiveChord />

      </div> -->


      <!-- <div class="title">
        <i class="dropdown icon"></i>
        Active Scale
      </div>
      <div class="content">
        <ActiveScale />
      </div> -->



      <!-- <div class="title">
        <i class="dropdown icon"></i>
        Chord Sequencer
      </div>
      <div class="content">
        <Sequencer />
      </div> -->


      <div class="title">
        <i class="dropdown icon"></i>
        Import Midi File
      </div>
      <div class="content">
        <MidiParser />
      </div>


      <div class="title">
        <i class="dropdown icon"></i>
        MIDI Keyboard Config
      </div>
      <div class="content">
        <MidiKeyboardsDetected />
      </div>


      <div v-if="globals.superUser" class="title">
        <i class="dropdown icon"></i>
        Debug
      </div>
      <div class="content" v-if="globals.superUser">
        <DebugAdmin />
      </div>


    </div> <!-- end of main accordion -->

    <!-- <div class="ui container">
      <br>
      <a class="item" href="#" @click="saveProject()"><i class="file icon"></i>Emergency Save Project...</a>
      <br>
      <br>
    </div> -->

  </div> <!-- end of container -->



</template>

<style scoped>
.row.OFFLINE {
  border-width: 1px;
  border-color: aquamarine;
  border-style: solid;
}

.column.OFFLINE {
  border-width: 1px;
  border-color: red;
  border-style: dotted;
}

.ui.container.OFFLINE {
  border-width: 1px;
  border-color: green;
  border-style: dashed;
}
</style>
