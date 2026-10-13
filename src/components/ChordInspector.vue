<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { globals } from '@/lib/globals.js'
import { registerAccordion } from '@/lib/accordionState.js'
import { noteOptions } from '@/lib/note-tools.js'
import { chordOptions, optionsWithCurrent } from '@/lib/chordPicker.js'
import { arraysAreEqual } from '@/lib/array-tools.js'
import {
  isDirty,
  saveDraft,
  revertDraft,
  openForSlot,
  resetInspector,
  isDraftConsistentWithProject,
  addRow,
  duplicateDraft,
  deleteDraft,
  toggleFavourite,
  isFavourite,
  setIdentity,
  renameDraft,
  setBass,
  applyNotesEntry,
  applyBassEntry,
  headerSymbol,
  chooseCustom,
  chooseNormalised,
  discardCustom,
  normalisedVoicingNotes,
  useCapturedNotes,
  capturedInfo,
  autoApplyCaptured,
  hasPlayedVoicing,
  playedVoicingInfo,
  previewAutoVoicing,
  hasPendingChord,
  canAddRow,
  resolveEnterAction,
  transposeDraft,
  fifthDraft,
  invertDraft,
  stepChord,
  autoNotesFor,
  previewTranspose,
  previewFifth,
  previewInvert,
  previewStep,
} from '@/lib/chordInspector.js'
import { isTypingTarget } from '@/lib/is-typing-target.js'
import { linkProjectToKeyboard } from '@/lib/boot-project.js'
import { flushCurrentProject } from '@/lib/currentProjectStore.js'
import { auditionNotes } from '@/lib/auditionNotes.js'
import { stopAuditionChord } from '@/lib/midi/audition-note.js'
import { ensureAudioReady, isAudioLocked } from '@/lib/audio/general-midi.js'
import { forgetHover, getHoveredPreview, rememberHover } from '@/lib/auditionHover.js'
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

// The chord pickers are always "what this chord is called". In Custom mode
// they rename the chord only; in Normalised mode they also generate the notes.
const customActive = computed(() => globals.chordInspector.voicingMode === 'custom')

const selectedRoot = computed({
  get: () => picker.value.currentRoot,
  set: (value) => {
    if (customActive.value)
      renameDraft(value, picker.value.currentChord)
    else
      setIdentity(value, picker.value.currentChord)
  },
})
const selectedChord = computed({
  get: () => picker.value.currentChord,
  set: (value) => {
    if (customActive.value)
      renameDraft(picker.value.currentRoot, value)
    else
      setIdentity(picker.value.currentRoot, value)
  },
})
const selectedBass = computed({
  get: () => picker.value.currentBass,
  set: (value) => setBass(value),
})

// The custom row's notes field. It mirrors the stored custom voicing and flips
// the radio to Custom as soon as it is edited. While the field has focus the
// draft follows the typing but the text is not reformatted under the cursor;
// on blur or Enter it is parsed in full.
const notesText = ref('')
const notesFocused = ref(false)
// A slash token typed in the notes field is reported beside that field; a
// mistyped bass in the Bass field is reported beside its own field. Two refs
// keep the two messages from clearing each other.
const notesBassError = ref('')
const bassFieldError = ref('')
watch(
  () => globals.chordInspector.customNotes,
  (notes) => {
    if (notesFocused.value)
      return
    notesText.value = Array.isArray(notes) ? notes.join(' ') : ''
  },
  { immediate: true })

function applyNotes() {
  if (notesText.value === globals.chordInspector.customNotes.join(' ')) {
    notesBassError.value = ''
    return
  }
  const { invalidBass } = applyNotesEntry(notesText.value)
  notesBassError.value = invalidBass
}

/** Leaving the field applies the notes and shows them in their stored form. */
function onNotesBlur() {
  notesFocused.value = false
  // Clearing the field throws the custom voicing away and returns to Normalised.
  if (notesText.value.trim() === '') {
    discardCustom()
    notesText.value = ''
    notesBassError.value = ''
    return
  }
  applyNotes()
  notesText.value = globals.chordInspector.customNotes.join(' ')
}

