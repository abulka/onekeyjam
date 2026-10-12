<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import PageMenubar from '@/components/PageMenubar.vue'
import MidiKeyboardsDetected from '@/components/MidiKeyboardsDetected.vue'
import DebugAdmin from '@/components/DebugAdmin.vue'
import { registerAccordion } from '@/lib/accordionState.js'
import { globals } from '@/lib/globals.js'
import { BACKGROUND_WINDOW_OPTIONS, BACKGROUND_SILENCE_OPTIONS } from '@/lib/midi/background-recorder.js'
import { KEYBOARD_OCTAVE_MIN, KEYBOARD_OCTAVE_MAX } from '@/lib/uiPrefs.js'

function backgroundWindowLabel(sec) {
  return sec < 60 ? `${sec} seconds` : `${sec / 60} minute${sec / 60 === 1 ? '' : 's'}`
}

function backgroundSilenceLabel(sec) {
  return sec === 0 ? 'Never' : `${sec} seconds`
}

const fixedVelocityLabel = computed(() => Number(globals.fixedNoteVelocity).toFixed(2))

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

        <div class="title" data-accordion-section="preferences">
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
          <div class="mt-2 settings-suboption">
            <label title="Velocity for notes that do not come from a MIDI keyboard: the computer keyboard, the pattern sequencer and auditions. Live MIDI keyboards keep their own velocity. The same value is recorded, so the take sounds like what you played.">
              Fixed note velocity (computer keyboard / pattern):
              <input type="range" min="0.1" max="1" step="0.05" v-model.number="globals.fixedNoteVelocity"
                class="velocity-slider" />
              <b>{{ fixedVelocityLabel }}</b>
            </label>
            <p class="settings-hint">
              The on-screen and computer keyboard, pattern chords and auditions
              all use this velocity, and it is recorded into the take, so playback
              matches what you heard. An external MIDI keyboard still records your
              real playing dynamics.
            </p>
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
          <div class="mt-2 settings-suboption">
            <label title="How many octaves to squeeze onto the screen before scrolling instead.">
              Fit up to
              <select v-model.number="globals.keyboardFitOctaves">
                <option :value="KEYBOARD_OCTAVE_MIN">2 octaves</option>
                <option :value="3">3 octaves</option>
                <option :value="4">4 octaves</option>
                <option :value="5">5 octaves</option>
                <option :value="KEYBOARD_OCTAVE_MAX">6 octaves (always fit)</option>
              </select>
              before scrolling the keyboard
            </label>
            <p class="settings-hint">
              Adding octaves squeezes the keys until this limit, then the
              keyboard keeps its 2-octave key size and grows wider instead, so
              the extra notes are reached with the Scroll buttons or the
              scrollbar.
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
          <div class="mt-2 settings-suboption" v-if="globals.recording.background.enabled">
            <label title="Clear the hidden buffer after this much silence, so a forgotten take is not recovered long after you stopped playing. Any chord trigger or solo note restarts the countdown.">
              Clear after silence:
              <select v-model.number="globals.recording.background.silenceSec">
                <option v-for="sec in BACKGROUND_SILENCE_OPTIONS" :key="sec" :value="sec">
                  {{ backgroundSilenceLabel(sec) }}
                </option>
              </select>
            </label>
            <p class="settings-hint">
              When nothing has been played for this long, the buffer empties
              itself, so Flashback Capture only offers what you just played.
              Choose Never to keep the buffer until it falls out of the capture
              window or you clear it by hand.
            </p>
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

        <div class="title" data-accordion-section="midi-keyboard-config">
          <i class="dropdown icon"></i>
          MIDI Keyboard Config
        </div>
        <div class="content">
          <MidiKeyboardsDetected />
        </div>

        <div class="title" data-accordion-section="debug">
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

/* The fit-limit hint sits inside its suboption row, so drop its usual indent
to keep it lined up with the other hints. */
.settings-suboption > .settings-hint {
  margin-left: 0;
}

.velocity-slider {
  vertical-align: middle;
  margin: 0 0.4rem;
  width: 10rem;
}
</style>
