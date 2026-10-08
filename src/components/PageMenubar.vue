<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useSlots } from 'vue'
import { globals } from '@/lib/globals.js'
import { newProject, loadUserProject, loadFeaturedProject, loadClassicProject, loadProgressionProject, loadRockProject } from '@/lib/boot-project'
import { saveProject, saveProjectAs, downloadProject, downloadMidiChords, downloadMidiChordsForChordMemoryTrigger, uploadProject } from '@/lib/projectSave.js'
import { loadDemoProject } from '@/lib/demo-project.js'
import { sequencerControl, sequenceOptions } from '@/lib/sequencer-control.js'
import ComboProjectLibrary from '@/components/ComboProjectLibrary.vue'
import FileImportMidiDialog from '@/components/FileImportMidiDialog.vue'

// The shared second-level menu bar. It owns the File menu, the guided tour and
// the project library dialogs; the Actions menu items are supplied by each page
// through the `actions` slot (pages without actions simply omit it).

const slots = useSlots()
const hasActions = computed(() => !!slots.actions)

// The pattern sequencer's named sequences (excerpt, full form, ...), so the
// transport can switch them and drive playback from any page.
const sequenceOptionsList = computed(() => sequenceOptions())

function onSequenceChange(event) {
  sequencerControl.selectSequence(event.target.value)
}

const sequencerButtonTitle = computed(() => {
  if (!sequencerControl.hasNotes)
    return 'This song has no pattern notes to play'
  return sequencerControl.isPlaying ? 'Stop the pattern sequencer' : 'Play the pattern sequencer'
})

const menuEl = ref(null)
const tour = ref(null)
const fileOpenComponent = ref()
const fileOpenComponentClassic = ref()
const fileOpenComponentProgressions = ref()
const fileOpenComponentRock = ref()
const fileOpenComponentUser = ref()
const fileImportMidiDialog = ref()

const fileOpenUserAllowed = computed(() => true)
const fileSaveAllowed = computed(() => true)
const reloadProjectAllowed = computed(() => globals.isProjectLoaded && globals.projectLibrary.projectName != '')
const downloadProjectAllowed = computed(() => globals.isProjectLoaded)
const uploadProjectAllowed = computed(() => true)

// The tour targets are shared across pages; only those present in the current
// page DOM are used, so the button works on the Edit, Perform and Settings views.
const allSteps = [
  {
    target: '[data-step="piano-keyboard"]',
    content: 'Once you add some chords to the project, you can trigger chords with one finger on the piano keyboard or on your external midi keyboard.',
    placement: 'bottom',
  },
  {
    target: '[data-step="file-menu"]',
    content: 'Use the File menu to open projects incl. demo projects that are ready to play!',
    placement: 'bottom-start',
  },
  {
    target: '[data-step="bypass-filtering"]',
    content: 'Toggle this to get a pure piano keyboard without magic one note chords and with no scale filtering',
  },
  {
    target: '[data-step="edit-chords"]',
    content: 'This is where you can add chords to your project (and edit them too). If this area is closed you can open it by expanding the accordion.',
    placement: 'bottom-start',
    // auto, auto-start, auto-end, top, top-start, top-end, bottom, bottom-start, bottom-end, right, right-start, right-end, left, left-start, left-end
  },
  {
    target: '[data-step="settings"]',
    content: 'Use Settings to choose your MIDI keyboard and inspect the debug panels.',
    placement: 'bottom',
  },
]

const steps = ref([])

function availableSteps() {
  return allSteps.filter(step => document.querySelector(step.target))
}

async function tutorial() {
  steps.value = availableSteps()
  await nextTick()
  tour.value?.resetTour()
  tour.value?.startTour()
}

function reloadCurrentProject() {
  const category = globals.projectLibrary.projectIsUserOrFeatured
  if (category == 'user')
    loadUserProject()
  else if (category == 'classic')
    loadClassicProject()
  else if (category == 'progressions')
    loadProgressionProject()
  else if (category == 'rock')
    loadRockProject()
  else
    loadFeaturedProject()
}

function fileOpenFeatured() {
  fileOpenComponent.value.fileOpen()
}

function fileOpenClassic() {
  fileOpenComponentClassic.value.fileOpen()
}

function fileOpenProgressions() {
  fileOpenComponentProgressions.value.fileOpen()
}

function fileOpenRock() {
  fileOpenComponentRock.value.fileOpen()
}

function fileOpenUser() {
  fileOpenComponentUser.value.fileOpen()
}

