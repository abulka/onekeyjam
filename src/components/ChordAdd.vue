<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { globals } from '@/lib/globals.js'
import { registerAccordion } from '@/lib/accordionState.js'
import { chordAddToProjectExact } from "../../src/lib/chordAddToProject.js";
import { replaceCurrentChordExact } from "../../src/lib/replaceCurrentChord";
import { chordAddToProject } from "../../src/lib/chordAddToProject.js";
import { replaceCurrentChord } from "../../src/lib/replaceCurrentChord";
import { chordPickerToJammed, syncCustomVoicingToCurrentChord } from "../../src/lib/chordPicker";
import {
  PICKER_VOICING,
  CUSTOM_VOICING,
  buildVoicingChoices,
  pickVoicingToKeep,
  isReplaceDisabled,
  areVoicingsTheSame,
  nameOptionsFor,
  voicingSourceLabel,
} from "../../src/lib/chordAddHelpers.js"
import ChordAddEditNotes from './ChordAddEditNotes.vue'
import ButtonAudition from './ButtonAudition.vue'

const props = defineProps([
  'chord-picker-chord-name',  // nice name for button to use
  // the rest of these are used in the calls to add and replace chord
  'chord-tonic',
  'chord-type',
  'chord-inversion',
  'chord-bass',
  'audition-info',  // complex object
])

function areSymbols() {
  return globals.currentChordBeingJammed.symbols.length > 0;
}

function chordAdd() {
  chordAddToProject(
    props.chordTonic,
    props.chordType,
    props.chordInversion,
    props.chordBass
  )
}

function chordAddNotes(symbol) {
  chordAddToProjectExact(
    symbol,
    globals.currentChordBeingJammed.chordNotes,
    globals.currentChordBeingJammed.symbols,
    globals.currentChordBeingJammed.bass)
}

function chordReplace() {
  // replace the current lh chord with the current chord in the chord picker
  replaceCurrentChord(
    props.chordTonic,
    props.chordType,
    props.chordInversion,
    props.chordBass
  )
  // The stored chord changed, so reload the custom voicing from it. Otherwise
  // the Voicings list and Edit Notes keep showing the chord just overwritten.
  syncCustomVoicingToCurrentChord()
}

function chordReplaceNotes(symbol) {
  replaceCurrentChordExact(
    symbol,
    globals.currentChordBeingJammed.chordNotes,
    globals.currentChordBeingJammed.symbols,
    globals.currentChordBeingJammed.bass)
  // Reload the custom voicing from the chord that was just written, so it can
  // never keep displaying the defunct notes that were overwritten.
  syncCustomVoicingToCurrentChord()
}

// The two voicings the user can add or replace with: the Chord Picker voicing
// (canonical, built from the combos) and the custom voicing (the exact notes
// from the grid, MIDI or typing). Each row shows its notes and its own audition.
const voicingChoices = computed(() => buildVoicingChoices({
  pickerSymbol: props.chordPickerChordName,
  pickerNotes: props.auditionInfo.defaultVoicing.notes,
  pickerBass: props.auditionInfo.defaultVoicing.bass,
  customSymbol: globals.currentChordBeingJammed.chord,
  customNotes: globals.currentChordBeingJammed.chordNotes,
  customBass: globals.currentChordBeingJammed.bass,
}))

const selectedVoicing = ref('')

const pendingChoice = computed(() =>
  voicingChoices.value.find(choice => choice.id === selectedVoicing.value) ?? null)

const pendingNotes = computed(() => pendingChoice.value?.notes ?? [])

// The chord stored on the selected trigger, used to tag the matching row and
// to explain when a Replace would change nothing.
const storedNotes = computed(() => globals.currentLhNotes())
const storedBass = computed(() => globals.currentBass())

const canReplace = computed(() => areSymbols() && !globals.currentConfigEmpty())

function isChoiceCurrent(choice) {
  return areVoicingsTheSame(choice.notes, storedNotes.value, choice.bass, storedBass.value)
}

