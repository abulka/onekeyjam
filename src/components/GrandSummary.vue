<script setup>
import { computed, ref } from 'vue'
import { globals } from '../../src/lib/globals.js'
import { setSoloMode } from '../../src/lib/change-scale.js'
import { applyProjectKeySettings } from '../../src/lib/projectScaleSettings.js'
import { scaleAnnotation, PROJECT_COLOURS } from '../../src/lib/chordScaleEngine.js'
import { Note } from '@/lib/midi/webmidi.js'
import { getProjectChordsTriggers } from "../../src/lib/project-chord-triggers.js"
import { onNoteOn, onNoteOff } from "@/lib/midi/wire-events.js"
import { start, dragover, dragend } from '../../src/lib/drag-drop-table-rows.js'
import { markAllVisibleChordsForDeletion, markAllVisibleChordsAsFavourites } from '../../src/lib/massOperationsOnChordConfigs'
import { keyDetection } from '../../src/lib/keyDetection';
import { projectKeyName } from '../../src/lib/projectKey.js';
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

// keyModeActive is true while the project key scale is actually sounding; a
// temporary 1-4 scale switch clears it until the next chord trigger.
const keyModeActive = computed(() => globals.scaleFiltering.keyModeActive)
const soloKeyName = computed(() => {
  const key = globals.getProjectKey()
  return key ? projectKeyName(key) : ''
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

/**
 * True when this scale's notes are the currently frozen (locked) scale, so the
 * grid can bold it and show a padlock even after the chord trigger moves on.
 * @param {Array<string>} notes
 */
function scaleNotesAreLocked(notes) {
  if (!globals.scaleFiltering.frozen)
    return false
  const frozen = globals.scaleFiltering.frozenScaleNotes
  if (!Array.isArray(notes) || notes.length === 0 || !Array.isArray(frozen) || frozen.length === 0)
    return false
  if (notes.length !== frozen.length)
    return false
  const a = notes.map(n => String(n).toLowerCase()).sort()
  const b = frozen.map(n => String(n).toLowerCase()).sort()
  return a.every((note, i) => note === b[i])
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

  info.rhScaleIsCurrent = info.rhScaleName === globals.currentChordConfig()[globals.currentScaleFilter]
  info.rhScale2IsCurrent = info.rhScale2Name === globals.currentChordConfig()[globals.currentScaleFilter]
  info.rhScale3IsCurrent = info.rhScale3Name === globals.currentChordConfig()[globals.currentScaleFilter]
  info.rhScaleNotesOfChordsCurrent = globals.currentScaleFilter == 'notesOfChord'

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

  <div v-if="globals.isProjectLoaded" class="scale-settings ui small">
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
    <span v-if="projectKey" class="ml-3 ui small text grey">
      Key: <code>{{ projectKeyName(projectKey) }}</code>
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

        <th><button @click="markAllVisibleChordsAsFavourites(); if (globals.keySignatureDetection.fromFavouritesOnly) keyDetection()" class="circular compact mini transparent ui icon button" title="Add all to favourites"> <i class="heart icon"></i> </button></th>
        <!-- <th><button @click="markAllVisibleChordsForBlackList()" class="circular compact mini transparent ui icon button" title="Add all to blacklist"> <i class="thumbs down icon"></i> </button></th> -->
        <th><button @click="markAllVisibleChordsForDeletion()" class="circular compact mini transparent ui icon button" title="Mark all to be deleted - then Actions/Reallocate Chords to apply"> <i class="trash icon"></i> </button></th>

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
                :class="{ 'td-highlight': info.lhChordIsCurrent && globals.currentScaleFilter == 'scale1' }">
                <span><code v-if="info.rhScaleName" class="scale-name"
                    :class="{ 'boldy': (!lockedOrFrozen() && info.rhScaleIsCurrent && info.lhChordIsCurrent) || info.rhScaleIsLocked }">
                            {{ info.rhScaleName }}</code><code v-else>none</code><span v-if="info.rhScaleIsLocked"
                        class="scale-lock" title="This scale is locked (press 5 to unlock)">🔒</span></span>&nbsp;&nbsp;
                <div v-if="info.rhScaleName" class="scale-tags">
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
                :class="{ 'td-highlight': info.lhChordIsCurrent && globals.currentScaleFilter == 'scale2' }">
                <span><code v-if="info.rhScale2Name" class="scale-name"
                    :class="{ 'boldy': (!lockedOrFrozen() && info.rhScale2IsCurrent && info.lhChordIsCurrent) || info.rhScale2IsLocked }">
                            {{ info.rhScale2Name }}</code><code v-else>none</code><span v-if="info.rhScale2IsLocked"
                        class="scale-lock" title="This scale is locked (press 5 to unlock)">🔒</span></span>&nbsp;&nbsp; 
                <div v-if="info.rhScale2Name" class="scale-tags">
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
                :class="{ 'td-highlight': info.lhChordIsCurrent && globals.currentScaleFilter == 'scale3' }">
                <code v-if="info.rhScale3Name" class="scale-name"
                    :class="{ 'boldy': (!lockedOrFrozen() && info.rhScale3IsCurrent && info.lhChordIsCurrent) || info.rhScale3IsLocked }">
                            {{ info.rhScale3Name }}</code>
                <code v-else>none</code>
                <span v-if="info.rhScale3IsLocked" class="scale-lock"
                    title="This scale is locked (press 5 to unlock)">🔒</span>
                <div v-if="info.rhScale3Name" class="scale-tags">
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
        <td><input type="checkbox" v-model="info.favourite" /></td>
        <!-- <td><input type="checkbox" v-model="info.blackListed" /></td> -->
        <td><input type="checkbox" v-model="info.todelete" /></td>
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

</style>
