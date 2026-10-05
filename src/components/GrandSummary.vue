<script setup>
import { computed, ref } from 'vue'
import { globals } from '../../src/lib/globals.js'
import { setSoloMode, setScalePolicy, rerollShuffleScale, applyScalePolicy } from '../../src/lib/change-scale.js'
import { samePitchClasses, closestScaleIndex, pitchClassSet, POLICY_PRESETS } from '../../src/lib/autoScale.js'
import { applyProjectKeySettings } from '../../src/lib/projectScaleSettings.js'
import { scaleAnnotation, PROJECT_COLOURS } from '../../src/lib/chordScaleEngine.js'
import { Note } from '@/lib/midi/webmidi.js'
import { getProjectChordsTriggers } from "../../src/lib/project-chord-triggers.js"
import { onNoteOn, onNoteOff } from "@/lib/midi/wire-events.js"
import { start, dragover, dragend } from '../../src/lib/drag-drop-table-rows.js'
import { markAllVisibleChordsForDeletion, markAllVisibleChordsAsFavourites } from '../../src/lib/massOperationsOnChordConfigs'
import { keyDetection } from '../../src/lib/keyDetection';
import { projectKeyName, projectKeyNotes } from '../../src/lib/projectKey.js';
import { loadDemoProject } from '@/lib/demo-project.js'
import ButtonAudition from '@/components/ButtonAudition.vue'

let showFavourites = ref(true)  // deprecated

const projectKey = computed(() => globals.getProjectKey())

const soloInKey = computed({
  get: () => globals.soloMode === 'key',
  set: (value) => setSoloMode(value ? 'key' : 'chord'),
})

const colours = PROJECT_COLOURS

// Changing the colour re-ranks every chord scale in the new profile.
const currentColour = computed({
  get: () => globals.getProjectColour(),
  set: (value) => applyProjectKeySettings({ colour: value }),
})

// How the per-chord scale is chosen: manual slot, follow the history, or shuffle.
const scalePolicy = computed({
  get: () => globals.scaleFiltering.policy,
  set: (value) => setScalePolicy(value),
})

// Presets for the active policy, and a selector that shows "Custom" when the
// current options do not match any preset.
const presetsForMode = computed(() => POLICY_PRESETS[globals.scaleFiltering.policy] ?? [])
const scalePreset = computed({
  get: () => {
    const options = globals.scaleFiltering.policyOptions
    const match = presetsForMode.value.find((preset) =>
      Object.entries(preset.options).every(([key, value]) => options[key] === value))
    return match ? match.name : 'custom'
  },
  set: (value) => {
    if (value === 'custom')
      return
    const preset = presetsForMode.value.find((candidate) => candidate.name === value)
    if (!preset)
      return
    Object.assign(globals.scaleFiltering.policyOptions, preset.options)
    applyScalePolicy()
  },
})

/** Return focus to the page after a policy control so note input resumes. */
function releaseControlFocus(event) {
  const el = event?.target
  if (el && typeof el.blur === 'function')
    el.blur()
}

// keyModeActive is true while the project key scale is actually sounding; a
// temporary 1-4 scale switch clears it until the next chord trigger.
const keyModeActive = computed(() => globals.scaleFiltering.keyModeActive)
const soloKeyName = computed(() => {
  const key = globals.getProjectKey()
  return key ? projectKeyName(key) : ''
})

// The last few chord-to-scale choices, newest first, for the history strip.
const scaleHistoryEntries = computed(() => {
  const key = globals.getProjectKey()
  const keyPcs = key ? pitchClassSet(projectKeyNotes(key)) : null
  return globals.chordHistory.slice(-4).reverse().map((entry) => ({
    chordName: entry.chordName,
    scaleName: entry.scaleName,
    policy: entry.policy ?? 'manual',
    outOfKey: keyPcs ? [...entry.scalePcs].some((pc) => !keyPcs.has(pc)) : false,
  }))
})

function configGrandSummary() {
  // Return an intelligent easy summary of the project config, for vuejs to use to display in UI
  // returns [ info, info, ... ]
  let result = []
  if (!globals.isProjectLoaded)
    return result

  for (let note of getProjectChordsTriggers()) {
    let info = _generateSummaryInfo(note)
    if (info) {
      if (_amAllowedToDisplayThisInfo(info))
        result.push(info)
    }
    else  // abort if info is ever null
      return []
  }
  return result
}

function _amAllowedToDisplayThisInfo(info) {
  if (!showFavourites.value &&
    globals.project.songs.default.favourites.includes(info.id)) {
    console.log('skipping display of favourite', info.id)
    return false
  }
  else
    return true
}

function lockedOrFrozen() {
  return globals.scaleFiltering.frozen || globals.scaleOverrideName != ''
}

/** True while a live auto/shuffle scale is sounding that may not be a stored slot. */
function autoScaleActive() {
  return globals.scaleFiltering.autoScaleNotes.length > 0
}

/** True when this stored scale has the same notes as the live auto scale. */
function scaleNotesAreAuto(notes) {
  if (!autoScaleActive())
    return false
  return samePitchClasses(notes, globals.scaleFiltering.autoScaleNotes)
}

/**
 * True when this scale's notes are the currently frozen (locked) scale, so the
 * grid can bold it and show a padlock even after the chord trigger moves on.
 * @param {Array<string>} notes
 */
function scaleNotesAreLocked(notes) {
  if (!globals.scaleFiltering.frozen)
    return false
  return samePitchClasses(notes, globals.scaleFiltering.frozenScaleNotes)
}

