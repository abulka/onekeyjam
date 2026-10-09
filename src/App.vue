<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import mainOneKeyJam from '../src/lib/main.js';
import { globals } from './lib/globals.js';
import { wireHelpShortcuts } from './lib/helpShortcuts.js';
import { projectKeyName } from './lib/projectKey.js';
import { clampBpm } from './lib/uiPrefs.js';
import { setMetronomeEnabled } from './lib/audio/metronome.js';
import DemoIntroDialog from './components/DemoIntroDialog.vue';

// The Research view is a development-only playground; hide it from production builds.
const showResearch = import.meta.env.DEV

const router = useRouter()

// The current project name, shown prominently at the right of the page tabs.
const projectName = computed(() => globals.projectLibrary.projectName || 'Untitled')

// The resolved project key, shown next to the project name. It follows live
// transposition because getProjectKey() applies the transposition offset.
const projectKeyLabel = computed(() => {
  if (!globals.isProjectLoaded)
    return ''
  const key = globals.getProjectKey()
  return key ? projectKeyName(key) : ''
})

// The app-wide tempo. It drives the chord sequencer and the recorder.
function onBpmInput(event) {
  const clamped = clampBpm(event.target.value)
  if (clamped !== undefined)
    globals.recording.bpm = clamped
}

function onBpmChange(event) {
  const clamped = clampBpm(event.target.value)
  const value = clamped === undefined ? (globals.recording.bpm || 120) : clamped
  globals.recording.bpm = value
  event.target.value = String(value)
}

function toggleMetronome() {
  setMetronomeEnabled(!globals.metronomeEnabled)
}

// Hardware-MIDI activity. `midiActivity.pulse` ticks on every incoming message,
// so a watch briefly lights the dot. `seen` keeps it discoverable once any note
// has arrived, even after the pulse fades.
const midiDotActive = ref(false)
let midiDotTimer = null
watch(() => globals.midiActivity.pulse, () => {
  midiDotActive.value = true
  if (midiDotTimer)
    clearTimeout(midiDotTimer)
  midiDotTimer = setTimeout(() => { midiDotActive.value = false }, 200)
})
const midiDotTitle = computed(() => {
  if (!globals.midiActivity.seen)
    return 'No MIDI notes received yet. Play your MIDI keyboard; this dot lights when messages arrive.'
  const input = globals.midiActivity.lastInput ? ` from ${globals.midiActivity.lastInput}` : ''
  return `MIDI received${input}: ${globals.midiActivity.lastState} ${globals.midiActivity.lastNote}`
})

onMounted(() => {
  console.log('App onMounted')

  // one time OneKeyJam application and webmidi initialisation (non vue related)
  mainOneKeyJam()

  // Restore the metronome if it was left on.
  if (globals.metronomeEnabled)
    setMetronomeEnabled(true)

  // Tab toggles between the Edit and Perform pages; Shift+Tab toggles the
  // current page and the Help page.
  wireHelpShortcuts(router)
})

onUnmounted(() => {
  if (midiDotTimer)
    clearTimeout(midiDotTimer)
})

</script>

<template>
  <div v-if="globals.boot.status === 'error'" class="ui container negative message pad-top">
    <div class="header">OneKeyJam failed to start</div>
    <p>{{ globals.boot.message }}</p>
  </div>

  <header>
    <!-- Main menu -->
    <div class="ui container center aligned pad-top">

      <div class="ui secondary  menu">

        <!-- <div class="ui dropdown item">
          <div class="text">View</div>
          <i class="dropdown icon"></i>
          <div class="menu">
            <RouterLink class="item" active-class="active" to="/">OneKeyJam</RouterLink>
            <RouterLink class="item" active-class="active" to="/about">Help</RouterLink>
            <RouterLink class="item" active-class="active" to="/research">Research</RouterLink>

          </div>
        </div> -->

        <RouterLink class="item" active-class="active" to="/">Edit</RouterLink>
        <RouterLink class="item" active-class="active" to="/perform">Perform</RouterLink>
        <RouterLink class="item" active-class="active" to="/settings">Settings</RouterLink>
        <RouterLink class="item" active-class="active" to="/about">Help</RouterLink>
        <RouterLink v-if="showResearch" class="item research-tab" active-class="active" to="/research">Research</RouterLink>

        <!-- Just for development ease -->
        <!-- <div class="item"> <a href="#" @click="newProject()">New</a> </div> -->
        <!-- <div class="item"> <a href="#" @click="loadNeoSoul()">Neo-soul</a> </div> -->
        <!-- <div class="item"> <a href="#" @click="fileImportMidiDialog.open()">dialog</a> </div> -->

        <div class="right menu">
          <div class="item app-bpm" title="Global tempo (BPM) for the chord sequencer and recording.">
            <span class="app-bpm-label">BPM:</span>
            <input class="app-bpm-input" type="number" min="40" max="240" step="1" :value="globals.recording.bpm"
              @input="onBpmInput" @change="onBpmChange" />
            <button type="button" class="metronome-toggle" :class="{ active: globals.metronomeEnabled }"
              :aria-pressed="globals.metronomeEnabled ? 'true' : 'false'"
              :title="globals.metronomeEnabled ? 'Metronome click: on' : 'Metronome click: off'"
              @click="toggleMetronome()">
              <i :class="globals.metronomeEnabled ? 'volume up icon' : 'volume off icon'"></i>
            </button>
          </div>
          <div v-if="projectKeyLabel" class="item app-key-name" title="The resolved project key. It moves with live transposition.">
            <span class="app-key-label">Key:</span>
            <strong class="app-key-value">{{ projectKeyLabel }}</strong>
          </div>
          <div class="item app-midi-activity" :title="midiDotTitle">
            <span class="midi-dot" :class="{ active: midiDotActive, seen: globals.midiActivity.seen }"></span>
            <span class="midi-dot-label">MIDI</span>
          </div>
          <div class="item app-project-name" :title="projectName">
            <span class="app-project-label">Project:</span>
            <strong class="app-project-value">{{ projectName }}</strong>
          </div>
        </div>
      </div>
    </div>




  </header>

  <!-- this gets replaced by the active routed page  -->
  <RouterView />

  <!-- App-wide modal used by the DEMO quick-start -->
  <DemoIntroDialog />

