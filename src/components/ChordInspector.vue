<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { globals } from '@/lib/globals.js'
import { registerAccordion } from '@/lib/accordionState.js'
import { noteOptions } from '@/lib/note-tools.js'
import { chordOptions, optionsWithCurrent } from '@/lib/chordPicker.js'
import { nameOptionsFor } from '@/lib/chordAddHelpers.js'
import {
  isDirty,
  saveDraft,
  revertDraft,
  openForSlot,
  addRow,
  duplicateDraft,
  deleteDraft,
  toggleFavourite,
  isFavourite,
  setIdentity,
  setBass,
  setNotesFromText,
  revertToAuto,
  useCapturedNotes,
  capturedInfo,
  transposeDraft,
  fifthDraft,
  invertDraft,
  stepChord,
  autoSymbolFor,
} from '@/lib/chordInspector.js'
import { linkProjectToKeyboard } from '@/lib/boot-project.js'
import { flushCurrentProject } from '@/lib/currentProjectStore.js'
import { auditionNotes } from '@/lib/auditionNotes.js'
import ButtonAudition from './ButtonAudition.vue'
import CommonChords from './CommonChords.vue'
import CircleOfFifths from './CircleOfFifths.vue'

// ┌─┐┬ ┬┌─┐┬─┐┌┬┐  ┬┌┐┌┌─┐┌─┐┌─┐┌─┐┌┬┐┌─┐┬─┐
// │  ├─┤│ │├┬┘ ││  ││││└─┐├─┘├┤ ├┤  │ │ │├┬┘
// └─┘┴ ┴└─┘┴└──┴┘  ┴┘└┘└─┘┴  └─┘└─┘ ┴ └─┘┴└─
//
// One panel, one draft. It always shows the selected grid slot: the combos
// carry its identity, the notes field carries its voicing (Auto or Custom),
// and Save writes it back. '+' / '/' append a new slot and select it, so the
// same panel edits it.

const inspector = computed(() => globals.chordInspector)
const picker = computed(() => globals.chordPicker)

const rootOptions = noteOptions
const bassOptions = [{ text: '(none)', value: '' }].concat(noteOptions)

// The chord type list hides some types (augmented, altered dominants). A
// stored chord may still use one, so its current type is always added;
// otherwise the combo would show blank for that row. Roots and basses are
// normalised to the twelve spellings on the way in, so they need no fallback.
const chordTypeOptions = computed(() =>
  optionsWithCurrent(chordOptions.value ?? [], picker.value.currentChord))

const dirty = computed(() => isDirty())
const favourite = computed(() => {
  void globals.project?.songs?.default?.favourites
  void globals.chordInspector.slotId
  return isFavourite()
})

// The draft identity, bound to the picker combos. Changing root or quality is
// a different chord, so the voicing becomes Auto again (see chordInspector.js).
const selectedRoot = computed({
  get: () => picker.value.currentRoot,
  set: (value) => {
    globals.chordPicker.currentBass = value
    setIdentity(value, picker.value.currentChord)
  },
})
const selectedChord = computed({
  get: () => picker.value.currentChord,
  set: (value) => setIdentity(picker.value.currentRoot, value),
})
const selectedBass = computed({
  get: () => picker.value.currentBass,
  set: (value) => setBass(value),
})

// The voicing is one notes field. It mirrors the draft and flips to Custom as
// soon as it is edited; "Revert to auto" rebuilds the normalised voicing.
// While the field has focus the draft follows the typing but the text is not
// reformatted under the cursor; on blur or Enter it is parsed in full.
const notesText = ref('')
const notesFocused = ref(false)
watch(
  () => globals.chordInspector.notes,
  (notes) => {
    if (notesFocused.value)
      return
    notesText.value = Array.isArray(notes) ? notes.join(' ') : ''
  },
  { immediate: true })

function applyNotes() {
  if (notesText.value === globals.chordInspector.notes.join(' '))
    return
  setNotesFromText(notesText.value)
}

/** Leaving the field applies the notes and shows them in their stored form. */
function onNotesBlur() {
  notesFocused.value = false
  applyNotes()
  notesText.value = globals.chordInspector.notes.join(' ')
}

const previewSymbol = computed(() =>
  globals.chordInspector.voicingMode === 'custom' && globals.chordInspector.symbol
    ? globals.chordInspector.symbol
    : autoSymbolFor(picker.value.currentRoot, picker.value.currentChord))

const previewNotes = computed(() => globals.chordInspector.notes.join(' '))

// The stored-name choices for a Custom voicing. Shown only when there is more
// than one plausible name, so a name is never mistaken for a voicing.
const nameOptions = computed(() => nameOptionsFor({
  symbols: globals.chordInspector.symbols,
  fallbackSymbol: globals.chordInspector.symbol,
}))

