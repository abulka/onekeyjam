<script setup>
import { onMounted, onUnmounted } from 'vue'
import { keyDownListener, keyUpListener } from '@/lib/midi/livePianoKeyboardShortcuts'
import GrandStatus from './GrandStatus.vue'
import LivePianoKeyboard from './LivePianoKeyboard.vue'
import KeyboardNoteMeaningsLegend from './KeyboardNoteMeaningsLegend.vue'
import RecordControls from './RecordControls.vue'
import Sequencer from './Sequencer.vue'

onMounted(() => {
  console.log('RECORD onMounted')
  window.addEventListener('keyup', keyUpListener)
  window.addEventListener('keydown', keyDownListener)

  $('#big-accordion-record').accordion({ exclusive: false })
})

onUnmounted(() => {
  window.removeEventListener('keyup', keyUpListener)
  window.removeEventListener('keydown', keyDownListener)
})
</script>

<template>
  <GrandStatus />
  <div class="mb-3"></div>

  <RecordControls />

  <LivePianoKeyboard />
  <div class="ui container mb-4">
    <KeyboardNoteMeaningsLegend />
  </div>

  <br>

  <div class="ui container">
    <div id="big-accordion-record" class="ui fluid styled accordion" style="background-color: burlywood;">

      <div class="title">
        <i class="dropdown icon"></i>
        Chord Sequencer
      </div>
      <div class="content">
        <Sequencer />
      </div>

    </div>
  </div>
</template>
