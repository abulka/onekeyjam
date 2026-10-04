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