// Played notes wait here until the user asks for them.
const captured = computed(() => capturedInfo())

// ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
// ├─┤│ │ │ ││ ││││└─┐
// ┴ ┴└─┘ ┴ ┴└─┘┘└┘└─┘

function afterWrite() {
  linkProjectToKeyboard()
  flushCurrentProject()
  if (typeof document !== 'undefined' && typeof document.broadcastEvent === 'function')
    document.broadcastEvent('chord-changed', {
      notes: globals.currentLhNotes(),
      bass: globals.currentBass(),
    })
}

function onSave() {
  applyNotes()
  if (saveDraft()) {
    afterWrite()
    flash('Chord saved')
  }
}

function onRevert() {
  revertDraft()
}

function onAdd() {
  if (isDirty() && !confirm('Discard the unsaved changes and add a new chord?'))
    return
  if (addRow())
    afterWrite()
}

function onDuplicate() {
  if (duplicateDraft())
    afterWrite()
}

function onDelete() {
  if (!confirm(`Delete the chord on ${globals.chordInspector.triggerNote}?`))
    return
  if (deleteDraft())
    afterWrite()
}

function onToggleFavourite() {
  toggleFavourite()
}

function onUseCaptured() {
  useCapturedNotes()
}

/**
 * Backquote holds to audition the draft (the chord that would be saved).
 * auditionNotes() fills in the bass octave, so the raw picker bass is passed.
 */
function onChordPlay(event) {
  const state = event?.detail?.state !== 'off'
  const notes = globals.chordInspector.notes
  if (!Array.isArray(notes) || notes.length === 0)
    return
  auditionNotes(notes, globals.chordPicker.currentBass, state)
}

function onChordFromEvent(detail) {
  const { chordSymbolNoRoot, rootNote, bassNote, state } = detail
  if (!state)
    return
  const root = rootNote || globals.chordPicker.currentRoot
  setIdentity(root, chordSymbolNoRoot)
  if (bassNote)
    setBass(bassNote)
}

const flashMessage = ref('')
let flashTimer = null
function flash(message) {
  flashMessage.value = message
  if (flashTimer)
    clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flashMessage.value = '' }, 1800)
}

// Enter applies the typed notes to the draft (so the picker and Auto/Custom
// state update); the project is only changed by an explicit Save changes.
// Escape reverts the whole draft.
function onKeydown(event) {
  if (event.key === 'Enter') {
    const el = event.target
    if (el && el.tagName === 'INPUT') {
      event.preventDefault()
      applyNotes()
    }
  }
  else if (event.key === 'Escape' && globals.chordInspector.open) {
    event.preventDefault()
    onRevert()
  }
}

const browseAccordion = ref(null)
const transposeAccordion = ref(null)
let stopBrowseAccordion = () => {}
let stopTransposeAccordion = () => {}

onMounted(() => {
  if (browseAccordion.value)
    stopBrowseAccordion = registerAccordion(browseAccordion.value, 'chord-inspector-browse')
  if (transposeAccordion.value)
    stopTransposeAccordion = registerAccordion(transposeAccordion.value, 'chord-inspector-transpose')
  // '/' and the MIDI Shift+F# shortcut broadcast `chord-add`; it now means
  // "create a row", the same as the + Add chord button.
  document.addEventListener('chord-add', onAdd)
  document.addEventListener('chord-play', onChordPlay)
})

// Show the highlighted slot as soon as a project is loaded, and whenever the
// project changes. Never throw away an unsaved edit afterwards.
watch(() => globals.isProjectLoaded, (loaded) => {
  if (!loaded)
    return
  const map = globals.chordTriggerMap ?? {}
  const note = globals.currentChordTriggerNote in map
    ? globals.currentChordTriggerNote
    : Object.keys(map)[0]
  if (note)
    openForSlot(note)
}, { immediate: true })

// Follow the grid as the trigger moves, but never throw away an unsaved edit.
watch(() => globals.currentChordTriggerNote, (note) => {
  if (!note || isDirty())
    return
  if (globals.chordInspector.triggerNote === note)
    return
  openForSlot(note)
})

onUnmounted(() => {
  stopBrowseAccordion()
  stopTransposeAccordion()
  document.removeEventListener('chord-add', onAdd)
  document.removeEventListener('chord-play', onChordPlay)
  if (flashTimer)
    clearTimeout(flashTimer)
})
</script>

