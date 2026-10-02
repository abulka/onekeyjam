<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { globals } from "../../src/lib/globals.js"
import { reAllocateChords, reAllocateScales, newProject, loadUserProject, loadFeaturedProject } from '../../src/lib/boot-project'
import { resetTranspositionsEtc } from '../../src/lib/resetState'
import { saveProject, saveProjectAs, downloadProject, downloadMidiChords, downloadMidiChordsForChordMemoryTrigger, uploadProject } from '../../src/lib/projectSave.js'

import Jammer from '@/components/JammerView.vue'
import ComboProjectLibrary from '@/components/ComboProjectLibrary.vue';
import FileImportMidiDialog from '@/components/FileImportMidiDialog.vue'

const fileOpenComponent = ref();
const fileOpenComponentUser = ref();
const fileImportMidiDialog = ref()

function reloadCurrentProject() {
  globals.projectLibrary.projectIsUserOrFeatured == 'user' ? loadUserProject() : loadFeaturedProject()
}

function fileOpenFeatured() {
  fileOpenComponent.value.fileOpen();
}

function fileOpenUser() {
  fileOpenComponentUser.value.fileOpen();
}

const fileOpenUserAllowed = computed({
  get: () => true
})

const fileSaveAllowed = computed({
  get: () => true
})

const reloadProjectAllowed = computed({
  get: () => globals.isProjectLoaded && globals.projectLibrary.projectName != ''
})

const downloadProjectAllowed = computed({
  get: () => globals.isProjectLoaded
})

const uploadProjectAllowed = computed({
  get: () => true
})

function keyDownListener(e) {
  // console.log('key', e.key, 'code', e.code, 'keyCode', e.keyCode, e.metaKey, e.ctrlKey, e.altKey, 'this', this);  // 'this' is the window

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
}

onMounted(() => {
  window.addEventListener('keydown', keyDownListener);
});

onUnmounted(() => {
  window.removeEventListener('keydown', keyDownListener);
});

// vue-tour
const tour = ref(null);
const steps = [
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
  }
];

function tutorial() {
  tour.value.resetTour()
  tour.value.startTour()
}

</script>

<template>
  <main>

    <div class="ui container center aligned">

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

        <div class="ui dropdown item">
          <div class="text">Actions</div>
          <i class="dropdown icon"></i>
          <div class="menu">
            <a class="item" @click="reAllocateChords()">Reallocate Chords 🎲</a>
            <a class="item" @click="reAllocateScales()">Find Matching Scales 🎹</a>
            <div class="ui divider"></div>
            <a class="item" @click="resetTranspositionsEtc()">Reset Transpositions</a>
            <a class="item" @click="fillScaleFiltersColumnWithKeySignature()">Fill with Key Signature</a>
          </div>
        </div>

        <a class="item" @click="tutorial()">Start Tour 🧭</a>

        <div class="ui right aligned mt-3">
          <div class="">
            <ComboProjectLibrary ref="fileOpenComponent" userOrFeatured="featured" />
          </div>
          <div class="">
            <ComboProjectLibrary ref="fileOpenComponentUser" userOrFeatured="user" />
          </div>
        </div>
        
      </div>
    </div>

    <!-- A bit of spacing -->
    <div class="mb-4"></div>

    <Jammer />

    <!-- Hidden until needed -->
    <FileImportMidiDialog ref="fileImportMidiDialog" />

    <!-- vue tour -->
    <div>
      <!-- <VTour :steps="steps" autoStart /> -->
      <VTour ref="tour" :steps="steps" />
    </div>

  </main>
</template>