// True while the custom voicing is just the clicked grid chord, unedited. A
// replace would be a no-op, so the panel opens on the Chord Picker voicing.
const customIsUneditedGrid = computed(() => {
  const jammed = globals.currentChordBeingJammed
  return jammed.source === 'grid'
    && jammed.chordNotes.length > 0
    && areVoicingsTheSame(jammed.chordNotes, storedNotes.value, jammed.bass, storedBass.value)
})

// Names the custom notes could be stored under. Shown as a small dropdown only
// when more than one name fits, so a chord name is never mistaken for a voicing.
const nameOptions = computed(() => nameOptionsFor({
  symbols: globals.currentChordBeingJammed.symbols,
  fallbackSymbol: globals.currentChordBeingJammed.chord,
}))

const customSourceLabel = computed(() =>
  voicingSourceLabel(globals.currentChordBeingJammed.source))

watch(
  voicingChoices,
  (choices) => {
    // Opening on an unedited grid chord would replace the chord with itself,
    // so start on the Chord Picker voicing, which is a meaningful change.
    if (customIsUneditedGrid.value && choices.some(choice => choice.id === PICKER_VOICING))
      selectedVoicing.value = PICKER_VOICING
    else
      selectedVoicing.value = pickVoicingToKeep(choices, selectedVoicing.value)
  },
  { immediate: true })

function chordAction(strategy = 'add') {
  const choice = pendingChoice.value
  if (!choice)
    return
  if (choice.id === PICKER_VOICING) {
    if (strategy === 'add')
      chordAdd()
    else
      chordReplace()
  }
  else {
    const symbol = globals.currentChordBeingJammed.chord || choice.symbol
    if (strategy == 'add')
      chordAddNotes(symbol)
    else
      chordReplaceNotes(symbol)
  }
}

function onChordAdd() {
  chordAction('add')
}

function resetCustomToPicker() {
  // The Reset button deliberately copies the picker voicing over the custom one.
  chordPickerToJammed(true)
}

function replaceCurrentChordDisabled() {
  // Compare whichever voicing is picked, not always the custom notes.
  return isReplaceDisabled({
    choice: pendingChoice.value,
    storedNotes: globals.currentLhNotes(),
    storedBass: globals.currentBass(),
  })
}

const voicingsAccordion = ref(null)
let stopVoicingsAccordion = () => {}

onMounted(() => {
  // Seed the custom voicing from the picker so the notes editor always has
  // something to work from, even before a grid chord or MIDI note arrives.
  if (!globals.currentChordBeingJammed.chordNotes.length)
    chordPickerToJammed(true)
  document.addEventListener('chord-add', onChordAdd)
  if (voicingsAccordion.value)
    stopVoicingsAccordion = registerAccordion(voicingsAccordion.value, 'chord-add-voicings')
})

onUnmounted(() => {
  document.removeEventListener('chord-add', onChordAdd)
  stopVoicingsAccordion()
})

</script>

