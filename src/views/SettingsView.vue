<script setup>
import { onMounted, onUnmounted } from 'vue'
import PageMenubar from '@/components/PageMenubar.vue'
import MidiKeyboardsDetected from '@/components/MidiKeyboardsDetected.vue'
import DebugAdmin from '@/components/DebugAdmin.vue'
import { registerAccordion } from '@/lib/accordionState.js'
import { globals } from '@/lib/globals.js'

let stopAccordion = () => {}

onMounted(() => {
  stopAccordion = registerAccordion(document.querySelector('#big-accordion-settings'), 'settings')
  $('#big-accordion-settings').accordion({ exclusive: false })
})

onUnmounted(() => stopAccordion())
</script>

<template>
  <main>

    <PageMenubar />

    <div class="mb-4"></div>

    <div class="ui container">
      <div id="big-accordion-settings" class="ui fluid styled accordion" style="background-color: burlywood;"
        data-step="settings">

        <div class="title">
          <i class="dropdown icon"></i>
          Preferences
        </div>
        <div class="content">
          <div>
            <label class="checkboxLabel" title="Show the welcome message when a demo project is loaded">
              <input type="checkbox" v-model="globals.showWelcomeDialog" />
              Show the welcome message when opening a demo project
            </label>
          </div>
          <div class="mt-2">
            <label class="checkboxLabel" title="Show the favourite and bin columns in the chord/scale table. Usually only useful while importing from MIDI.">
              <input type="checkbox" v-model="globals.showFavouriteBinColumns" />
              Show favourite and bin columns in the chord/scale table
            </label>
          </div>
          <div class="mt-2">
            <label class="checkboxLabel" title="Show a strip of the last four chord-to-scale choices above the chord/scale grid.">
              <input type="checkbox" v-model="globals.showScaleHistory" />
              Show the recent chord-to-scale history above the grid
            </label>
            <p class="settings-hint">
              The strip lists the last four chord-to-scale choices, newest first,
              each with a badge naming the policy that chose it (manual, follow
              or shuffle). A scale that uses notes outside the project key is
              tinted amber. It is useful while learning what the follow and
              shuffle modes are doing.
            </p>
          </div>
        </div>

        <div class="title">
          <i class="dropdown icon"></i>
          Held note repair
        </div>
        <div class="content">
          <p class="settings-explainer">
            When a chord trigger changes the scale just after you have played a
            right-hand solo note, the note would otherwise keep the old scale and
            sound out of place. Repair moves that still-sounding note onto the
            new scale, so it does not matter whether the solo note or the chord
            arrived first. Notes you are holding deliberately are left alone,
            and nothing is moved while recording.
          </p>
          <div>
            <label class="checkboxLabel" title="Move a still-sounding solo note onto the new scale after a chord trigger changes it.">
              <input type="checkbox" v-model="globals.heldNoteRepair.enabled" />
              Repair held solo notes when the scale changes
            </label>
          </div>
          <div class="mt-2" v-if="globals.heldNoteRepair.enabled">
            <label title="How recently the held note must have started to be repaired. A short window re-attacks so quickly it is barely audible; a long window also moves notes you are holding deliberately.">
              Window:
              <select v-model.number="globals.heldNoteRepair.windowMs">
                <option :value="25">25 ms</option>
                <option :value="40">40 ms</option>
                <option :value="60">60 ms</option>
                <option :value="100">100 ms</option>
                <option :value="100000">any</option>
              </select>
            </label>
          </div>
        </div>

        <div class="title">
          <i class="dropdown icon"></i>
          MIDI Keyboard Config
        </div>
        <div class="content">
          <MidiKeyboardsDetected />
        </div>

        <div class="title">
          <i class="dropdown icon"></i>
          Debug
        </div>
        <div class="content">
          <DebugAdmin />
        </div>

      </div>
    </div>

  </main>
</template>

<style scoped>
.settings-explainer {
  max-width: 60ch;
  color: #5a3d1a;
}

.settings-hint {
  max-width: 60ch;
  margin: 0.25rem 0 0 1.5rem;
  color: #6b5a45;
  font-size: 0.9rem;
}
</style>