/**
 * Tooltip for the closest stored alternative when the live shuffle scale is
 * not itself a stored slot.
 * @param {number} common
 */
function closestTagTitle(common) {
  return `Closest stored alternative: shares ${common} notes with the sounding ${globals.scaleFiltering.autoScaleName} (auto)`
}

/**
 * Hover hint listing the notes in a scale, for the grid's scale filter cells.
 * @param {Array<string>} notes
 */
function scaleNotesTitle(notes) {
  return Array.isArray(notes) && notes.length > 0 ? 'Scale notes: ' + notes.join(' ') : ''
}

function _generateSummaryInfo(note) {
  /*
  Generate a summary info object for a single chord trigger note
  Parameters:'note' (string) which includes octave e.g. "C3"
  Rreturns: an info summary object {}
  */
  let triggerMap = globals.chordTriggerMap

  // console.log('configExpanded', Object.keys(configExpanded))

  // Check unresolved chord trigger notes like 'C' have been expanded to include octave, 
  // and notes like 'C_2' have been resolved into e.g. 'C5'
  // Unresolved notes thus have a length of one or three. Resolved notes have a length of two. 
  // Sharps and Flats not catered for but that's ok cos they are illegal as chord triger notes.
  if (Object.keys(triggerMap).length > 0) {
    let firstNote = Object.keys(triggerMap)[0]
    if (firstNote.length != 2) {
      // console.log('configExpanded has not been truly expanded yet, aborting display', configExpanded)
      return undefined
    }
  }

  let info = {
    get favourite() {
      return globals.project.songs.default.favourites.includes(info.id)
    },
    set favourite(value) {  // value is the t/f of the checkbox
      if (value) {
        globals.project.songs.default.favourites.push(info.id)
        if (this.blackListed)
          this.blackListed = false
        if (globals.idsToDelete.includes(info.id))
          globals.idsToDelete.splice(globals.idsToDelete.indexOf(info.id), 1)
      }
      else
        globals.project.songs.default.favourites = globals.project.songs.default.favourites.filter(x => x != info.id)
      if (globals.keySignatureDetection.fromFavouritesOnly)
        keyDetection()
    },
    get blackListed() {
      return globals.project.songs.default.blacklist.includes(info.id)
    },
    set blackListed(value) {  // value is the t/f of the checkbox
      if (value) {
        globals.project.songs.default.blacklist.push(info.id)
        if (this.favourite)
          this.favourite = false
        if (globals.idsToDelete.includes(info.id))
          globals.idsToDelete.splice(globals.idsToDelete.indexOf(info.id), 1)
      }
      else
        globals.project.songs.default.blacklist = globals.project.songs.default.blacklist.filter(x => x != info.id)
    },
    // getter and setter for todelete
    get todelete() {
      return globals.idsToDelete.includes(info.id)
    },
    set todelete(value) {  // value is the t/f of the checkbox
      if (value) {
        globals.idsToDelete.push(info.id)
        if (this.favourite)
          this.favourite = false
        if (this.blackListed)
          this.blackListed = false

      } else
        globals.idsToDelete = globals.idsToDelete.filter(x => x != info.id);
    },
  }
  const chordConfig = triggerMap[note]
  info.lhTriggerNote = note

  info.chordConfigName = chordConfig.name
  info.lhChord = chordConfig.chord
  info.symbols = chordConfig.symbols.split(',').join(', ')
  info.lhChordNotes = chordConfig.chordNotes.join(', ')
  info.lhChordNotesData = chordConfig.chordNotes.slice()  // copies the entire array
  info.lhChordIsCurrent = note === globals.currentChordTriggerNote
  info.rhScaleName = chordConfig.scale1
  info.rhScale2Name = chordConfig.scale2
  info.rhScale3Name = chordConfig.scale3
  // Derived note lists, shown as hover hints on the scale filter cells.
  info.rhScaleNotesData = chordConfig.scale1Notes ?? []
  info.rhScale2NotesData = chordConfig.scale2Notes ?? []
  info.rhScale3NotesData = chordConfig.scale3Notes ?? []
  info.rhScaleNotesOfChordData = chordConfig.scaleNotesOfChord ?? []
  // info.rhScaleNotesOfChordName = chordConfig.scale3  // ??????

  // nicer display of arrays of notes which might be there if proper scale name not detected 
  if (Array.isArray(info.rhScale2Name))
    info.rhScale2Name = info.rhScale2Name.join(',')
  if (Array.isArray(info.rhScale3Name))
    info.rhScale3Name = info.rhScale3Name.join(',')

  // Tiny labels under each scale: notes outside the project key, and whether
  // the scale is a colour choice of the active jazz/adventurous profile.
  const annotationInput = {
    symbol: chordConfig.chord,
    notes: chordConfig.chordNotes,
    bass: chordConfig.bass ?? chordConfig.bassNote,
    name: chordConfig.name,
  }
  const annotate = (scaleName) => {
    const key = globals.getProjectKey()
    if (!key || !scaleName || scaleName === 'notes of chord' || typeof scaleName !== 'string')
      return { outOfKey: [], colour: null }
    return scaleAnnotation(annotationInput, scaleName, key)
  }
  info.rhScaleAnnotation = annotate(info.rhScaleName)
  info.rhScale2Annotation = annotate(info.rhScale2Name)
  info.rhScale3Annotation = annotate(info.rhScale3Name)

  // Locked (frozen) scale: bold it and show a padlock in the grid.
  info.rhScaleIsLocked = scaleNotesAreLocked(chordConfig.scale1Notes)
  info.rhScale2IsLocked = scaleNotesAreLocked(chordConfig.scale2Notes)
  info.rhScale3IsLocked = scaleNotesAreLocked(chordConfig.scale3Notes)
  info.rhScaleNotesOfChordIsLocked = scaleNotesAreLocked(chordConfig.scaleNotesOfChord)

  // Live auto/shuffle scale: highlight the stored slot with the same notes,
  // if any, so the shuffle pick is visible in the grid when it coincides with
  // an alternative.
  info.rhScaleIsAuto = scaleNotesAreAuto(chordConfig.scale1Notes)
  info.rhScale2IsAuto = scaleNotesAreAuto(chordConfig.scale2Notes)
  info.rhScale3IsAuto = scaleNotesAreAuto(chordConfig.scale3Notes)

  // When the sounding shuffle scale is not a stored slot, mark the closest
  // stored alternative with a dashed border and a "closest" tag. Only the
  // current chord row carries the sounding scale.
  const autoActive = autoScaleActive()
  info.rhScaleNear = false
  info.rhScale2Near = false
  info.rhScale3Near = false
  info.rhScaleNearCommon = 0
  if (autoActive && info.lhChordIsCurrent && !info.rhScaleIsAuto && !info.rhScale2IsAuto && !info.rhScale3IsAuto) {
    const near = closestScaleIndex(
      [chordConfig.scale1Notes, chordConfig.scale2Notes, chordConfig.scale3Notes],
      globals.scaleFiltering.autoScaleNotes,
    )
    if (near && near.common > 0) {
      info.rhScaleNear = near.index === 0
      info.rhScale2Near = near.index === 1
      info.rhScale3Near = near.index === 2
      info.rhScaleNearCommon = near.common
    }
  }

  // While a live auto scale sounds, the stored slot is no longer current.
  info.rhScaleIsCurrent = !autoActive && info.rhScaleName === globals.currentChordConfig()[globals.currentScaleFilter]
  info.rhScale2IsCurrent = !autoActive && info.rhScale2Name === globals.currentChordConfig()[globals.currentScaleFilter]
  info.rhScale3IsCurrent = !autoActive && info.rhScale3Name === globals.currentChordConfig()[globals.currentScaleFilter]
  info.rhScaleNotesOfChordsCurrent = !autoActive && globals.currentScaleFilter == 'notesOfChord'

  info.bassData = chordConfig.bassNote

  // Deprecated - no info.bass anymore.
  // Display bass note being used. Note that configExpanded will ALWAYS have
  // .bass defined, whereas configOri will have most bass notes as "", unless
  // explicitly entered by a user.
  // info.bass = chordConfig.bass
  // if (chordConfig.bass)
  //   info.bass += ' 🎸'  // indicate that user explicitly entered a bass note e.g. 'C2'

  info.id = chordConfig.id
  return info
}