<template>

  <!-- add chords  v-if="areSymbols()" -->
  <div class="row">
    <br>

    <!-- Add and Replace buttons -->
    <button @click="chordAction('add')" class="ui small button" :disabled="!pendingChoice" title="Add new chord to Project (Shortcut: /)">Add Chord</button>
    <span v-if="pendingChoice"><code class="ml-1 font-semibold"> {{ pendingChoice.symbol }}</code> <code class="opacity-70">[{{ pendingNotes.join(' ') }}]</code> to Project</span>

    <button @click="chordAction('replace')" v-if="canReplace"
      :disabled="!pendingChoice || replaceCurrentChordDisabled()" class="ui tiny brown button ml-2!"
      :title="replaceCurrentChordDisabled() ? 'The picked notes already match this trigger' : 'Replace this trigger chord'">Replace</button>
    <span v-if="canReplace" :class="{'opacity-50' : replaceCurrentChordDisabled()}">
      <code class="ml-1">{{ globals.currentChordTriggerNote || 'current' }}</code>
      <code class="ml-1"> {{ globals.currentChordName() }} [{{ globals.currentLhNotes().join(' ') }}]</code>
      <span class="mx-1">→</span>
      <code v-if="pendingChoice" class="font-semibold">{{ pendingChoice.symbol }} [{{ pendingNotes.join(' ') }}]</code>
      <span v-if="props.chordInversion != 0" class="ml-1">(inv {{ props.chordInversion }})</span>
      <span v-if="pendingChoice && replaceCurrentChordDisabled()" class="replace-nochange">
        No change — these are already the notes on {{ globals.currentChordTriggerNote }}.
      </span>
    </span>


    <div ref="voicingsAccordion" class="ui fluid styled accordion" style="background-color: burlywood;">


      <div class="title" data-accordion-section="voicings">
        <i class="dropdown icon"></i>
        Voicings
      </div>
      <div class="content">
        <p class="mb-1 mt-2" title="Pick which set of notes Add and Replace will write into the project">
          Notes to write:
        </p>
        <div v-for="choice of voicingChoices" :key="choice.id" class="voicing-row">
          <input type="radio" :id="'voicing-' + choice.id" :value="choice.id" v-model="selectedVoicing"
            :disabled="voicingChoices.length == 1">
          <label :for="'voicing-' + choice.id" class="ml-1">
            {{ choice.label }}
            <span v-if="choice.id === CUSTOM_VOICING && customSourceLabel" class="voicing-source">{{ customSourceLabel }}</span>
            <span v-if="isChoiceCurrent(choice)" class="voicing-current">current chord</span>
          </label>
          <ButtonAudition class="ml-1!" :notes="choice.notes" :bass="choice.bass" />
          <code>[{{ choice.notes.join(' ') }}]</code>
          <span v-if="choice.id === CUSTOM_VOICING && choice.bass" class="voicing-bass">bass {{ choice.bass }}</span>
          <label v-if="choice.id === CUSTOM_VOICING && nameOptions.length > 1" class="voicing-name ml-2">
            store as
            <select v-model="globals.currentChordBeingJammed.chord">
              <option v-for="name in nameOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </label>
        </div>
        <div v-if="voicingChoices.length === 1" class="voicing-note opacity-70">
          The custom voicing is the same as the Chord Picker voicing. Edit the notes below to make it different.
        </div>
      </div>




      <div class="title" data-accordion-section="edit-notes">
        <i class="dropdown icon"></i>
        Edit Notes
      </div>
      <div class="content">
        <div class="row">
          <ChordAddEditNotes
            :chord-picker-chord-name="props.chordPickerChordName"
            :audition-info="props.auditionInfo"
            @reset-to-picker-voicing="resetCustomToPicker" />
        </div>
      </div>


    </div>


  </div>
  <!-- <span v-else>Nothing to add - please select a chord using the chord picker, or enter enough notes to form a
    chord.</span> -->

</template>

<style scoped>
.voicing-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0.35rem;
}

.voicing-source {
  margin-left: 0.35rem;
  padding: 0 0.35rem;
  border-radius: 3px;
  background: #efe6d6;
  color: #6b5a45;
  font-size: 0.75rem;
  font-style: italic;
}

.voicing-current {
  margin-left: 0.35rem;
  padding: 0 0.35rem;
  border-radius: 3px;
  background: #d8f0d8;
  color: #256b25;
  border: 1px solid #a8d8a8;
  font-size: 0.72rem;
  font-weight: bold;
}

.voicing-bass {
  margin-left: 0.4rem;
  color: #6b5a45;
  font-size: 0.8rem;
}

.replace-nochange {
  margin-left: 0.5rem;
  color: #8a6d3b;
  font-style: italic;
  font-size: 0.85rem;
}

.voicing-name {
  color: #6b5a45;
}

.voicing-note {
  margin-top: 0.25rem;
  font-size: 0.85rem;
}
</style>