/**
 * Load a random project from a static collection. Excludes the current
 * project when there is more than one choice, so the dice always moves you.
 */
function loadRandomFrom(names, label, load) {
  if (!names || names.length === 0) {
    if (typeof $ === 'function')
      $('body').toast({ message: `${label} are still loading`, displayTime: 1500, class: 'brown' })
    return
  }
  const current = globals.projectLibrary.projectName
  const candidates = names.length > 1 ? names.filter(name => name !== current) : names
  const name = candidates[Math.floor(Math.random() * candidates.length)]
  load(name)
}

/**
 * Load a random song from the classic and rock collections. Excludes the
 * current project when there is more than one choice, so the dice always
 * moves you.
 */
function loadRandomClassicProject() {
  const classic = globals.projectLibrary.classicProjectNames ?? []
  const rock = globals.projectLibrary.rockProjectNames ?? []
  const all = [...classic, ...rock]
  if (all.length === 0) {
    if (typeof $ === 'function')
      $('body').toast({ message: 'Classic and rock projects are still loading', displayTime: 1500, class: 'brown' })
    return
  }
  const current = globals.projectLibrary.projectName
  const candidates = all.length > 1 ? all.filter(name => name !== current) : all
  const name = candidates[Math.floor(Math.random() * candidates.length)]
  if (rock.includes(name))
    loadRockProject(name)
  else
    loadClassicProject(name)
}

/**
 * Load a random progression from the progressions collection. Excludes the
 * current project when there is more than one choice.
 */
function loadRandomProgressionProject() {
  loadRandomFrom(globals.projectLibrary.progressionProjectNames, 'Progressions', loadProgressionProject)
}

function keyDownListener(e) {
  if (e.code === 'KeyN' && e.altKey && !e.metaKey && !e.repeat) {
    newProject()
  }
  if (e.code === 'KeyS' && e.altKey && !e.metaKey && !e.repeat) {
    if (fileSaveAllowed.value)
      saveProject()
  }
  if (e.code === 'KeyO' && e.altKey && !e.metaKey && !e.repeat) {
    if (fileOpenUserAllowed.value)
      fileOpenUser()
  }
  if (e.code === 'KeyF' && e.altKey && !e.metaKey && !e.repeat) {
    fileOpenFeatured()
  }
  if (e.code === 'KeyC' && e.altKey && !e.metaKey && !e.repeat) {
    fileOpenClassic()
  }
  if (e.code === 'KeyP' && e.altKey && !e.metaKey && !e.repeat) {
    fileOpenProgressions()
  }
  if (e.code === 'KeyR' && e.altKey && !e.metaKey && !e.repeat) {
    fileOpenRock()
  }
}

onMounted(() => {
  window.addEventListener('keydown', keyDownListener)
  // Initialise only the dropdowns inside this bar so the menus work on every
  // page that shows it. `select` activates an item without changing the text.
  if (menuEl.value)
    $(menuEl.value).find('.ui.dropdown').dropdown({ action: 'select' })
  steps.value = availableSteps()
})

onUnmounted(() => {
  window.removeEventListener('keydown', keyDownListener)
})
</script>