function _scaleFilterMouseDown(e) {
  let octave = '6'  // TODO should calculate this properly
  let noteName = e.target.innerText + octave
  let simulatedEvent = {
    note: new Note(noteName, { attack: 0.5 })  // Note is from global webmidijs not tonaljs
  }
  onNoteOn(simulatedEvent)
  onNoteOff(simulatedEvent)  // not needed, but just in case
}

function chordMouseDown(e) {
  let simulatedEvent = {
    note: new Note(e.target.innerText, { attack: 0.5 })
  }
  onNoteOn(simulatedEvent)
}

function chordMouseUp(e) {
  let simulatedEvent = {
    note: new Note(e.target.innerText, { attack: 0.5 })
  }
  onNoteOff(simulatedEvent)
}

function ondragstart(event) {
  start(event)
}

function ondragover(event) {
  dragover(event)
}

function ondragend(event) {
  dragend(event)
}

function scaleFilterTableClick(event) {
  // Lets you click on scale table to change current chord and scale

  // prevent event bubbling up to the table row, where generalTableClick would handle it
  event.stopPropagation()

  const tr = event.target.closest('tr')
  const triggerNote = tr.getAttribute('data-trigger-note')

  // scan parents till get to td - for data-scale-filter
  const td = event.target.closest('td')
  const scaleFilterNote = td.getAttribute('data-scale-filter-note') // C#, D# or F#

  // change triggered chord
  let simulatedEvent = {
    note: new Note(triggerNote, { attack: 0.5 })
  }
  onNoteOn(simulatedEvent)
  onNoteOff(simulatedEvent)

  // change scale filter
  let octave = '6'  // TODO should calculate this properly
  let noteName = scaleFilterNote + octave
  let simulatedEvent2 = {
    note: new Note(noteName, { attack: 0.1 })  // Note is from global webmidijs not tonaljs
  }
  onNoteOn(simulatedEvent2)
  onNoteOff(simulatedEvent2)  // not needed, but just in case
}

function generalTableClick(event) {
  const tr = event.target.closest('tr')
  const triggerNote = tr.getAttribute('data-trigger-note')
  // change triggered chord
  let simulatedEvent = {
    note: new Note(triggerNote, { attack: 0.0 }) // 0 means silent - only onNoteOn() understands this convention
  }
  onNoteOn(simulatedEvent)  
  onNoteOff(simulatedEvent)
}

</script>