// The custom row's slash bass. It is the same value as the chord-row picker,
// so the two stay in sync. Blank is allowed; the grid derives a low root later.
const bassText = ref('')
const bassFocused = ref(false)
watch(
  () => globals.chordPicker.currentBass,
  (bass) => {
    if (bassFocused.value)
      return
    bassText.value = bass || ''
  },
  { immediate: true })

function onBassInput() {
  const ok = applyBassEntry(bassText.value)
  bassFieldError.value = ok ? '' : bassText.value
}

function onBassBlur() {
  bassFocused.value = false
  const ok = applyBassEntry(bassText.value)
  if (ok) {
    bassFieldError.value = ''
    bassText.value = globals.chordPicker.currentBass || ''
  }
  else {
    // Keep the unreadable text so it can be fixed, with the hint visible.
    bassFieldError.value = bassText.value
  }
}

const previewSymbol = computed(() => headerSymbol())

// Two voicings, both kept: the normalised row is computed from the pickers,
// the custom row is stored. The radio picks which one Save uses.
const normalisedNotes = computed(() => normalisedVoicingNotes())
const customNotes = computed(() => globals.chordInspector.customNotes)

// Played notes auto-update the draft to the detected chord and stay available
// as a source for the custom voicing.
const captured = computed(() => capturedInfo())
const hasPlayed = computed(() => hasPlayedVoicing())
const played = computed(() => playedVoicingInfo())
const hasPending = computed(() => hasPendingChord())
const canAdd = computed(() => canAddRow())

// The Capture button appears only while the played notes differ from the
// custom row.
const canCapturePlayed = computed(() =>
  hasPlayed.value
  && !arraysAreEqual(played.value.notes, globals.chordInspector.customNotes))

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

/**
 * Return focus to the page after a row action. A button left focused would
 * swallow the next Enter press and repeat its own action (the old bug where
 * Enter after Add made another row instead of saving the played chord).
 */
function blurActionButton() {
  if (typeof document === 'undefined')
    return
  const el = document.activeElement
  if (el && typeof el.blur === 'function' && el.tagName === 'BUTTON')
    el.blur()
}

function onSave() {
  applyNotes()
  if (saveDraft()) {
    afterWrite()
    blurActionButton()
    flash('Chord saved')
  }
}

function onRevert() {
  revertDraft()
}

function onAdd() {
  applyNotes()
  if (addRow()) {
    afterWrite()
    blurActionButton()
    notesFocused.value = false
    notesText.value = globals.chordInspector.notes.join(' ')
    flash('Chord added')
  }
}

function onDuplicate() {
  if (duplicateDraft()) {
    afterWrite()
    blurActionButton()
  }
}

function onDelete() {
  if (!confirm(`Delete row #${globals.chordInspector.slotId}?`))
    return
  if (deleteDraft())
    afterWrite()
}

function onToggleFavourite() {
  toggleFavourite()
}

/** Pick a radio row: it decides what Save stores. Neither row overwrites the other. */
function onChooseNormalised() {
  chooseNormalised()
}

function onChooseCustom() {
  chooseCustom()
}

/** Focus keeps the field free-form: the text is only reformatted on blur or Enter. */
function onCustomFocus() {
  notesFocused.value = true
}

/** Make the notes just played the custom voicing. */
function onCapturePlayed() {
  useCapturedNotes()
}

/**
 * Backquote holds to audition the draft (the chord that would be saved).
 * auditionNotes() fills in the bass octave, so the raw picker bass is passed.
 * Releasing hands sound back to any preview still hovered, whether it is a
 * browse chord, a transpose preview, or a grid speaker button.
 */
