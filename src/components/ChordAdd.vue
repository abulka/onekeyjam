<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { globals } from '@/lib/globals.js'
import { registerAccordion } from '@/lib/accordionState.js'
import { chordAddToProjectExact } from "../../src/lib/chordAddToProject.js";
import { replaceCurrentChordExact } from "../../src/lib/replaceCurrentChord";
import { chordAddToProject } from "../../src/lib/chordAddToProject.js";
import { replaceCurrentChord } from "../../src/lib/replaceCurrentChord";
import { arraysAreEqual } from "../../src/lib/array-tools"
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

const emit = defineEmits(['chord-picker-to-jammed'])

function chordPickerToJammed() {
    emit('chord-picker-to-jammed', {})
}


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
}

function chordReplaceNotes(symbol) {
  replaceCurrentChordExact(
    symbol,
    globals.currentChordBeingJammed.chordNotes,
    globals.currentChordBeingJammed.symbols,
    globals.currentChordBeingJammed.bass)
}

const notesTheSame = computed({
  get: () => {
    const notes = props.auditionInfo.defaultVoicing.notes

    // compare with notes of current jammed chord
    const notesSame = arraysAreEqual(notes, globals.currentChordBeingJammed.chordNotes)

    // console.log('notesTheSame', notesSame, notes, globals.currentChordBeingJammed.chordNotes)

    return notesSame
  }
})


function chordAction(strategy = 'add', symbol) {
  if (symbol == '')
    return
  if (symbol.includes('-default-voicing')) {
    if (strategy == 'add')
      chordAdd()
    else
      chordReplace()
  }
  else {
    if (strategy == 'add')
      chordAddNotes(symbol)
    else
      chordReplaceNotes(symbol)
  }
}


const radioSymbols = ref([])
const radioPicked = ref('')

const removeDefaultVoicingSuffix = (symbol) => {
  return symbol.replace('-default-voicing', '')
}
const lastRadioSymbol = computed(() => {
  return radioSymbols.value.length > 0 ? radioSymbols.value[radioSymbols.value.length - 1] : ''
})

// Watch two sources because the current chord being jammed (esp. .chordNotes)
// and the chord picker chord both change what symbols are available to add to
// the project. This watch takes an array of refs to watch and a function to
// call when they change.
watch(
  [globals.currentChordBeingJammed, () => props.chordPickerChordName],  // first param, list of what to watch
  ([currentChordBeingJammed, chordPickerChordName]) => {  // function to call when they change, takes an array of the values of the refs
    rebuildRadioSymbols(currentChordBeingJammed, chordPickerChordName)
  })

const voicingsAccordion = ref(null)
let stopVoicingsAccordion = () => {}

onMounted(() => {
  rebuildRadioSymbols(globals.currentChordBeingJammed, props.chordPickerChordName)
  document.addEventListener('chord-add', onChordAdd)
  if (voicingsAccordion.value)
    stopVoicingsAccordion = registerAccordion(voicingsAccordion.value, 'chord-add-voicings')
})

onUnmounted(() => {
  document.removeEventListener('chord-add', onChordAdd)
  stopVoicingsAccordion()
})

function rebuildRadioSymbols(currentChordBeingJammed, chordPickerChordName) {
  // console.log('rebuildRadioSymbols', currentChordBeingJammed, chordPickerChordName)

  // Build list of symbols to show in the radio buttons
  const defaultVoicing = !notesTheSame.value ? [`${chordPickerChordName}-default-voicing`] : []
  radioSymbols.value = [...currentChordBeingJammed.symbols, ...defaultVoicing]

  radioPicked.value = radioSymbols.value[0]

}

function onChordAdd() {
  chordAction('add', radioPicked.value)
}

function replaceCurrentChordDisabled() {
  // return globals.currentChordName() == radioPicked.value
  return arraysAreEqual(globals.currentChordBeingJammed.chordNotes, globals.currentLhNotes())
}

</script>

<template>

  <!-- add chords  v-if="areSymbols()" -->
  <div class="row">
    <br>

    <!-- Add and Replace buttons -->
    <button @click="chordAction('add', radioPicked)" class="ui small button" :disabled="!radioPicked" title="Add new chord to Project (Shortcut: F5)">Add Chord</button>
    <span><code class="ml-1 font-semibold"> {{ removeDefaultVoicingSuffix(radioPicked) }}</code> to Project</span>

    <button @click="chordAction('replace', radioPicked)" v-if="areSymbols() && !globals.currentConfigEmpty()"
      :disabled="!radioPicked || replaceCurrentChordDisabled()" class="ui tiny brown button ml-2!" title="Replace current Project Chord">Replace</button>
    <span v-if="areSymbols() && !globals.currentConfigEmpty()" :class="{'opacity-50' : replaceCurrentChordDisabled()}">
      <code class="ml-1"> {{ globals.currentChordName() }}</code> with
      <code class="ml-1 font-semibold"> {{ radioPicked }}</code>
      <span v-if="props.chordInversion != 0" class="ml-1">(inv {{ props.chordInversion }})</span>
    </span>


    <div ref="voicingsAccordion" class="ui fluid styled accordion" style="background-color: burlywood;">


      <div class="title" data-accordion-section="voicings">
        <i class="dropdown icon"></i>
        Voicings
      </div>
      <div class="content">
        <!-- Radio input buttons, if there are more than one symbol choices -->
        <p class="mb-1 mt-2" title="Interpretation of Jammed/Edited Chord Notes">
          <span v-if="radioSymbols.length > 1">Choose interpretation</span>
          <span v-else>Interpretation</span>
          of Chord Notes 
          <ButtonAudition class="ml-1!" :notes="props.auditionInfo.currentChordBeingJammed.notes" :bass="props.auditionInfo.currentChordBeingJammed.bass" />
          <code>[{{globals.currentChordBeingJammed.chordNotes.join(' ')}}]</code> 
        </p>
        <div v-for="symbol of radioSymbols" :key="symbol" class="inline mr-4">

          <p v-if="symbol.includes('-default-voicing')" class="mb-1 mt-3!" 
          title="Default Chord Picker chord note voicing of the detected chord symbol">
          Use default Chord Picker voicing 
          <ButtonAudition class="ml-1!" :notes="props.auditionInfo.defaultVoicing.notes" :bass="props.auditionInfo.defaultVoicing.bass" />
          <code>[{{props.auditionInfo.defaultVoicing.notes.join(' ')}}]</code></p>

          <input type="radio" :id="symbol" :value="symbol" v-model="radioPicked" :disabled="radioSymbols.length == 1">
          <label :for="symbol" class="ml-1">{{ removeDefaultVoicingSuffix(symbol) }}</label>

        </div>
        <!-- Show dimmed default voicing area if it wasn't already shown - so that UI doesn't jump around -->
        <div v-if="!lastRadioSymbol.includes('-default-voicing')" class="inline mr-4">
          <p class="mb-1 mt-3! opacity-50">The default Chord Picker voicing is <code>[{{props.auditionInfo.defaultVoicing.notes.join(' ')}}]</code>:</p>
          <input type="radio" :disabled="true">
          <label class="ml-1 opacity-50">{{ removeDefaultVoicingSuffix(lastRadioSymbol) }}</label>
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
            @reset-to-default-notes="chordPickerToJammed()" />
        </div>
      </div>


    </div>


  </div>
  <!-- <span v-else>Nothing to add - please select a chord using the chord picker, or enter enough notes to form a
    chord.</span> -->

</template>

<style scoped>
</style>