<template>
  <!-- <ReallocatePanel /> -->
  <!-- <br> -->

  <div v-if="globals.isProjectLoaded" class="scale-settings ui small" @change="releaseControlFocus">
    <label class="checkboxLabel"
      title="Solo in key: while the chords change, the right hand stays on the project key scale instead of switching to each chord's scale. You cannot play a wrong note. The 1-4 shortcuts still switch temporarily; press 0 or Shift+Bb on a MIDI keyboard to toggle this. Set it before you start playing.">
      <input type="checkbox" v-model="soloInKey" /> Solo in key
    </label>
    <span v-if="keyModeActive" class="solo-active-badge" title="Every chord is currently filtered to this key scale">
      Solo in key → {{ soloKeyName }}
    </span>
    <span v-else-if="soloInKey" class="solo-paused-note" title="A temporary scale switch is in force until the next chord trigger">
      Solo in key (temporarily overridden)
    </span>
    <span class="ml-4">
      <span class="mr-1">Colour:</span>
      <select v-model="currentColour"
        title="Colour: how much chromatic colour the scale suggestions keep. diatonic stays strictly in key; jazz (default) keeps dorian and locrian #2 colour plus the functional dominants; adventurous prefers lydian and lydian-dominant colours.">
        <option v-for="colour in colours" :key="colour" :value="colour">{{ colour }}</option>
      </select>
    </span>
    <span class="ml-4">
      <span class="mr-1">Scales:</span>
      <select v-model="scalePolicy"
        title="How each chord's scale is chosen. manual uses the scale1/2/3 slots as before. follow history picks the stored alternative that continues the previous scale and chord function best. shuffle draws a live scale from the top ranked alternatives for variety.">
        <option value="manual">manual</option>
        <option value="follow">follow history</option>
        <option value="shuffle">shuffle</option>
      </select>
    </span>
    <label v-if="globals.scaleFiltering.policy !== 'manual'" class="preset-field" title="Presets: one-click options for the active mode. Custom means the values have been hand-tuned; open Options to see and adjust them.">
      <span>Preset:</span>
      <select v-model="scalePreset" :class="{ 'preset-custom': scalePreset === 'custom' }">
        <option value="custom" disabled>Custom</option>
        <option v-for="preset in presetsForMode" :key="preset.name" :value="preset.name">{{ preset.label }}</option>
      </select>
    </label>
    <button class="advanced-toggle" type="button"
      title="Scale policy options for the follow and shuffle modes"
      :aria-expanded="globals.showScaleAdvanced ? 'true' : 'false'"
      @click="releaseControlFocus($event); globals.showScaleAdvanced = !globals.showScaleAdvanced">
      {{ globals.showScaleAdvanced ? 'Hide options' : 'Options' }}
    </button>
    <span v-if="globals.scaleFiltering.autoScaleName" class="auto-live-chip"
      :title="globals.scaleFiltering.autoReason || 'The live scale chosen by the follow or shuffle policy'">
      auto: {{ globals.scaleFiltering.autoScaleName }}
    </span>
    <span v-if="globals.scaleFiltering.autoReason" class="auto-reason">{{ globals.scaleFiltering.autoReason }}</span>
    <span v-if="projectKey" class="project-key">
      Key: <code>{{ projectKeyName(projectKey) }}</code>
    </span>
  </div>

  <!-- scale policy options for the follow/shuffle modes -->
  <div v-if="globals.isProjectLoaded && globals.showScaleAdvanced" class="scale-advanced ui small" @change="releaseControlFocus">
    <template v-if="globals.scaleFiltering.policy === 'shuffle'">
      <label class="advanced-field">Pool
        <select v-model.number="globals.scaleFiltering.policyOptions.poolSize"
          title="Shuffle pool: how many ranked candidates the draw is taken from. 3 uses only the stored scale1/2/3, so the grid always highlights exactly; larger pools offer more colour and more live auto scales.">
          <option v-for="n in [3, 4, 5, 6, 7, 8]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <label class="advanced-field">Dwell
        <select v-model.number="globals.scaleFiltering.policyOptions.dwell"
          title="Dwell: how many chord changes to hold the drawn rank before redrawing. Each new chord still gets a fitting scale of that rank; a longer dwell is steadier and less busy.">
          <option v-for="n in [1, 2, 3, 4]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <label class="advanced-field">Change
        <select v-model.number="globals.scaleFiltering.policyOptions.changeChance"
          title="Change chance: the probability of drawing a new rank at a dwell boundary. Lower values keep the current colour for longer.">
          <option :value="1">100%</option>
          <option :value="0.75">75%</option>
          <option :value="0.5">50%</option>
          <option :value="0.25">25%</option>
          <option :value="0">0%</option>
        </select>
      </label>
      <label class="advanced-field">Spread
        <select v-model.number="globals.scaleFiltering.policyOptions.maxNewNotes"
          title="Spread: how far a shuffle change may move the note set. Close keeps the same notes, 1-2 notes are close colour shifts, Wild allows anything.">
          <option :value="0">same notes</option>
          <option :value="1">1 note</option>
          <option :value="2">2 notes</option>
          <option :value="7">Wild</option>
        </select>
      </label>
      <label class="advanced-field checkbox-field"
        title="Hold while playing: do not jump the scale while solo notes are sounding; take the closest fit to what you are playing instead.">
        <input type="checkbox" v-model="globals.scaleFiltering.policyOptions.deferWhilePlaying" /> Hold
      </label>
    </template>
    <template v-else-if="globals.scaleFiltering.policy === 'follow'">
      <label class="advanced-field">Context
        <select v-model.number="globals.scaleFiltering.policyOptions.contextChords"
          title="Progression context: how many previous chords to consider. Two chords recognises a full ii-V-I and other chains; one chord uses only the chord just played.">
          <option :value="1">1 chord</option>
          <option :value="2">2 chords</option>
        </select>
      </label>
    </template>
    <span v-else class="advanced-hint">Select follow or shuffle to tune the scale policy.</span>
    <template v-if="globals.scaleFiltering.policy !== 'manual'">
      <label class="advanced-field checkbox-field"
        title="Phrase: bias the next chord's scale by the last solo note you played, so the phrase resolves instead of being cut off.">
        <input type="checkbox" v-model="globals.scaleFiltering.policyOptions.phraseBias" /> Phrase
      </label>
      <label class="advanced-field" v-if="globals.scaleFiltering.policyOptions.phraseBias">Strength
        <select v-model.number="globals.scaleFiltering.policyOptions.phraseStrength"
          title="How strongly the last solo note influences the choice. Low is a gentle nudge, high insists on the resolution.">
          <option :value="0.5">low</option>
          <option :value="1">medium</option>
          <option :value="2">high</option>
        </select>
      </label>
    </template>
    <label class="advanced-field checkbox-field"
      title="Fix held notes: when a chord trigger changes the scale just after you played a solo note, move the still-sounding note to the new scale instead of leaving it on the old one.">
      <input type="checkbox" v-model="globals.scaleFiltering.policyOptions.remapHeldNotes" /> Fix held
    </label>
    <label class="advanced-field" v-if="globals.scaleFiltering.policyOptions.remapHeldNotes">Window
      <select v-model.number="globals.scaleFiltering.policyOptions.remapGraceMs"
        title="How recently the held note must have started to be corrected. A short window re-attacks so quickly it is barely audible; a long window also moves notes you are holding deliberately.">
        <option :value="25">25 ms</option>
        <option :value="40">40 ms</option>
        <option :value="60">60 ms</option>
        <option :value="100">100 ms</option>
        <option :value="100000">any</option>
      </select>
    </label>
    <label class="advanced-field checkbox-field"
      title="Show a strip of the last few chord-to-scale choices above the grid.">
      <input type="checkbox" v-model="globals.showScaleHistory" /> History
    </label>
    <button v-if="globals.scaleFiltering.policy === 'shuffle'" class="advanced-button" type="button"
      title="Draw a new scale for the current chord now"
      @click="releaseControlFocus($event); rerollShuffleScale()">Reroll</button>
  </div>

  <!-- recent chord-to-scale choices -->
  <div v-if="globals.isProjectLoaded && globals.showScaleHistory && scaleHistoryEntries.length" class="scale-history ui small">
    <span class="history-label">Recent:</span>
    <span v-for="(entry, i) in scaleHistoryEntries" :key="i" class="history-item">
      <span class="history-chord">{{ entry.chordName }}</span>
      <span class="history-arrow">→</span>
      <span class="history-scale" :class="{ 'history-out': entry.outOfKey }"
        :title="entry.outOfKey ? 'This scale uses notes outside the project key' : 'This scale fits the project key'">{{ entry.scaleName }}</span>
      <span class="history-badge" :class="'history-badge-' + entry.policy">{{ entry.policy }}</span>
    </span>
  </div>

  <!-- grand summary table -->
  <table v-if="globals.isProjectLoaded" id="grand-summary" style="width:100%;" border="1" bordercolor="green"
    :class="{ 'solo-in-key-grid': keyModeActive }">
    <thead>
      <tr>
        <th>Id</th>
        <th>Trigger</th>
        <!-- <th>Config Name</th> -->
        <th>Chord</th>
        <!-- <th>Symbols</th> -->
        <th>Chord Notes</th>
        <th>Bass</th>
        <th>
          <table style="width:100%;">
            <tbody>
            <tr>
              <th width="25%">Scale Filter 1<br> <button @mousedown="_scaleFilterMouseDown" @touchstart.prevent="_scaleFilterMouseDown"
                  :class="{ 'boldy': globals.currentScaleFilter == 'scale1' }" class="trigger-btn p-2">C#</button></th>
              <th width="25%">Scale Filter 2<br> <button @mousedown="_scaleFilterMouseDown" @touchstart.prevent="_scaleFilterMouseDown"
                  :class="{ 'boldy': globals.currentScaleFilter == 'scale2' }" class="trigger-btn p-2">D#</button>
              </th>
              <th width="25%">Scale Filter 3<br> <button @mousedown="_scaleFilterMouseDown" @touchstart.prevent="_scaleFilterMouseDown"
                  :class="{ 'boldy': globals.currentScaleFilter == 'scale3' }" class="trigger-btn p-2">F#</button>
              </th>
              <th width="25%">Special Scale Filter<br> <button @mousedown="_scaleFilterMouseDown" @touchstart.prevent="_scaleFilterMouseDown"
                  :class="{ 'boldy': globals.currentScaleFilter == 'notesOfChord' }" class="trigger-btn p-2">G#</button>
              </th>
            </tr>
            </tbody>
          </table>
        </th>

        <th v-if="globals.showFavouriteBinColumns"><button @click="markAllVisibleChordsAsFavourites(); if (globals.keySignatureDetection.fromFavouritesOnly) keyDetection()" class="circular compact mini transparent ui icon button" title="Add all to favourites"> <i class="heart icon"></i> </button></th>
        <!-- <th><button @click="markAllVisibleChordsForBlackList()" class="circular compact mini transparent ui icon button" title="Add all to blacklist"> <i class="thumbs down icon"></i> </button></th> -->
        <th v-if="globals.showFavouriteBinColumns"><button @click="markAllVisibleChordsForDeletion()" class="circular compact mini transparent ui icon button" title="Mark all to be deleted - then Actions/Reallocate Chords to apply"> <i class="trash icon"></i> </button></th>

      </tr>
    </thead>
    <tbody>
      <tr v-for="(info) in configGrandSummary()" :key="info.id"
        :data-trigger-note="info.lhTriggerNote"
        @click="generalTableClick($event);"
      >
        <td class="move-cursor" draggable="true" @dragstart="ondragstart($event)" @dragover="ondragover($event)"
          @dragend="ondragend($event)">
          <div class="draggable-indicator">
            <svg viewBox="0 0 32 32">
              <rect height="4" width="4" y="4" x="0" />
              <rect height="4" width="4" y="12" x="0" />
              <rect height="4" width="4" y="20" x="0" />
              <rect height="4" width="4" y="4" x="8" />
              <rect height="4" width="4" y="12" x="8" />
              <rect height="4" width="4" y="20" x="8" />
              <rect height="4" width="4" y="4" x="16" />
              <rect height="4" width="4" y="12" x="16" />
              <rect height="4" width="4" y="20" x="16" />
            </svg>
            <span>
              {{ info.id }}
            </span>
          </div>
        </td>
        <td>
          <button 
            @mousedown="chordMouseDown" 
            @touchstart.prevent="chordMouseDown" 
            @mouseup="chordMouseUp" 
            @touchend.prevent="chordMouseUp" 
            :class="{ 'boldy': info.lhChordIsCurrent }"
            class="trigger-btn p-2">
            {{ info.lhTriggerNote }}
          </button>
        </td>
        <!-- <td>
          {{ info.chordConfigName }}
        </td> -->
        <td>
          <code :class="{ 'boldy': info.lhChordIsCurrent }">
            {{ info.lhChord }}
          </code>
        </td>
        <!-- <td>
          {{ info.symbols }}
        </td> -->
        <td>
          <ButtonAudition :notes="info.lhChordNotesData" :bass="info.bassData" />
          <span class="ml-1">{{ info.lhChordNotes }}</span>
        </td>
        <td><span>{{ info.bassData }}</span></td>
        <td>

          <!-- Currently applying boldy class to all scales that match the current highlighted scale in the same config row.
          This can be loosened to bold all scales in the grid by removing the condition && info.lhChordIsCurrent 
          This can be tightened to only bold the current scale by adding the condition  && globals.currentScaleFilter == 'rhnotes{,2,3}' 
          -->
          <table class="scale-filters" style="width:100%;" @click="scaleFilterTableClick($event);">
            <tbody>
            <tr 
              :data-trigger-note="info.lhTriggerNote">
              <td width="25%"
                data-scale-filter="scale1"
                data-scale-filter-note="C#"
                :title="scaleNotesTitle(info.rhScaleNotesData)"
                :class="{ 'td-highlight': (info.lhChordIsCurrent && !autoScaleActive() && globals.currentScaleFilter == 'scale1') || (autoScaleActive() && info.rhScaleIsAuto && info.lhChordIsCurrent), 'td-near': info.rhScaleNear }">
                <span><code v-if="info.rhScaleName" class="scale-name"
                    :class="{ 'boldy': (!lockedOrFrozen() && info.rhScaleIsCurrent && info.lhChordIsCurrent) || info.rhScaleIsLocked || (autoScaleActive() && info.rhScaleIsAuto && info.lhChordIsCurrent) }">
                            {{ info.rhScaleName }}</code><code v-else>none</code><span v-if="info.rhScaleIsLocked"
                        class="scale-lock" title="This scale is locked (press 5 to unlock)">🔒</span></span>&nbsp;&nbsp;
                <div v-if="info.rhScaleName" class="scale-tags">
                  <span v-if="info.rhScaleNear" class="scale-tag scale-tag-near"
                    :title="closestTagTitle(info.rhScaleNearCommon)">closest</span>
                  <span v-if="info.rhScaleAnnotation.outOfKey.length" class="scale-tag"
                    :class="{ struck: keyModeActive, 'scale-tag-colour': info.rhScaleAnnotation.colour }"
                    :title="'Notes outside the key: ' + info.rhScaleAnnotation.outOfKey.join(', ')">out of key: {{ info.rhScaleAnnotation.outOfKey.join(' ') }}</span>
                  <span v-if="info.rhScaleAnnotation.colour" class="scale-tag scale-tag-colour"
                    :title="'A ' + info.rhScaleAnnotation.colour + ' colour scale'">{{ info.rhScaleAnnotation.colour }}</span>
                </div>
                <!-- debugging: &nbsp;{{info.rhScaleIsCurrent}}&nbsp;{{globals.currentScaleFilter == 'scale1'}} -->
              </td>
              <td width="25%"
                data-scale-filter="scale2"
                data-scale-filter-note="D#"
                :title="scaleNotesTitle(info.rhScale2NotesData)"
                :class="{ 'td-highlight': (info.lhChordIsCurrent && !autoScaleActive() && globals.currentScaleFilter == 'scale2') || (autoScaleActive() && info.rhScale2IsAuto && info.lhChordIsCurrent), 'td-near': info.rhScale2Near }">
                <span><code v-if="info.rhScale2Name" class="scale-name"
                    :class="{ 'boldy': (!lockedOrFrozen() && info.rhScale2IsCurrent && info.lhChordIsCurrent) || info.rhScale2IsLocked || (autoScaleActive() && info.rhScale2IsAuto && info.lhChordIsCurrent) }">
                            {{ info.rhScale2Name }}</code><code v-else>none</code><span v-if="info.rhScale2IsLocked"
                        class="scale-lock" title="This scale is locked (press 5 to unlock)">🔒</span></span>&nbsp;&nbsp; 
                <div v-if="info.rhScale2Name" class="scale-tags">
                  <span v-if="info.rhScale2Near" class="scale-tag scale-tag-near"
                    :title="closestTagTitle(info.rhScaleNearCommon)">closest</span>
                  <span v-if="info.rhScale2Annotation.outOfKey.length" class="scale-tag"
                    :class="{ struck: keyModeActive, 'scale-tag-colour': info.rhScale2Annotation.colour }"
                    :title="'Notes outside the key: ' + info.rhScale2Annotation.outOfKey.join(', ')">out of key: {{ info.rhScale2Annotation.outOfKey.join(' ') }}</span>
                  <span v-if="info.rhScale2Annotation.colour" class="scale-tag scale-tag-colour"
                    :title="'A ' + info.rhScale2Annotation.colour + ' colour scale'">{{ info.rhScale2Annotation.colour }}</span>
                </div>
                <!-- debugging: &nbsp;{{info.rhScale2IsCurrent}}&nbsp;{{globals.currentScaleFilter == 'scale2'}} -->
              </td>
              <td width="25%"
                data-scale-filter="scale3"
                data-scale-filter-note="F#"
                :title="scaleNotesTitle(info.rhScale3NotesData)"
                :class="{ 'td-highlight': (info.lhChordIsCurrent && !autoScaleActive() && globals.currentScaleFilter == 'scale3') || (autoScaleActive() && info.rhScale3IsAuto && info.lhChordIsCurrent), 'td-near': info.rhScale3Near }">
                <code v-if="info.rhScale3Name" class="scale-name"
                    :class="{ 'boldy': (!lockedOrFrozen() && info.rhScale3IsCurrent && info.lhChordIsCurrent) || info.rhScale3IsLocked || (autoScaleActive() && info.rhScale3IsAuto && info.lhChordIsCurrent) }">
                            {{ info.rhScale3Name }}</code>
                <code v-else>none</code>
                <span v-if="info.rhScale3IsLocked" class="scale-lock"
                    title="This scale is locked (press 5 to unlock)">🔒</span>
                <div v-if="info.rhScale3Name" class="scale-tags">
                  <span v-if="info.rhScale3Near" class="scale-tag scale-tag-near"
                    :title="closestTagTitle(info.rhScaleNearCommon)">closest</span>
                  <span v-if="info.rhScale3Annotation.outOfKey.length" class="scale-tag"
                    :class="{ struck: keyModeActive, 'scale-tag-colour': info.rhScale3Annotation.colour }"
                    :title="'Notes outside the key: ' + info.rhScale3Annotation.outOfKey.join(', ')">out of key: {{ info.rhScale3Annotation.outOfKey.join(' ') }}</span>
                  <span v-if="info.rhScale3Annotation.colour" class="scale-tag scale-tag-colour"
                    :title="'A ' + info.rhScale3Annotation.colour + ' colour scale'">{{ info.rhScale3Annotation.colour }}</span>
                </div>
                <!-- debugging: &nbsp;{{info.rhScale3IsCurrent}}&nbsp;{{globals.currentScaleFilter == 'scale3'}} -->
              </td>
              <td width="25%"
                data-scale-filter="notesOfChord"
                data-scale-filter-note="G#"
                :title="scaleNotesTitle(info.rhScaleNotesOfChordData)"
                :class="{ 'td-highlight': info.lhChordIsCurrent && info.rhScaleNotesOfChordsCurrent }">
                <code
                  :class="{ 'boldy': (!lockedOrFrozen() && info.lhChordIsCurrent && info.rhScaleNotesOfChordsCurrent) || info.rhScaleNotesOfChordIsLocked }">
                  notes of chord
                </code>
                <span v-if="info.rhScaleNotesOfChordIsLocked" class="scale-lock"
                  title="Notes of chord is the locked scale (press 5 to unlock)">🔒</span>
              </td>
            </tr>
            </tbody>
          </table>

        </td>
        <td v-if="globals.showFavouriteBinColumns"><input type="checkbox" v-model="info.favourite" /></td>
        <!-- <td><input type="checkbox" v-model="info.blackListed" /></td> -->
        <td v-if="globals.showFavouriteBinColumns"><input type="checkbox" v-model="info.todelete" /></td>
      </tr>
    </tbody>
  </table>
  <div v-else class="warn">
    <p>No Chords or Scales in Project yet.
      <button type="button" class="demo-button" @click="loadDemoProject()">Load demo project</button>
    </p>
  </div>

  <!-- show favourites, whilst it works, might be a confusing UI paradigm esp. in conjunction with allocate favourites global -->
  <!-- <p><label>Show Favourites <input type="checkbox" v-model="showFavourites" /></label></p> -->

