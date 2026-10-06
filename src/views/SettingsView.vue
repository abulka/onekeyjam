<script setup>
import { onMounted, onUnmounted } from 'vue'
import PageMenubar from '@/components/PageMenubar.vue'
import MidiKeyboardsDetected from '@/components/MidiKeyboardsDetected.vue'
import DebugAdmin from '@/components/DebugAdmin.vue'
import { registerAccordion } from '@/lib/accordionState.js'
import { globals } from '@/lib/globals.js'
import { BACKGROUND_WINDOW_OPTIONS } from '@/lib/midi/background-recorder.js'

function backgroundWindowLabel(sec) {
  return sec < 60 ? `${sec} seconds` : `${sec / 60} minute${sec / 60 === 1 ? '' : 's'}`
}

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
          <div class="mt-2">
            <label class="checkboxLabel" title="Paint a pale background behind the current scale-filter cell as well as its border. When off, the current cell is marked by its border only.">
              <input type="checkbox" v-model="globals.showScaleCellFill" />
              Fill the current scale filter cell
            </label>
            <p class="settings-hint">
              With this on, the cell for the sounding scale filter gets a pale
              background, in manual, follow and shuffle modes alike. Leave it off
              for a quieter grid where only the border marks the current cell.
            </p>
          </div>
          <div class="mt-2">
            <label class="checkboxLabel" title="Keep the last few minutes of playing in a hidden buffer so you can recover a take you forgot to record.">
              <input type="checkbox" v-model="globals.recording.background.enabled" />
              Flashback Capture: keep the last few minutes of playing in the background
            </label>
            <p class="settings-hint">
              With this on, whatever you play is kept in a hidden rolling buffer.
              The "Flashback Capture" action in the Record section, the Edit and
              Perform Actions menus turns the recent playing into the current
              take, so nothing is lost when you forget to press Record. The buffer
              is held in memory only.
            </p>
          </div>
          <div class="mt-2 settings-suboption" v-if="globals.recording.background.enabled">
            <label title="How far back the hidden buffer keeps notes.">
              Capture window:
              <select v-model.number="globals.recording.background.windowSec">
                <option v-for="sec in BACKGROUND_WINDOW_OPTIONS" :key="sec" :value="sec">
                  {{ backgroundWindowLabel(sec) }}
                </option>
              </select>
            </label>
          </div>
          <div class="mt-2">
            <label class="checkboxLabel" title="Move a still-sounding solo note onto the new scale after a chord trigger changes it.">
              <input type="checkbox" v-model="globals.heldNoteRepair.enabled" />
              Repair held solo notes when the scale changes
            </label>
            <p class="settings-hint">
              When a chord trigger changes the scale just after you have played a
              right-hand solo note, the note would otherwise keep the old scale
              and sound out of place. Repair moves that still-sounding note onto
              the new scale, so it does not matter whether the solo note or the
              chord arrived first. Notes you are holding deliberately are left
              alone, and nothing is moved while recording.
            </p>
            <div class="mt-2 settings-suboption" v-if="globals.heldNoteRepair.enabled">
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
.settings-hint {
  max-width: 60ch;
  margin: 0.25rem 0 0 1.5rem;
  color: #6b5a45;
  font-size: 0.9rem;
}

.settings-suboption {
  margin-left: 1.5rem;
}
</style>
