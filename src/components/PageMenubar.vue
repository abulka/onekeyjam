<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useSlots } from 'vue'
import { globals } from '@/lib/globals.js'
import { newProject, loadUserProject, loadFeaturedProject, loadClassicProject } from '@/lib/boot-project'
import { saveProject, saveProjectAs, downloadProject, downloadMidiChords, downloadMidiChordsForChordMemoryTrigger, uploadProject } from '@/lib/projectSave.js'
import { loadDemoProject } from '@/lib/demo-project.js'
import ComboProjectLibrary from '@/components/ComboProjectLibrary.vue'
import FileImportMidiDialog from '@/components/FileImportMidiDialog.vue'

// The shared second-level menu bar. It owns the File menu, the guided tour and
// the project library dialogs; the Actions menu items are supplied by each page
// through the `actions` slot (pages without actions simply omit it).

const slots = useSlots()
const hasActions = computed(() => !!slots.actions)

const menuEl = ref(null)
const tour = ref(null)
const fileOpenComponent = ref()
const fileOpenComponentClassic = ref()
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
  else
    loadFeaturedProject()
}

function fileOpenFeatured() {
  fileOpenComponent.value.fileOpen()
}

function fileOpenClassic() {
  fileOpenComponentClassic.value.fileOpen()
}

function fileOpenUser() {
  fileOpenComponentUser.value.fileOpen()
}

/**
 * Load a random project from the classic collection. Excludes the current
 * project when there is more than one choice, so the dice always moves you.
 */
function loadRandomClassicProject() {
  const all = globals.projectLibrary.classicProjectNames
  if (!all || all.length === 0) {
    if (typeof $ === 'function')
      $('body').toast({ message: 'Classic projects are still loading', displayTime: 1500, class: 'brown' })
    return
  }
  const current = globals.projectLibrary.projectName
  const candidates = all.length > 1 ? all.filter(name => name !== current) : all
  const name = candidates[Math.floor(Math.random() * candidates.length)]
  loadClassicProject(name)
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
        <a class="item" title="Load a random project from the classic collection"
          @click="loadRandomClassicProject()">🎲 Random project</a>
        <a class="item" title="Load a demo project and get started" @click="loadDemoProject()">DEMO</a>
        <a class="item" @click="tutorial()">Start Tour 🧭</a>
        <ComboProjectLibrary ref="fileOpenComponent" userOrFeatured="featured" />
        <ComboProjectLibrary ref="fileOpenComponentClassic" userOrFeatured="classic" />
        <ComboProjectLibrary ref="fileOpenComponentUser" userOrFeatured="user" />
      </div>

    </div>
  </div>

  <!-- Hidden until needed -->
  <FileImportMidiDialog ref="fileImportMidiDialog" />

  <!-- vue tour -->
  <VTour ref="tour" :steps="steps" />
</template>