</template>

<style scoped>
/* Global tempo, shown before the key and project name at the right of the tabs. */
.app-bpm {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  white-space: nowrap;
}

.app-bpm-label {
  font-size: 0.95rem;
  font-weight: normal;
  color: #7a6547;
}

.app-bpm-input {
  width: 4.2rem;
  padding: 1px 3px;
  font-size: 1.05rem;
  font-weight: bold;
  color: #5a3d1a;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #b99b6b;
  border-radius: 4px;
}

.metronome-toggle {
  margin-left: 0.35rem;
  padding: 2px 6px;
  font-size: 0.95rem;
  line-height: 1;
  color: #7a6547;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #b99b6b;
  border-radius: 4px;
  cursor: pointer;
}

.metronome-toggle.active {
  color: #2f6b3f;
  background: #d8efdc;
  border-color: #2e8b57;
  box-shadow: 0 0 4px rgba(46, 139, 87, 0.6);
}

.metronome-toggle .icon {
  margin: 0;
}

/* Hardware-MIDI activity indicator. */
.app-midi-activity {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  cursor: default;
}

.midi-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: #c4b8a5;
  border: 1px solid #9c8c73;
  transition: background 0.1s, box-shadow 0.1s;
}

.midi-dot.seen:not(.active) {
  background: #7fa87f;
  border-color: #4f7a4f;
}

.midi-dot.active {
  background: #2e8b57;
  border-color: #1f5f3a;
  box-shadow: 0 0 6px rgba(46, 139, 87, 0.9);
}

.midi-dot-label {
  font-size: 0.8rem;
  color: #7a6547;
}

/* Resolved project key, shown beside the project name at the right of the tabs. */
.app-key-name {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
  white-space: nowrap;
}

.app-key-label {
  font-size: 0.95rem;
  font-weight: normal;
  color: #7a6547;
}

.app-key-value {
  font-size: 1.1rem;
  color: #5a3d1a;
  white-space: nowrap;
}

/* Current project name, at the right of the page tabs. */
.app-project-name {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  max-width: 46vw;
  overflow: hidden;
  white-space: nowrap;
  /* Selectable so the name can be copied. */
  -webkit-user-select: text !important;
  user-select: text !important;
  cursor: text;
}

.app-project-label {
  font-size: 0.95rem;
  font-weight: normal;
  color: #7a6547;
}

.app-project-value {
  min-width: 0;
  font-size: 1.3rem;
  color: #5a3d1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  -webkit-user-select: text !important;
  user-select: text !important;
}

/* On narrow phone screens the tab bar, tempo and project name wrap onto
further rows instead of running off the right edge (notably after rotating
back to portrait, when the viewport shrinks again). */
@media (max-width: 991.98px) {
  .ui.secondary.menu {
    flex-wrap: wrap;
    max-width: 100%;
  }
  .ui.secondary.menu .right.menu {
    margin-left: 0 !important;
    flex-wrap: wrap;
    max-width: 100%;
    min-width: 0;
  }
  .app-bpm-input {
    width: 3.2rem;
  }
  .app-project-name {
    max-width: 100%;
  }
  /* The Research playground stays available on larger screens but is hidden
  on small displays to save tab-bar space. */
  .research-tab {
    display: none !important;
  }
}
</style>