function onChordPlay(event) {
  const state = event?.detail?.state !== 'off'
  if (!state) {
    auditionNotes([], '', false)
    // Pointer never left, so resume whatever preview is still hovered.
    const hovered = getHoveredPreview()
    if (hovered && Array.isArray(hovered.notes) && hovered.notes.length > 0)
      auditionNotes(hovered.notes, hovered.bass || '', true)
    refreshAudioHint()
    return
  }
  const draftNotes = Array.isArray(globals.chordInspector.notes) && globals.chordInspector.notes.length > 0
    ? globals.chordInspector.notes
    : previewAutoVoicing().notes
  if (!Array.isArray(draftNotes) || draftNotes.length === 0)
    return
  // Key hold is a decisive gesture, so waking here is allowed. Hover paths
  // never wake because each attempt logs a browser warning while suspended.
  try { ensureAudioReady() } catch { /* audio not booted yet */ }
  stopAuditionChord()
  auditionNotes(draftNotes, globals.chordPicker.currentBass, true)
  refreshAudioHint()
}

// Hovering a browse chord only previews it. The draft stays clean until
// the chord is clicked. auditionNotes() fills in the bass octave, so the
// raw bass is passed through.
function onBrowseAudition(detail) {
  if (!detail)
    return
  const { chordSymbolNoRoot, rootNote, bassNote, state } = detail
  if (!chordSymbolNoRoot)
    return
  const root = rootNote || globals.chordPicker.currentRoot
  if (!root)
    return
  const notes = autoNotesFor(root, chordSymbolNoRoot, 0)
  if (!Array.isArray(notes) || notes.length === 0)
    return
  if (!state) {
    forgetHover(notes)
    auditionNotes([], '', false)
    return
  }
  rememberHover(notes, bassNote || '')
  // Never wake audio from hover. Hover is not a valid unlock gesture and each
  // attempt logs a warning while suspended.
  stopAuditionChord()
  auditionNotes(notes, bassNote || '', true)
  refreshAudioHint()
}

// Clicking a browse chord loads it into the draft as an unsaved change.
// Save changes still writes it to the grid row. Silent: no sound here,
// hover already previewed it.
function onBrowseSelect(detail) {
  if (!detail)
    return
  const { chordSymbolNoRoot, rootNote, bassNote } = detail
  if (!chordSymbolNoRoot)
    return
  const root = rootNote || globals.chordPicker.currentRoot
  if (!root)
    return
  setIdentity(root, chordSymbolNoRoot)
  // Only override the bass when the browse chord carries one. The browse
  // library passes an empty string for plain chords, which must not wipe the
  // root bass that setIdentity just applied.
  if (bassNote)
    setBass(bassNote)
}

// Transpose & invert: hovering previews the result, clicking applies it to
// the draft (still unsaved until Save changes).
function auditionPreview(preview, state) {
  if (!state) {
    forgetHover(preview?.notes)
    auditionNotes([], '', false)
    return
  }
  if (!preview || !Array.isArray(preview.notes) || preview.notes.length === 0)
    return
  rememberHover(preview.notes, preview.bass || '')
  // Never wake audio from hover, same reason as browse preview above.
  stopAuditionChord()
  auditionNotes(preview.notes, preview.bass || '', true)
  refreshAudioHint()
}

// Hovering Capture played notes hears the played notes without applying them.
function onHoverPlayed(state) {
  auditionPreview(played.value, state)
}

function onHoverTranspose(semitones, state) {
  auditionPreview(previewTranspose(semitones), state)
}

function onHoverFifth(direction, state) {
  auditionPreview(previewFifth(direction), state)
}

function onHoverInvert(direction, state) {
  auditionPreview(previewInvert(direction), state)
}

function onHoverStep(direction, state) {
  auditionPreview(previewStep(direction), state)
}

// Vue-controlled tabs for the Browse section. Replaces the Fomantic tab
// module, which never switched reliably inside the accordion.
const browseTab = ref('inspector-common')

// Browsers start sound suspended after a refresh until a click or key press.
// Hover alone cannot unlock it, so the first hover stays silent. Show a hint
// until the context runs.
const audioLocked = ref(false)

function refreshAudioHint() {
  try {
    // Silent read only. Never resume here or hovering floods the console.
    audioLocked.value = isAudioLocked()
  }
  catch {
    audioLocked.value = false
  }
}

function onAudioUnlockEvent() {
  refreshAudioHint()
}

const flashMessage = ref('')
let flashTimer = null
function flash(message) {
  flashMessage.value = message
  if (flashTimer)
    clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { flashMessage.value = '' }, 1800)
}