</template>

<style>
/* show borders on inner table showing scale filters so can highlight current cell */
table.scale-filters {
  border-collapse: separate;
}

/* borders the same colour as background, thus invisible but buys us space 
so that when we turn a border on, the formatting of the whole table doesn't jump */
table.scale-filters td {
  border-color: burlywood;
  border-style: solid;
  border-width: 0.15em;
}

/* selected cell, turn border colour on */
.td-highlight {
  border-color: #a5673f !important;
}

/* closest stored alternative while a live shuffle scale sounds: dashed amber,
   deliberately weaker than the solid .td-highlight so it reads as a pointer,
   not as the sounding filter */
.td-near {
  border-style: dashed !important;
  border-color: #c9a227 !important;
}

.warn {
  color: brown;
  /* font-weight: bold; */
}

/* Rounded blue pill, matching the "? Shortcuts" button. */
.demo-button {
  margin-left: 0.75rem;
  padding: 0.15rem 0.6rem;
  border: 1px solid #2f4fa8;
  border-radius: 999px;
  background: #4a6fd4;
  color: #fff;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  vertical-align: middle;
}

.demo-button:hover {
  background: #3a5cc0;
}

/* Solo in key / colour controls that sit directly above the scale grid. */
.scale-settings {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.scale-settings .checkboxLabel {
  cursor: pointer;
}

/* Project key, pushed to the right so it does not shift as controls change. */
.project-key {
  margin-left: auto;
  font-size: 1.2rem;
  font-weight: bold;
  color: #5a3d1a;
  white-space: nowrap;
}

.project-key code {
  font-size: 1.2rem;
}

/* Small button that reveals the follow/shuffle policy options. */
.advanced-toggle {
  padding: 0.05rem 0.5rem;
  border: 1px solid #b9a98e;
  border-radius: 999px;
  background: #efe3cf;
  color: #6b5a45;
  font-size: 0.75rem;
  cursor: pointer;
}

.advanced-toggle:hover {
  background: #e6d7bd;
}

/* Preset selector surfaced beside the Options button, so the active
   shuffle/follow flavour stays visible even when the options are hidden. */
.preset-field {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #4a3418;
}

.preset-field select.preset-custom {
  border-color: #b0631e;
  background: #f6e3c8;
  color: #8a4a12;
  font-weight: bold;
}

/* Scale policy options row, shown under the scale settings. */
.scale-advanced {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
  padding: 0.35rem 0.6rem;
  border: 1px dashed #b9915a;
  border-radius: 6px;
  background: #e9cf9f;
}

.scale-advanced .advanced-field {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #4a3418;
}

.advanced-button {
  padding: 0.05rem 0.6rem;
  border: 1px solid #2f4fa8;
  border-radius: 999px;
  background: #4a6fd4;
  color: #fff;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
}

.advanced-button:hover {
  background: #3a5cc0;
}

.advanced-button.subtle {
  border-color: #b9a98e;
  background: #efe3cf;
  color: #6b5a45;
}

.advanced-button.subtle:hover {
  background: #e6d7bd;
}

.advanced-hint {
  color: #8a6d3b;
  font-style: italic;
}

/* Recent chord-to-scale strip. */
.scale-history {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  color: #6b5a45;
}

.history-label {
  font-weight: bold;
}

.history-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.05rem 0.4rem;
  border: 1px solid #bfa06a;
  border-radius: 6px;
  background: #e9cf9f;
}

