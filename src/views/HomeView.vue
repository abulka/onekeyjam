<script setup>
import { reAllocateChords, reAllocateScales, fillScalesFromKeySignature } from '../../src/lib/boot-project'
import { resetTranspositionsEtc } from '../../src/lib/resetState'
import { captureTakeFromBackground, clearFlashback } from '@/lib/midi/recorder.js'
import { globals } from '@/lib/globals.js'

import Jammer from '@/components/JammerView.vue'
import PageMenubar from '@/components/PageMenubar.vue'

// Logic-style flashback capture, available from the Edit page too. The take it
// recovers appears in the Perform view's Take panel.
function flashbackCapture() {
  const result = captureTakeFromBackground()
  if (result.ok) {
    $('body').toast({
      message: `Flashback Capture recovered ${result.noteCount} note${result.noteCount === 1 ? '' : 's'}. See the Perform view.`,
      displayTime: 2500,
      class: 'teal',
    })
    return
  }
  const message = result.reason === 'recording'
    ? 'Stop recording before using Flashback Capture.'
    : result.reason === 'disabled'
      ? 'Flashback Capture is turned off in Settings.'
      : 'Nothing has been played in the flashback window yet.'
  $('body').toast({ message, displayTime: 2500, class: 'brown' })
}

// Discard the hidden Flashback Capture buffer without touching the current
// take. Handy when debugging what the buffer is holding.
function clearFlashbackBuffer() {
  const result = clearFlashback()
  const message = result.count > 0
    ? `Cleared ${result.count} buffered note${result.count === 1 ? '' : 's'} from Flashback Capture.`
    : 'Flashback Capture buffer is already empty.'
  $('body').toast({ message, displayTime: 2500, class: 'brown' })
}
</script>

<template>
  <main>

    <PageMenubar>
      <template #actions>
        <a class="item" @click="reAllocateChords()" title="Deal a new hand of chords from the pool onto the trigger keys. Keepers (favourites) stay put.">Deal new chords 🎲</a>
        <a class="item" @click="reAllocateScales()">Find Matching Scales 🎹</a>
        <div class="ui divider"></div>
        <a class="item" @click="resetTranspositionsEtc()">Reset Transpositions</a>
        <a class="item" @click="fillScalesFromKeySignature()">Fill with Key Signature</a>
        <div class="ui divider"></div>
        <a
          class="item"
          :class="{ disabled: globals.recording.isRecording || !globals.recording.background.enabled || !globals.recording.background.available }"
          @click="flashbackCapture()"
        >Flashback Capture</a>
        <a
          class="item"
          :class="{ disabled: !globals.recording.background.enabled || !globals.recording.background.available }"
          @click="clearFlashbackBuffer()"
        >Clear Flashback Capture</a>
      </template>
    </PageMenubar>

    <!-- A bit of spacing -->
    <div class="mb-4"></div>

    <Jammer />

  </main>
</template>