<template>
  <div ref="menuEl" class="ui container center aligned">
    <div class="ui secondary  menu">

      <div class="ui dropdown item" data-step="file-menu">
        <div class="text">File</div>
        <i class="dropdown icon"></i>
        <div class="menu">
          <a class="item" @click="newProject()"><i class="file icon"></i>
            <span class="description">alt + n</span>
            New</a>
          <a class="item" :class="{ disabled: !fileOpenUserAllowed }" @click="fileOpenUser()"><i
              class="file icon"></i>
            <span class="description">alt + o</span>
            Open...</a>
          <a class="item" @click="fileOpenFeatured()"><i class="file icon"></i>
            <span class="description">alt + f</span>
            Open Featured...</a>
          <a class="item" @click="fileOpenClassic()"><i class="file icon"></i>
            <span class="description">alt + c</span>
            Open Classic...</a>
          <a class="item" @click="fileOpenProgressions()"><i class="file icon"></i>
            <span class="description">alt + p</span>
            Open Progressions...</a>
          <a class="item" @click="fileOpenRock()"><i class="file icon"></i>
            <span class="description">alt + r</span>
            Open Rock...</a>
          <a class="item" :class="{ disabled: !fileSaveAllowed }" @click="saveProject()">
            <span class="description">alt + s</span>
            <i class="save icon"></i>Save</a>
          <a class="item" :class="{ disabled: !fileSaveAllowed }" @click="saveProjectAs()"><i
              class="save icon"></i>Save As...</a>
          <div class="ui divider"></div>
          <a class="item" :class="{ disabled: !reloadProjectAllowed }" @click="reloadCurrentProject()"><i
              class="sync icon"></i>Reload current Project</a>
          <div class="ui divider"></div>
          <a class="item" @click="fileImportMidiDialog.open()"><i class="upload icon"></i>Import MIDI file...</a>
          <div class="ui divider"></div>
          <a class="item" :class="{ disabled: !downloadProjectAllowed }" @click="downloadProject()"><i
              class="download icon"></i>Download Project...</a>
          <a class="item" :class="{ disabled: !uploadProjectAllowed }" @click="uploadProject()"><i
              class="upload icon"></i>Upload Project...</a>
          <div class="ui divider"></div>
          <a class="item" :class="{ disabled: !downloadProjectAllowed }" @click="downloadMidiChords()"><i
              class="download icon"></i>Download MIDI Chords...</a>
          <a class="item" :class="{ disabled: !downloadProjectAllowed }" @click="downloadMidiChordsForChordMemoryTrigger()"><i
              class="download icon"></i>Download MIDI Chords For Memory Trigger...</a>
        </div>
      </div>

      <div v-if="hasActions" class="ui dropdown item">
        <div class="text">Actions</div>
        <i class="dropdown icon"></i>
        <div class="menu">
          <slot name="actions" />
        </div>
      </div>

      <div class="right menu">
        <div v-if="sequenceOptionsList.length > 0" class="item sequencer-transport">
          <select v-if="sequenceOptionsList.length > 1" class="sequencer-sequence-select"
            :value="globals.currentChordSequenceName" title="Song sequence" @change="onSequenceChange">
            <option v-for="option in sequenceOptionsList" :key="option.name" :value="option.name">{{ option.label }}</option>
          </select>
          <button type="button" class="sequencer-play-toggle" :disabled="!sequencerControl.hasNotes"
            :class="{ playing: sequencerControl.isPlaying }" :title="sequencerButtonTitle" @click="sequencerControl.toggle()">
            <i :class="sequencerControl.isPlaying ? 'stop icon' : 'play icon'"></i>
          </button>
        </div>
        <a class="item" title="Load a random song from the classic and rock collections"
          @click="loadRandomClassicProject()">🎲 Random project</a>
        <a class="item" title="Load a random progression from the progressions collection"
          @click="loadRandomProgressionProject()">🎲 Random progression</a>
        <a class="item" title="Load a demo project and get started" @click="loadDemoProject()">DEMO</a>
        <a class="item" @click="tutorial()">Start Tour 🧭</a>
        <ComboProjectLibrary ref="fileOpenComponent" userOrFeatured="featured" />
        <ComboProjectLibrary ref="fileOpenComponentClassic" userOrFeatured="classic" />
        <ComboProjectLibrary ref="fileOpenComponentProgressions" userOrFeatured="progressions" />
        <ComboProjectLibrary ref="fileOpenComponentRock" userOrFeatured="rock" />
        <ComboProjectLibrary ref="fileOpenComponentUser" userOrFeatured="user" />
      </div>

    </div>
  </div>

  <!-- Hidden until needed -->
  <FileImportMidiDialog ref="fileImportMidiDialog" />

  <!-- vue tour -->
  <VTour ref="tour" :steps="steps" />
</template>

<style scoped>
/* Pattern-sequencer transport: a sequence picker and a play/stop button. */
.sequencer-transport {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}

.sequencer-sequence-select {
  padding: 2px 4px;
  font-size: 0.85rem;
  color: #5a3d1a;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #b99b6b;
  border-radius: 4px;
}

.sequencer-play-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 2px 8px;
  font-size: 0.9rem;
  line-height: 1;
  color: #2e8b57;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #2e8b57;
  border-radius: 4px;
  cursor: pointer;
}

.sequencer-play-toggle:hover:not(:disabled) {
  background: #d8efdc;
}

.sequencer-play-toggle.playing {
  color: #8a2f2f;
  background: #f3d8d8;
  border-color: #b04040;
}

.sequencer-play-toggle:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sequencer-play-toggle .icon {
  margin: 0;
}

/* On narrow phone screens the File/Actions and shortcut items wrap onto
further rows instead of running off the right edge. */
@media (max-width: 768px) {
  .ui.secondary.menu {
    flex-wrap: wrap;
  }

  .ui.secondary.menu .right.menu {
    margin-left: 0 !important;
    flex-wrap: wrap;
  }
}
</style>