<template>
  <div class="chord-inspector" @keydown="onKeydown">
    <!-- Title: always says which slot is being edited -->
    <div class="inspector-header">
      <span class="inspector-title">
        <template v-if="inspector.slotId != null">
          Edit slot <b>{{ inspector.triggerNote }}</b>
          <code class="ml-2">{{ previewSymbol }}</code>
          <code class="ml-1">[{{ previewNotes }}]</code>
        </template>
        <template v-else>
          No chord selected
        </template>
      </span>
      <span v-if="dirty" class="dirty-dot" title="Unsaved changes">● modified</span>
      <span v-if="flashMessage" class="saved-flash">{{ flashMessage }}</span>
    </div>

    <!-- Identity: always visible. Changing root/quality resets the voicing to Auto. -->
    <div class="inspector-row identity-row">
      <label class="field">Root
        <select v-model="selectedRoot">
          <option v-for="option in rootOptions" :key="option.value" :value="option.value">{{ option.text }}</option>
        </select>
      </label>
      <label class="field">Chord
        <select v-model="selectedChord">
          <option v-for="option in chordTypeOptions" :key="option.value" :value="option.value">{{ option.text }}</option>
        </select>
      </label>
      <label class="field">/ Bass
        <select v-model="selectedBass">
          <option v-for="option in bassOptions" :key="option.value" :value="option.value">{{ option.text }}</option>
        </select>
      </label>
      <span v-if="picker.currentChordInversion" class="inv-tag">inv {{ picker.currentChordInversion }}</span>
      <ButtonAudition :notes="inspector.notes" :bass="picker.currentBass" />
      <span class="field-hint">Plays what will be saved.</span>
    </div>

    <!-- One notes field, Auto or Custom -->
    <div class="inspector-row notes-row">
      <label class="field notes-field">Notes
        <input type="text" v-model="notesText" @input="applyNotes"
          @focus="notesFocused = true" @blur="onNotesBlur"
          title="Press Enter to update the chord picker. Save changes writes it to the row."
          placeholder="e.g. C3 E3 G3" class="notes-input" />
      </label>
      <span class="voicing-tag" :class="inspector.voicingMode === 'auto' ? 'tag-auto' : 'tag-custom'">
        {{ inspector.voicingMode === 'auto' ? 'Auto' : 'Custom' }}
      </span>
      <button v-if="inspector.voicingMode === 'custom'" type="button" class="link-button"
        title="Rebuild the normalised voicing from the chord name"
        @click="revertToAuto">Revert to auto</button>
      <label v-if="inspector.voicingMode === 'custom' && nameOptions.length > 1" class="field">store as
        <select v-model="inspector.symbol">
          <option v-for="name in nameOptions" :key="name" :value="name">{{ name }}</option>
        </select>
      </label>
    </div>
    <p class="row-hint">
      <template v-if="inspector.voicingMode === 'auto'">Auto: the notes are built from the chord name above.</template>
      <template v-else>Custom: these exact notes are what sounds. The chord name above still labels the row.</template>
    </p>

    <!-- Captured: notes played on a MIDI or computer keyboard, applied only on request -->
    <div v-if="captured.available" class="inspector-row captured-row">
      <span class="captured-label" title="Notes played just now. They are not applied until you ask.">Captured</span>
      <code>{{ captured.chord }}</code>
      <code>[{{ captured.notes.join(' ') }}]</code>
      <ButtonAudition :notes="captured.notes" :bass="captured.bass" />
      <button type="button" class="ui tiny button" @click="onUseCaptured">Use these notes</button>
    </div>

    <!-- Save / Revert, then the row actions -->
    <div class="inspector-row actions-row">
      <button type="button" class="ui small primary button" :disabled="!dirty || inspector.slotId == null"
        title="Save changes to this row" @click="onSave">Save changes</button>
      <button type="button" class="ui small button" :disabled="!dirty" title="Discard the draft (Esc)"
        @click="onRevert">Revert</button>
      <span class="actions-divider"></span>
      <button type="button" class="ui tiny button" title="Add a copy of this chord as a new row"
        :disabled="inspector.slotId == null" @click="onDuplicate">Duplicate</button>
      <button type="button" class="ui tiny button" :title="favourite ? 'Remove from favourites' : 'Mark as a favourite'"
        :disabled="inspector.slotId == null" @click="onToggleFavourite">
        {{ favourite ? '★ Favourite' : '☆ Favourite' }}
      </button>
      <button type="button" class="ui tiny button" title="Delete this row"
        :disabled="inspector.slotId == null" @click="onDelete">Delete</button>
    </div>

    <!-- Browse: a catalogue for dialling up a chord, never the target -->
    <div ref="browseAccordion" class="ui fluid styled accordion" style="background-color: burlywood;">
      <div class="title" data-accordion-section="inspector-browse">
        <i class="dropdown icon"></i>
        Browse chords
      </div>
      <div class="content">
        <div class="ui top attached tabular menu" style="background-color: burlywood;">
          <a class="item active" data-tab="inspector-common">Common Chords</a>
          <a class="item" data-tab="inspector-fifths">Circle of Fifths</a>
        </div>
        <div class="ui bottom attached tab segment active" data-tab="inspector-common" style="background-color: burlywood;">
          <CommonChords @chord-from-event="onChordFromEvent($event.subevent)" />
        </div>
        <div class="ui bottom attached tab segment" data-tab="inspector-fifths" style="background-color: burlywood;">
          <CircleOfFifths @chord-from-event="onChordFromEvent($event.subevent)" />
        </div>
      </div>

      <div ref="transposeAccordion" class="title" data-accordion-section="inspector-transpose">
        <i class="dropdown icon"></i>
        Transpose &amp; invert
      </div>
      <div class="content">
        <div class="inspector-row">
          <button type="button" class="ui tiny button" @click="stepChord('prev')">Previous chord</button>
          <button type="button" class="ui tiny button" @click="stepChord('next')">Next chord</button>
          <button type="button" class="ui tiny button" @click="stepChord('random')">Random 🎲</button>
        </div>
        <div class="inspector-row">
          <button type="button" class="ui tiny button" title="Transpose one semitone down"
            @click="transposeDraft(-1)">1 <i class="caret down icon"></i></button>
          <button type="button" class="ui tiny button" title="Transpose one semitone up"
            @click="transposeDraft(1)">1 <i class="caret up icon"></i></button>
          <button type="button" class="ui tiny button" title="Transpose a fifth down (circle of fifths)"
            @click="fifthDraft(-1)">5th <i class="caret down icon"></i></button>
          <button type="button" class="ui tiny button" title="Transpose a fifth up (circle of fifths)"
            @click="fifthDraft(1)">5th <i class="caret up icon"></i></button>
        </div>
        <div class="inspector-row">
          <button type="button" class="ui tiny button" @click="invertDraft(-1)">Invert <i class="caret left icon"></i></button>
          <button type="button" class="ui tiny button" @click="invertDraft(1)">Invert <i class="caret right icon"></i></button>
          <button type="button" class="ui tiny button" @click="invertDraft(0)">Reset inversion</button>
        </div>
        <p class="row-hint">Transposing or inverting changes the chord, so the voicing returns to Auto.</p>
      </div>

      <div class="title" data-accordion-section="inspector-options">
        <i class="dropdown icon"></i>
        Options
      </div>
      <div class="content">
        <div class="inspector-row">
          <label class="checkboxLabel" title="List chord types the short list hides, such as altered dominants">
            <input type="checkbox" v-model="globals.chordPicker.showAllChords" /> Show all chords
          </label>
          <label class="checkboxLabel" title="Use short names such as M and m7 in the chord list">
            <input type="checkbox" v-model="globals.chordPicker.shortChordNames" /> Short chord names
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chord-inspector {
  background-color: burlywood;
}