.history-chord {
  font-weight: bold;
}

.history-arrow {
  color: #a58a63;
}

.history-scale.history-out {
  color: #b26a00;
}

.history-badge {
  font-size: 0.62rem;
  line-height: 1.3;
  padding: 0 0.25rem;
  border-radius: 3px;
  border: 1px solid #d9c9b0;
  background: #efe3cf;
  color: #6b5a45;
  text-transform: lowercase;
}

.history-badge-follow {
  background: #dce4f7;
  color: #2f4fa8;
  border-color: #b9c9ee;
}

.history-badge-shuffle {
  background: #fbeecb;
  color: #8a6d1a;
  border-color: #e6cf8b;
}

/* Tiny annotations under a scale in the grid. */
.scale-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.15rem;
}

.scale-tag {
  font-size: 0.62rem;
  line-height: 1.3;
  padding: 0 0.25rem;
  border-radius: 3px;
  background: #efe3cf;
  color: #6b5a45;
  border: 1px solid #d9c9b0;
}

.scale-tag-colour {
  background: #dce4f7;
  color: #2f4fa8;
  border-color: #b9c9ee;
}

.scale-tag-near {
  background: #fbeecb;
  color: #8a6d1a;
  border-color: #e6cf8b;
}

/* When Solo in key is sounding, the stored per-chord scales are dormant. */
.solo-in-key-grid .scale-name {
  opacity: 0.45;
}

.scale-lock {
  margin-left: 0.2rem;
  font-size: 0.85em;
}

.scale-tag.struck {
  text-decoration: line-through;
  opacity: 0.5;
}

.solo-active-badge {
  margin-left: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #4a6fd4;
  color: #fff;
  border: 1px solid #2f4fa8;
  font-weight: bold;
}

.solo-paused-note {
  margin-left: 0.75rem;
  color: #8a6d3b;
  font-style: italic;
}

/* Short explanation of the last follow/shuffle scale choice. */
.auto-reason {
  color: #2f4fa8;
  font-style: italic;
  font-size: 1.05rem;
}

/* The live scale chosen by the follow or shuffle policy. */
.auto-live-chip {
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  background: #dce4f7;
  color: #2f4fa8;
  border: 1px solid #b9c9ee;
  font-size: 1rem;
  font-weight: bold;
}

</style>