// Escape reverts the whole draft. Enter is handled globally so it works even
// when focus is on the piano or body, not just inside the panel.
function onKeydown(event) {
  if (event.key === 'Escape' && globals.chordInspector.open) {
    event.preventDefault()
    onRevert()
  }
}

// Enter commits the edit: it saves a dirty row, or adds a pending chord when
// there is no row yet. It never duplicates a clean row. Buttons in the Save
// row keep native Enter so there is no double activation. Text areas keep
// Enter for new lines. Typing in other text fields or picks outside Edit
// Chords never triggers a commit.
function onGlobalEnter(event) {
  if (event.key !== 'Enter' || event.repeat)
    return
  if (event.ctrlKey || event.metaKey || event.altKey)
    return
  const el = event.target
  const tag = el?.tagName
  if (tag === 'TEXTAREA')
    return
  if (el?.isContentEditable)
    return
  // Save, Add and Revert activate natively when focused; anything else
  // focused still commits instead of clicking that control.
  if (tag === 'BUTTON' && typeof el?.closest === 'function' && el.closest('.actions-row') != null)
    return
  const inInspector = typeof el?.closest === 'function' && el.closest('.chord-inspector') != null
  if (!inInspector) {
    if (isTypingTarget(el))
      return
    if (tag === 'SELECT' || tag === 'A')
      return
    if (typeof document !== 'undefined' && document.querySelector?.('.ui.modal.visible'))
      return
  }
  event.preventDefault()
  applyNotes()
  // A chord detected just before Enter may not have reached the draft yet
  // (the watcher runs async), so apply it first: highlight, play, Enter then
  // updates the highlighted row instead of adding a duplicate.
  autoApplyCaptured()
  const action = resolveEnterAction()
  if (action === 'save') {
    onSave()
    notesFocused.value = false
    notesText.value = globals.chordInspector.notes.join(' ')
    if (el && typeof el.blur === 'function' && el.tagName === 'INPUT')
      el.blur()
    return
  }
  if (action === 'add') {
    onAdd()
    if (el && typeof el.blur === 'function' && el.tagName === 'INPUT')
      el.blur()
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
  window.addEventListener('keydown', onGlobalEnter)
  refreshAudioHint()
  window.addEventListener('pointerdown', onAudioUnlockEvent)
  window.addEventListener('keydown', onAudioUnlockEvent)
  window.addEventListener('click', onAudioUnlockEvent)
})

/** Open the selected trigger, or the first row, when the grid has rows. */
function openCurrentOrFirstSlot() {
  if (!globals.isProjectLoaded)
    return
  const map = globals.chordTriggerMap ?? {}
  const note = globals.currentChordTriggerNote in map
    ? globals.currentChordTriggerNote
    : Object.keys(map)[0]
  if (note)
    openForSlot(note)
}

// A replaced project object (New, project switch, boot restore) ends the old
// draft: reset it, then open the current or first slot when the grid has rows.
// Watching the reference only fires on project replacement; ordinary edits
// mutate the project in place and must not disturb the draft. The old project's
// row id and baseline must never linger, or an empty new project would still
// show Save changes next to Add as new chord.
//
// The first run happens at mount and must not throw away a valid draft (a
// pending played chord survives a trip to the Perform page). There it only
// repairs a draft left over from a project replaced while this panel was away.
watch(() => globals.project, (project, previous) => {
  if (previous !== undefined) {
    resetInspector()
    openCurrentOrFirstSlot()
    return
  }
  if (!isDraftConsistentWithProject())
    resetInspector()
  if (globals.chordInspector.slotId == null && !hasPendingChord())
    openCurrentOrFirstSlot()
}, { immediate: true })

// The trigger map is rebuilt separately after a project load, so it can be
// empty at the moment the project object changes (boot restore). Open the
// first slot when the grid becomes available.
watch(() => globals.isProjectLoaded, (loaded) => {
  if (!loaded)
    return
  openCurrentOrFirstSlot()
})

// Follow the grid as the trigger moves, but never throw away an unsaved edit.
watch(() => globals.currentChordTriggerNote, (note) => {
  if (!note || isDirty())
    return
  if (globals.chordInspector.triggerNote === note)
    return
  openForSlot(note)
})