.inspector-header {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.inspector-title {
  font-size: 1.05rem;
}

.dirty-dot {
  color: #a15c00;
  font-size: 0.8rem;
  font-weight: bold;
}

.saved-flash {
  color: #256b25;
  font-size: 0.8rem;
}

.inspector-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.field {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.notes-input {
  width: 24rem;
  max-width: 70vw;
}

.field-hint,
.row-hint {
  color: #6b5a45;
  font-size: 0.8rem;
  font-style: italic;
}

.row-hint {
  margin: -0.25rem 0 0.6rem 0;
}

.inv-tag {
  padding: 0 0.35rem;
  border: 1px solid #b9a98e;
  border-radius: 3px;
  background: #efe3cf;
  color: #6b5a45;
  font-size: 0.75rem;
}

/* Auto/Custom is a status label, not a control: plain small caps, no box. */
.voicing-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tag-auto {
  color: #8a7a63;
}

.tag-custom {
  color: #2f4fa8;
}

.link-button {
  padding: 0;
  border: none;
  background: none;
  color: #2f4fa8;
  text-decoration: underline;
  cursor: pointer;
  font-size: 0.85rem;
}

.captured-row {
  padding: 0.35rem 0.6rem;
  border: 1px dashed #b9a98e;
  border-radius: 6px;
  background: #efe3cf;
}

.captured-label {
  font-weight: bold;
  color: #6b5a45;
}

.actions-row {
  margin-top: 0.75rem;
}

.actions-divider {
  width: 1px;
  height: 1.5rem;
  background: #b9a98e;
  margin: 0 0.4rem;
}

.checkboxLabel {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
</style>