// Playing notes updates the draft immediately, both while editing a row and
// when no rows exist yet. The picker follows the detected chord and the exact
// notes stay available as the played voicing. The draft replaces any unsaved
// edit by design.
watch(captured, (cap) => {
  if (!cap?.available)
    return
  autoApplyCaptured()
})

onUnmounted(() => {
  stopBrowseAccordion()
  stopTransposeAccordion()
  document.removeEventListener('chord-add', onAdd)
  document.removeEventListener('chord-play', onChordPlay)
  window.removeEventListener('keydown', onGlobalEnter)
  window.removeEventListener('pointerdown', onAudioUnlockEvent)
  window.removeEventListener('keydown', onAudioUnlockEvent)
  window.removeEventListener('click', onAudioUnlockEvent)
  if (flashTimer)
    clearTimeout(flashTimer)
})
</script>

<template>
  <div class="chord-inspector" @keydown="onKeydown">
    <!-- Title: the selected row or the pending chord -->
    <div class="inspector-header">
      <span class="inspector-title">
        <template v-if="inspector.slotId != null">
          <span class="row-id">Row #{{ inspector.slotId }}</span>
          <span class="chord-name">{{ previewSymbol }}</span>
        </template>
        <template v-else-if="hasPending">
          <span class="row-id">New chord</span>
          <span class="chord-name">{{ previewSymbol }}</span>
        </template>
        <template v-else>
          No chord selected
        </template>
      </span>
      <span v-if="dirty" class="dirty-dot" title="Unsaved changes">● modified</span>
      <span v-if="flashMessage" class="saved-flash">{{ flashMessage }}</span>
    </div>

    <!-- The chord pickers are the name. In Normalised mode they also generate
         that row's notes; in Custom mode they only rename the chord. -->
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
      <span v-if="audioLocked" class="field-hint">Sound is off after refresh. Click or press any key once, then hover again.</span>
    </div>

    <!-- Two voicings, both kept. The radio picks which one Save stores and
         each row has its own speaker, so both can be heard without switching. -->
    <div class="inspector-row voicing-row">
      <label class="radio-label" title="Save the generated voicing built from the chord name">
        <input type="radio" name="voicing" value="normalised" :checked="!customActive" @change="onChooseNormalised" />
        Normalised
      </label>
      <code class="voicing-notes">{{ normalisedNotes.join(' ') }}</code>
      <ButtonAudition :notes="normalisedNotes" :bass="picker.currentBass"
        :title="`Hear the normalised voicing: ${normalisedNotes.join(' ')}`" />
    </div>
    <div class="inspector-row voicing-row">
      <label class="radio-label" title="Save your own voicing, typed here or played">
        <input type="radio" name="voicing" value="custom" :checked="customActive" @change="onChooseCustom" />
        Custom
      </label>
      <input type="text" v-model="notesText" @input="applyNotes"
        @focus="onCustomFocus" @blur="onNotesBlur"
        title="These exact notes are the custom voicing. Add a slash bass like 'C3 E3 G3 /E'. Press Enter to save or add the chord."
        placeholder="e.g. C3 E3 G3" class="notes-input" />
      <span v-if="notesBassError" class="field-hint bass-error">Can't read the slash bass "{{ notesBassError }}".</span>
      <label class="field bass-field">/ Bass
        <input type="text" v-model="bassText" @input="onBassInput"
          @focus="bassFocused = true" @blur="onBassBlur"
          title="Optional slash bass for this chord, e.g. E. Same value as the / Bass picker above; blank means the low root is derived."
          placeholder="(none)" class="bass-input" />
      </label>
      <span v-if="bassFieldError" class="field-hint bass-error">Can't read "{{ bassFieldError }}" — use a note like E or Eb.</span>
      <ButtonAudition :notes="customNotes" :bass="picker.currentBass"
        :title="`Hear the custom voicing: ${customNotes.join(' ') || '(no notes)'}`" />
      <button v-if="canCapturePlayed" type="button" class="ui tiny button"
        title="Make the notes you just played the custom voicing"
        @click="onCapturePlayed"
        @mouseenter="onHoverPlayed(true)" @mouseleave="onHoverPlayed(false)"
        @focus="onHoverPlayed(true)" @blur="onHoverPlayed(false)">Capture played notes</button>
      <span v-if="canCapturePlayed" class="field-hint">Played: {{ played.notes.join(' ') }}</span>
    </div>

    <!-- With no row there is nothing to save, so only Add is offered -->
    <div class="inspector-row actions-row">
      <template v-if="inspector.slotId != null">
        <button type="button" class="ui small primary button" :disabled="!dirty"
          title="Save changes to this row (Enter)" @click="onSave">Save</button>
        <button type="button" class="ui small primary button" :disabled="!canAdd"
          title="Add the current chord as a new row" @click="onAdd">Add as new chord</button>
        <button type="button" class="ui small button" :disabled="!dirty" title="Discard the draft (Esc)"
          @click="onRevert">Revert</button>
        <span class="actions-divider"></span>
        <button type="button" class="ui tiny button" title="Add a copy of this chord as a new row"
          @click="onDuplicate">Duplicate</button>
        <button type="button" class="ui tiny button" :title="favourite ? 'Remove from favourites' : 'Mark as a favourite'"
          @click="onToggleFavourite">
          {{ favourite ? '★ Favourite' : '☆ Favourite' }}
        </button>
        <button type="button" class="ui tiny button" title="Delete this row"
          @click="onDelete">Delete</button>
      </template>
      <template v-else>
        <button type="button" class="ui small primary button" :disabled="!canAdd"
          title="Add the current chord as a new row (Enter)" @click="onAdd">Add as new chord</button>
      </template>
    </div>

    <!-- Browse: a catalogue for dialling up a chord, never the target -->
    <div ref="browseAccordion" class="ui fluid styled accordion" style="background-color: burlywood;">
      <div class="title" data-accordion-section="inspector-browse">
        <i class="dropdown icon"></i>
        Browse chords
      </div>
      <div class="content">
        <p class="row-hint">Hover to hear a chord. Click loads it into Edit Chords above (unsaved until Save changes).</p>
        <div class="ui top attached tabular menu" style="background-color: burlywood;">
          <a class="item" :class="{ active: browseTab === 'inspector-common' }" data-tab="inspector-common" @click.prevent="browseTab = 'inspector-common'">Common Chords</a>
          <a class="item" :class="{ active: browseTab === 'inspector-fifths' }" data-tab="inspector-fifths" @click.prevent="browseTab = 'inspector-fifths'">Circle of Fifths</a>
        </div>
        <div class="ui bottom attached tab segment" :class="{ active: browseTab === 'inspector-common' }" v-show="browseTab === 'inspector-common'" data-tab="inspector-common" style="background-color: burlywood;">
          <CommonChords @chord-from-event="onBrowseAudition($event.subevent)" @chord-select-event="onBrowseSelect($event.subevent)" />
        </div>
        <div class="ui bottom attached tab segment" :class="{ active: browseTab === 'inspector-fifths' }" v-show="browseTab === 'inspector-fifths'" data-tab="inspector-fifths" style="background-color: burlywood;">
          <CircleOfFifths @chord-from-event="onBrowseAudition($event.subevent)" @chord-select-event="onBrowseSelect($event.subevent)" />
        </div>
      </div>

      <div ref="transposeAccordion" class="title" data-accordion-section="inspector-transpose">
        <i class="dropdown icon"></i>
        Transpose &amp; invert
      </div>
      <div class="content">
        <p class="row-hint">Hover to hear the result. Click applies it to Edit Chords above (unsaved until Save changes).</p>
        <div class="inspector-row">
          <button type="button" class="ui tiny button" title="Hover to hear the previous chord type, click to load it into the draft"
            @click="stepChord('prev')" @mouseenter="onHoverStep('prev', true)" @mouseleave="onHoverStep('prev', false)" @focus="onHoverStep('prev', true)" @blur="onHoverStep('prev', false)">Previous chord</button>
          <button type="button" class="ui tiny button" title="Hover to hear the next chord type, click to load it into the draft"
            @click="stepChord('next')" @mouseenter="onHoverStep('next', true)" @mouseleave="onHoverStep('next', false)" @focus="onHoverStep('next', true)" @blur="onHoverStep('next', false)">Next chord</button>
          <button type="button" class="ui tiny button" title="Pick a random chord type into the draft"
            @click="stepChord('random')">Random 🎲</button>
        </div>
        <div class="inspector-row">
          <button type="button" class="ui tiny button" title="Hover to hear one semitone down, click to load it into the draft"
            @click="transposeDraft(-1)" @mouseenter="onHoverTranspose(-1, true)" @mouseleave="onHoverTranspose(-1, false)" @focus="onHoverTranspose(-1, true)" @blur="onHoverTranspose(-1, false)">1 <i class="caret down icon"></i></button>
          <button type="button" class="ui tiny button" title="Hover to hear one semitone up, click to load it into the draft"
            @click="transposeDraft(1)" @mouseenter="onHoverTranspose(1, true)" @mouseleave="onHoverTranspose(1, false)" @focus="onHoverTranspose(1, true)" @blur="onHoverTranspose(1, false)">1 <i class="caret up icon"></i></button>
          <button type="button" class="ui tiny button" title="Hover to hear a fifth down (circle of fifths), click to load it into the draft"
            @click="fifthDraft(-1)" @mouseenter="onHoverFifth(-1, true)" @mouseleave="onHoverFifth(-1, false)" @focus="onHoverFifth(-1, true)" @blur="onHoverFifth(-1, false)">5th <i class="caret down icon"></i></button>
          <button type="button" class="ui tiny button" title="Hover to hear a fifth up (circle of fifths), click to load it into the draft"
            @click="fifthDraft(1)" @mouseenter="onHoverFifth(1, true)" @mouseleave="onHoverFifth(1, false)" @focus="onHoverFifth(1, true)" @blur="onHoverFifth(1, false)">5th <i class="caret up icon"></i></button>
        </div>
        <div class="inspector-row">
          <button type="button" class="ui tiny button" title="Hover to hear the inversion down, click to load it into the draft"
            @click="invertDraft(-1)" @mouseenter="onHoverInvert(-1, true)" @mouseleave="onHoverInvert(-1, false)" @focus="onHoverInvert(-1, true)" @blur="onHoverInvert(-1, false)">Invert <i class="caret left icon"></i></button>
          <button type="button" class="ui tiny button" title="Hover to hear the inversion up, click to load it into the draft"
            @click="invertDraft(1)" @mouseenter="onHoverInvert(1, true)" @mouseleave="onHoverInvert(1, false)" @focus="onHoverInvert(1, true)" @blur="onHoverInvert(1, false)">Invert <i class="caret right icon"></i></button>
          <button type="button" class="ui tiny button" title="Hover to hear the root position, click to load it into the draft"
            @click="invertDraft(0)" @mouseenter="onHoverInvert(0, true)" @mouseleave="onHoverInvert(0, false)" @focus="onHoverInvert(0, true)" @blur="onHoverInvert(0, false)">Reset inversion</button>
        </div>
        <p class="row-hint">Transposing renames the chord; inverting changes the Normalised voicing.</p>
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
  display: inline-flex;
  align-items: baseline;
  gap: 0.6rem;
}

.row-id {
  color: #8a7a63;
  font-size: 0.8rem;
  font-weight: normal;
}

.chord-name {
  font-size: 1.25rem;
  font-weight: 700;
}

.chord-notes {
  color: #6b5a45;
  font-size: 0.9rem;
  font-family: monospace;
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

.bass-input {
  width: 4.5rem;
}

.bass-error {
  color: #a12a2a;
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

/* The two voicing radios: one row each, read-only normalised text and an
editable custom field. */
.voicing-row {
  padding: 0.15rem 0;
}

.radio-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 6.5rem;
  font-weight: 600;
  cursor: pointer;
}

.voicing-notes {
  color: #5a3d1a;
  font-size: 0.9rem;
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

.ui.tabular.menu .active.item {
  background: #e0e1e2;
}
</style>
