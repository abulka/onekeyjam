<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { globals } from '../../src/lib/globals.js'
import { requestMidiAccess } from '@/lib/midi/boot-webmidi.js'
import { linkProjectToKeyboard, isKeyboardEnabled } from '@/lib/boot-project.js'
import { listKeyboardConfigs, listKeyboardConfigDetails } from '@/lib/projectLibrary.js'
import { saveCustomKeyboard, deleteCustomKeyboard, keyboardSaveActionLabel, suggestConfigName, saveDisabledKeyboards } from '@/lib/keyboardStore.js'
import { clearMidiActivityLog, wireMidiMonitor, looksLikeRoutingDevice, isSelfOutputDevice } from '@/lib/midi/midi-monitor.js'

const router = useRouter()

const savedMessage = ref('')
// Every built-in and custom config, with source and description.
const configDetails = ref([])
// The Keyboard config form is collapsed when a usable keyboard is already
// connected, and expanded when the user needs to set one up. It can also be
// opened for a config that is not the current keyboard (the Edit button).
const configOpen = ref(false)
// The config the form is editing. It follows the current keyboard by default
// and is retargeted by the Edit button, so any config can be edited without
// switching the live keyboard.
const editorName = ref('')
// The working copy of the edited config. Changes only reach the live keyboard
// when Save is pressed.
const editorFields = ref({ description: '', lhTriggerOctave: 3, rhJamSoundOctave: 4 })
// The log element, so it can be scrolled to the newest line.
const logEl = ref(null)
// The config disclosure, so Edit can scroll it into view.
const configEl = ref(null)

// Newest first, so the latest line is always visible in the scroll box. The
// log is only filled while the activity area is open (see onDebugToggle).
const recentMessages = computed(() => [...globals.midiActivity.log].reverse())

// The edited config looks like a virtual/DAW routing port rather than a
// physical keyboard.
const routingWarning = computed(() => looksLikeRoutingDevice(editorName.value))

const lastOctave = computed(() => globals.midiActivity.lastOctave)

// The config currently open in the form, if its name matches a known config.
const editorConfig = computed(() => configForDevice(editorName.value))

// Whether the edited config exists, whether its keyboard is plugged in, and
// whether it is a local custom config (and shadows a built-in of the same name).
const editorHasConfig = computed(() => !!editorConfig.value)
const editorConnected = computed(() => matchesDetected(editorName.value))
const editorIsCustom = computed(() => editorConfig.value?.source === 'custom')
const editorOverridesBuiltin = computed(() => !!editorConfig.value?.overridesBuiltin)
const editorHasBuiltin = computed(() => globals.keyboardsManifest.some(entry => entry.text === editorName.value))

// A one-line status to glance at, next to the section heading.
const connectionStatusText = computed(() => {
  if (globals.midiAccess.status === 'denied')
    return 'MIDI blocked'
  if (globals.midiAccess.status === 'unsupported')
    return 'Unsupported'
  if (globals.midiAccess.status === 'error')
    return 'MIDI error'
  if (globals.keyboardsDetected.length === 0)
    return 'No device'
  if (matchesDetected(globals.keyboard.name))
    return 'Connected'
  return 'Not connected'
})

const connectionStatusClass = computed(() => {
  // A dark, solid green for a healthy connection, so it stands apart from the
  // pale green "In use"/"ready" pills.
  if (connectionStatusText.value === 'Connected')
    return 'badge-connected'
  if (connectionStatusText.value === 'No device')
    return 'badge-muted'
  if (connectionStatusText.value === 'Not connected')
    return 'badge-not-connected'
  // Access problems (blocked, unsupported, error).
  return 'badge-warning'
})

// Only plugged-in configs float to the top, so the active entry does not jump
// around as different keyboards are used.
const sortedConfigs = computed(() => {
  const rank = (detail) => (matchesDetected(detail.name) ? 0 : 1)
  return [...configDetails.value].sort((a, b) => {
    const difference = rank(a) - rank(b)
    return difference !== 0 ? difference : a.name.localeCompare(b.name)
  })
})

// Button label depends on whether this is a new config, a built-in override or
// an edit of an existing custom config.
const saveActionLabel = computed(() => keyboardSaveActionLabel({
  hasCustom: editorIsCustom.value,
  hasBuiltin: editorHasBuiltin.value,
}))

/** The config that matches a detected device, if any. */
function configForDevice(deviceName) {
  return configDetails.value.find(detail => detail.name === deviceName)
}

function matchesDetected(name) {
  return globals.keyboardsDetected.includes(name)
}

function sourceLabel(detail) {
  if (!detail)
    return 'No config'
  if (detail.source === 'custom')
    return detail.overridesBuiltin ? 'Custom (overrides built-in)' : 'Custom'
  return 'Built-in'
}

/** The type/status badges shown in the all-configs table. */
function statusLabel(detail) {
  if (matchesDetected(detail.name))
    return isKeyboardEnabled(detail.name) ? 'On' : 'Plugged in'
  return 'Not detected'
}

/** The pill colour for a table row's status. */
function statusClass(detail) {
  if (matchesDetected(detail.name))
    return isKeyboardEnabled(detail.name) ? 'badge-inuse' : 'badge-ok'
  return 'badge-muted'
}

async function refreshConfigDetails() {
  await listKeyboardConfigs()
  configDetails.value = await listKeyboardConfigDetails()
}

onMounted(async () => {
  // Safety net: make sure the activity monitor is attached even if the device
  // appeared in a way the boot events missed.
  wireMidiMonitor()
  await refreshConfigDetails()
  editorName.value = globals.keyboard.name
  loadEditor(editorName.value)
  // Open the form at start only when a keyboard is already selected but not
  // usable yet (no config, or its keyboard is unplugged). Otherwise leave it
  // collapsed; switching a keyboard on in the table must not force it open.
  configOpen.value = !!globals.keyboard.name && !(editorHasConfig.value && editorConnected.value)
})

// Follow the current keyboard when it changes (boot auto-selection or
// hot-plug), as long as the user is not editing another config.
watch(() => globals.keyboard.name, (name) => {
  if (configOpen.value)
    return
  editorName.value = name
  loadEditor(name)
})

function formatTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString() : ''
}

function enableMidi() {
  requestMidiAccess()
}

/** Only capture the raw log while the activity area is open. */
function onDebugToggle(event) {
  const open = event.target.open
  globals.midiActivity.captureLog = open
  if (!open)
    clearMidiActivityLog()
}

onUnmounted(() => {
  globals.midiActivity.captureLog = false
  clearMidiActivityLog()
})

// Keep the newest line in view as messages arrive.
watch(() => globals.midiActivity.pulse, () => {
  const el = logEl.value
  if (el)
    el.scrollTop = 0
})

/** Fill the edit buffer from the named config (or the live keyboard's defaults). */
function loadEditor(name) {
  const detail = configForDevice(name)
  if (detail) {
    editorFields.value = {
      description: detail.description || '',
      lhTriggerOctave: detail.lhTriggerOctave ?? 3,
      rhJamSoundOctave: detail.rhJamSoundOctave ?? 4,
    }
    return
  }
  const isCurrent = name === globals.keyboard.name
  editorFields.value = {
    description: (isCurrent ? globals.keyboard.description : '') || suggestConfigName(name),
    lhTriggerOctave: isCurrent ? (globals.keyboard.lhTriggerOctave ?? 3) : 3,
    rhJamSoundOctave: isCurrent ? (globals.keyboard.rhJamSoundOctave ?? 4) : 4,
  }
}

/** Switch a connected keyboard on or off. Several can be live at the same time. */
function toggleKeyboard(name) {
  if (globals.keyboardsDisabled.includes(name))
    globals.keyboardsDisabled = globals.keyboardsDisabled.filter(disabled => disabled !== name)
  else
    globals.keyboardsDisabled = [...globals.keyboardsDisabled, name]
  saveDisabledKeyboards(globals.keyboardsDisabled)
  linkProjectToKeyboard()
}

/** Open the form for an arbitrary config, even one that is not connected. */
function openEditor(name) {
  editorName.value = name
  loadEditor(name)
  configOpen.value = true
  nextTick(() => {
    if (configEl.value)
      configEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

/** Keep the open/closed state of the config disclosure in the ref. */
function onConfigToggle(event) {
  configOpen.value = event.target.open
  // Closing discards unsaved edits and returns the form to the current keyboard.
  if (!configOpen.value) {
    editorName.value = globals.keyboard.name
    loadEditor(editorName.value)
  }
}

/** Copy the octave of the last note played into the live config and the form. */
function applyOctave(field) {
  if (lastOctave.value === null)
    return
  globals.keyboard[field] = lastOctave.value
  if (editorName.value === globals.keyboard.name)
    editorFields.value[field] = lastOctave.value
  linkProjectToKeyboard()
}

/** Apply the edit buffer to the live keyboard and persist it. */
async function saveEditor() {
  if (!editorName.value)
    return
  const name = editorName.value
  saveCustomKeyboard({
    name,
    description: editorFields.value.description,
    lhTriggerOctave: editorFields.value.lhTriggerOctave,
    rhJamSoundOctave: editorFields.value.rhJamSoundOctave,
  })
  if (name === globals.keyboard.name) {
    globals.keyboard.description = editorFields.value.description
    globals.keyboard.lhTriggerOctave = editorFields.value.lhTriggerOctave
    globals.keyboard.rhJamSoundOctave = editorFields.value.rhJamSoundOctave
  }
  await refreshConfigDetails()
  // A newly saved config makes its keyboard available, so re-wire to switch it
  // on (or to pick up new octaves for the live reference keyboard).
  linkProjectToKeyboard()
  savedMessage.value = `Saved config for '${name}'`
  setTimeout(() => { savedMessage.value = '' }, 2500)
}

/** Collapse the form. Closing reloads the buffer, so edits are discarded. */
function cancelEditor() {
  configOpen.value = false
}

/** Remove the edited custom config, falling back to the built-in/default. */
async function deleteEditor() {
  if (!editorName.value)
    return
  const name = editorName.value
  const wasOverriding = editorOverridesBuiltin.value
  deleteCustomKeyboard(name)
  await refreshConfigDetails()
  // Re-wire so a keyboard whose only config was deleted switches off. When the
  // live reference keyboard lost its config, reload the built-in (or default)
  // config first, which re-wires as well.
  if (name === globals.keyboard.name)
    document.broadcastEvent("switch-keyboard", { name })
  else
    linkProjectToKeyboard()
  loadEditor(name)
  savedMessage.value = wasOverriding
    ? `Reverted '${name}' to the built-in config`
    : `Removed saved config for '${name}'`
  setTimeout(() => { savedMessage.value = '' }, 2500)
}

/** Open the in-app Help page at the "Play with a MIDI keyboard" section. */
async function openRoutingHelp() {
  globals.helpPage = 'overview'
  await router.push('/about')
  await nextTick()
  setTimeout(() => {
    const target = document.getElementById('midi-keyboard')
    if (target)
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 60)
}
</script>

<template>
  <h5 class="midi-section-heading">
    MIDI Keyboards detected on this machine
    <span class="badge status-badge" :class="connectionStatusClass">{{ connectionStatusText }}</span>
  </h5>
  <p v-if="globals.keyboardsDetected.length == 0">No MIDI keyboards detected</p>
  <table v-else class="midi-table midi-detected-table">
    <colgroup>
      <col class="col-device">
      <col class="col-config">
      <col class="col-action">
    </colgroup>
    <tr v-for="deviceName in globals.keyboardsDetected" :key="deviceName">
      <td class="mono">
        {{ deviceName }}
        <span v-if="looksLikeRoutingDevice(deviceName)" class="badge badge-routing"
          title="A virtual or DAW routing port. OneKeyJam normally sends its own notes to this device.">
          Routing
        </span>
      </td>
      <td>
        <template v-if="configForDevice(deviceName)">
          Config: {{ configForDevice(deviceName).name }}
          <span class="midi-note">({{ sourceLabel(configForDevice(deviceName)) }})</span>
          <span v-if="configForDevice(deviceName).description" class="midi-note">
            · {{ configForDevice(deviceName).description }}
          </span>
        </template>
        <span v-else class="midi-note">No config yet — add one to use this keyboard</span>
      </td>
      <td class="midi-action-cell">
        <template v-if="isSelfOutputDevice(deviceName)">
          <span class="midi-note">Output device</span>
        </template>
        <button v-else-if="!configForDevice(deviceName)" class="ui mini button midi-use-button"
          title="Add a keyboard config for this device"
          @click="openEditor(deviceName)">Add config</button>
        <button v-else class="ui mini button midi-use-button"
          :class="{ primary: isKeyboardEnabled(deviceName) }"
          :title="isKeyboardEnabled(deviceName) ? 'Switch this keyboard off' : 'Switch this keyboard on'"
          @click="toggleKeyboard(deviceName)">
          {{ isKeyboardEnabled(deviceName) ? 'On' : 'Off' }}
        </button>
      </td>
    </tr>
  </table>

  <p v-if="globals.midiAccess.status === 'denied'" class="text-red-600">
    {{ globals.midiAccess.message }}
  </p>
  <p v-else-if="globals.midiAccess.status === 'unsupported'" class="text-red-600">
    {{ globals.midiAccess.message }}
  </p>
  <p v-else-if="globals.midiAccess.status === 'error'" class="text-red-600">
    {{ globals.midiAccess.message }}
  </p>
  <p v-else-if="globals.midiAccess.status === 'granted' && globals.keyboardsDetected.length == 0">
    MIDI access is granted, but no input devices are visible to the browser.
    Check that the keyboard is connected, then try the button below. Also make
    sure another app (such as a DAW) is not holding the device.
  </p>

  <button v-if="globals.midiAccess.status !== 'granted'" class="ui tiny button" @click="enableMidi()">
    Enable MIDI access
  </button>
  <button v-else class="ui tiny button" @click="enableMidi()">
    Re-scan MIDI devices
  </button>

  <!-- Activity and octave share one collapsible two-column area. Debug-only,
       collapsed by default. -->
  <details class="midi-disclosure" @toggle="onDebugToggle">
    <summary class="midi-summary">
      <span class="chevron" aria-hidden="true">▸</span>
      <span class="midi-dot" :class="{ seen: globals.midiActivity.seen }"></span>
      <strong>MIDI activity (debug)</strong>
      <span class="midi-note">— octave {{ lastOctave === null ? '—' : lastOctave }}</span>
      <span v-if="globals.midiActivity.seen" class="midi-note">
        · last {{ globals.midiActivity.lastState }} {{ globals.midiActivity.lastNote }}
      </span>
      <span v-else class="midi-note">· nothing received yet</span>
    </summary>
    <div class="midi-activity-body">
      <div class="midi-column midi-log-column">
        <div class="midi-column-header">
          <strong>Incoming MIDI</strong>
          <button class="ui mini button" @click="clearMidiActivityLog()">Clear</button>
        </div>
        <div v-if="recentMessages.length == 0" class="midi-note">
          Play your MIDI keyboard. Raw messages appear here even if no keyboard
          config is selected.
        </div>
        <div v-else ref="logEl" class="midi-log-scroll">
          <div v-for="(msg, index) in recentMessages" :key="index" class="midi-log-line">
            <span class="midi-log-time">{{ formatTime(msg.at) }}</span>
            <span class="midi-log-input">{{ msg.input }}</span>
            <span class="midi-log-text">{{ msg.text }}</span>
          </div>
        </div>
      </div>
      <div class="midi-column midi-octave-panel">
        <div class="octave-label">Octave detected</div>
        <div class="octave-value" :class="{ muted: lastOctave === null }">
          {{ lastOctave === null ? '—' : lastOctave }}
        </div>
        <div class="midi-note">Last note: {{ globals.midiActivity.lastNote || '—' }}</div>
        <button class="ui mini button" :disabled="lastOctave === null" @click="applyOctave('lhTriggerOctave')">
          Set chord trigger octave
        </button>
        <button class="ui mini button" :disabled="lastOctave === null" @click="applyOctave('rhJamSoundOctave')">
          Set jam sound octave
        </button>
      </div>
    </div>
  </details>

  <div v-if="editorName">
    <!-- Hidden behind a disclosure when the keyboard already works. Opened by
         the Edit button for any config, connected or not. -->
    <details ref="configEl" class="midi-disclosure" :open="configOpen" @toggle="onConfigToggle">
      <summary class="midi-summary">
        <span class="chevron" aria-hidden="true">▸</span>
        <strong>Keyboard config:</strong>
        <template v-if="editorConfig">
          {{ editorName }}
          <span class="midi-note">({{ sourceLabel(editorConfig) }})</span>
          <span v-if="editorConfig.description" class="midi-note">· {{ editorConfig.description }}</span>
        </template>
        <template v-else>{{ editorName }}</template>
        <span v-if="!editorHasConfig" class="badge badge-routing">needs setup</span>
        <span v-else-if="editorConnected" class="badge badge-inuse">ready</span>
        <span v-else class="badge badge-muted">not connected</span>
      </summary>

      <div class="midi-disclosure-body">
        <div v-if="routingWarning" class="midi-warning">
          <strong>Routing device selected.</strong>
          This looks like a virtual or DAW port, and OneKeyJam normally sends its
          own notes to it. Using it as your keyboard can loop those notes back.
          Pick a physical keyboard above unless you intend this.
        </div>

        <div class="midi-form">
          <div class="form-row">
            <label>Device</label>
            <div class="form-static">{{ editorName }}</div>
          </div>
          <div class="form-row">
            <label>Config</label>
            <div class="form-static">
              {{ sourceLabel(editorConfig) }}
              <span v-if="editorConnected" class="badge badge-inuse">Plugged in</span>
              <span v-else class="badge badge-muted">Not detected</span>
            </div>
          </div>
          <div class="form-row">
            <label for="midi-config-desc">Description</label>
            <input id="midi-config-desc" type="text" v-model="editorFields.description" />
          </div>
          <div class="form-row">
            <label for="midi-config-lh" title="The octave where the left-hand chord trigger keys are.">
              Chord trigger octave
            </label>
            <input id="midi-config-lh" type="number" min="0" max="8"
              v-model.number="editorFields.lhTriggerOctave" />
          </div>
          <div class="form-row">
            <label for="midi-config-rh" title="The octave where right-hand jam notes sound.">
              Jam sound octave
            </label>
            <input id="midi-config-rh" type="number" min="0" max="8"
              v-model.number="editorFields.rhJamSoundOctave" />
          </div>
        </div>

        <div class="midi-form-actions">
          <button class="ui tiny primary button" @click="saveEditor()">
            {{ saveActionLabel }}
          </button>
          <button v-if="editorIsCustom" class="ui tiny button" @click="deleteEditor()">
            {{ editorOverridesBuiltin ? 'Revert to built-in' : 'Delete saved config' }}
          </button>
          <button class="ui tiny button" @click="cancelEditor()">Cancel</button>
          <span v-if="savedMessage" class="midi-saved">{{ savedMessage }}</span>
        </div>
        <p class="midi-note">
          A keyboard with no bundled config uses default octaves (chord trigger 3,
          jam 4). Saving a custom config with the same name replaces the built-in
          config for that device; there is one config per device.
        </p>
      </div>
    </details>
  </div>
  <p v-else class="midi-note">
    No keyboard config is selected. Play a key, or use Re-scan above; switch on
    any detected keyboard with its On/Off button.
  </p>

  <h5>All configs</h5>
  <table class="midi-table midi-all-table">
    <colgroup>
      <col class="col-config-name">
      <col class="col-type">
      <col class="col-description">
      <col class="col-status">
      <col class="col-action">
      <col class="col-edit">
    </colgroup>
    <thead>
      <tr>
        <th>Config</th>
        <th>Type</th>
        <th>Description</th>
        <th>Status</th>
        <th class="midi-action-cell">Live</th>
        <th class="midi-action-cell">Edit</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="detail in sortedConfigs" :key="detail.name">
        <td class="mono">{{ detail.name }}</td>
        <td>
          <span class="badge" :class="detail.source === 'custom' ? 'badge-custom' : 'badge-builtin'">
            {{ detail.source === 'custom' ? 'Custom' : 'Built-in' }}
          </span>
          <span v-if="detail.overridesBuiltin" class="midi-note">(overrides built-in)</span>
        </td>
        <td class="midi-note">{{ detail.description || '—' }}</td>
        <td>
          <span class="badge badge-status" :class="statusClass(detail)">
            {{ statusLabel(detail) }}
          </span>
        </td>
        <td class="midi-action-cell">
          <button v-if="matchesDetected(detail.name)" class="ui mini button midi-use-button"
            :class="{ primary: isKeyboardEnabled(detail.name) }"
            :title="isKeyboardEnabled(detail.name) ? 'Switch this keyboard off' : 'Switch this keyboard on'"
            @click="toggleKeyboard(detail.name)">
            {{ isKeyboardEnabled(detail.name) ? 'On' : 'Off' }}
          </button>
        </td>
        <td class="midi-action-cell">
          <button class="ui mini button midi-use-button" @click="openEditor(detail.name)">Edit</button>
        </td>
      </tr>
    </tbody>
  </table>
  <p class="midi-note">
    A config matches a keyboard when its name equals the detected device name.
    Built-in configs ship with OneKeyJam; custom configs are saved in this browser.
  </p>

  <p class="midi-routing-ref">
    OneKeyJam can also send notes to a DAW or synth such as Ableton over the macOS
    IAC Driver.
    <a href="#" @click.prevent="openRoutingHelp()">Help: Play with a MIDI keyboard</a>
    or the
    <a href="https://github.com/abulka/onekeyjam/blob/main/doco/NOTES.md#midi-configuration" target="_blank"
      rel="noopener">MIDI setup notes</a>.
  </p>
</template>

<style scoped>
.mono {
  font-family: Courier, monospace;
}

.midi-section-heading {
  overflow: hidden;
}

/* Floated so it sits at the right of the heading without needing flex. */
.status-badge {
  float: right;
  margin-top: 0.3rem;
}

.midi-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.25rem 0 0.5rem;
  /* Fixed layout means column widths never reflow when a cell's content
     changes (for example clicking Use), which is what caused the row jitter. */
  table-layout: fixed;
}

.midi-table th {
  text-align: left;
  color: #5a3d1a;
  font-size: 0.85rem;
  border-bottom: 1px solid #c9b48f;
  padding: 0.2rem 0.5rem 0.2rem 0;
}

.midi-table td {
  padding: 0.25rem 0.5rem 0.25rem 0;
  vertical-align: middle;
  overflow: hidden;
}

/* A fixed row height stops rows jumping when an action button appears or not. */
.midi-table tr {
  height: 2.2rem;
}

/* Column widths for the detected-devices table. */
.midi-detected-table .col-device { width: 32%; }
.midi-detected-table .col-config { width: 52%; }
.midi-detected-table .col-action { width: 16%; }

/* Column widths for the all-configs table. */
.midi-all-table .col-config-name { width: 15%; }
.midi-all-table .col-type { width: 15%; }
.midi-all-table .col-description { width: 30%; }
.midi-all-table .col-status { width: 13%; }
.midi-all-table .col-action { width: 12%; }
.midi-all-table .col-edit { width: 15%; }

.midi-action-cell {
  text-align: right;
  white-space: nowrap;
}

/* Center the Live and Edit headings over their buttons, so each heading sits
   directly above the content of its column rather than just sharing its edge. */
.midi-all-table th.midi-action-cell,
.midi-all-table td.midi-action-cell {
  text-align: center;
}

/* A badge on its own in an all-configs cell has nothing to its left, so drop
   its spacing. This lines the pill up exactly under the left-aligned heading. */
.midi-all-table td .badge {
  margin-left: 0;
}

/* Semantic UI gives buttons a small right margin. Remove it so the button's
   right edge lines up with the right-aligned heading in the action columns. */
.midi-use-button {
  margin-right: 0;
}

/* A fixed width so In use / Plugged in / Not detected never reflow the row. */
.badge-status {
  min-width: 5.6rem;
  text-align: center;
}

.badge {
  display: inline-block;
  margin-left: 0.3rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  font-size: 0.75rem;
  line-height: 1.4;
  border: 1px solid transparent;
}

.badge-inuse {
  background: #d8efdc;
  color: #2f6b3f;
  border-color: #2e8b57;
}

/* Dark, solid green so the connection status is unmistakable. */
.badge-connected {
  background: #1f6b3a;
  color: #ffffff;
  border-color: #14522b;
}

/* A gentle red for a warning state. */
.badge-warning {
  background: #fdecea;
  color: #a3302a;
  border-color: #e2a49e;
}

/* The status pill for a config whose keyboard is not plugged in: dark red. */
.badge-not-connected {
  background: #b3261e;
  color: #ffffff;
  border-color: #8c1d18;
}

/* Kept short so it never makes a table row taller than the text rows. */
.midi-use-button {
  padding: 0.1rem 0.55rem;
  line-height: 1.2;
  min-height: 0;
  height: 1.75rem;
  font-size: 0.8rem;
}

.badge-ok {
  background: #e3edf7;
  color: #2c5a86;
  border-color: #6b9ac4;
}

.badge-routing {
  background: #fdf0d5;
  color: #8a5a00;
  border-color: #c8922a;
}

.badge-custom {
  background: #efe6fb;
  color: #5b3d86;
  border-color: #9a7ac0;
}

.badge-builtin {
  background: #eee6d7;
  color: #6b5a45;
  border-color: #b99b6b;
}

.badge-muted {
  background: #efeae1;
  color: #8a7a60;
  border-color: #c9b48f;
}

.midi-note {
  color: #6b5a45;
  font-size: 0.9rem;
}

.midi-warning {
  margin: 0.5rem 0;
  padding: 0.5rem 0.6rem;
  background: #fdf0d5;
  border: 1px solid #c8922a;
  border-radius: 4px;
  color: #6b4a00;
}

/* Collapsible sections (native <details>). */
.midi-disclosure {
  margin: 0.5rem 0;
  border: 1px solid #b99b6b;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.45);
}

.midi-summary {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
  color: #5a3d1a;
  flex-wrap: wrap;
}

.midi-summary:hover {
  background: rgba(185, 155, 107, 0.15);
}

.midi-summary .chevron {
  display: inline-block;
  color: #8a7a60;
  transition: transform 0.15s ease;
}

/* Point the chevron down when the disclosure is open. */
.midi-disclosure[open] > .midi-summary .chevron {
  transform: rotate(90deg);
}

.midi-disclosure-body {
  padding: 0 0.6rem 0.6rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
}

/* Two columns: incoming MIDI beside the octave detected. */
.midi-activity-body {
  padding: 0 0.6rem 0.6rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.midi-column {
  min-width: 0;
}

.midi-log-column {
  flex: 1 1 26rem;
  min-width: 16rem;
}

.midi-column-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.midi-column-header .button {
  margin-left: auto;
}

.midi-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: #c4b8a5;
  border: 1px solid #9c8c73;
  display: inline-block;
  flex: 0 0 auto;
}

.midi-dot.seen {
  background: #2e8b57;
  border-color: #1f5f3a;
  box-shadow: 0 0 6px rgba(46, 139, 87, 0.9);
}

/* Eight lines tall, then it scrolls. */
.midi-log-scroll {
  height: 7.7rem;
  overflow-y: auto;
  margin-top: 0.4rem;
  font-family: Courier, monospace;
  font-size: 0.8rem;
}

.midi-log-line {
  white-space: nowrap;
}

.midi-log-time {
  color: #8a7a60;
  margin-right: 0.5rem;
}

.midi-log-input {
  color: #7a6547;
  margin-right: 0.5rem;
}

.midi-octave-panel {
  flex: 0 0 11rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.35rem;
  padding-left: 0.75rem;
  border-left: 1px solid #d8c8a8;
}

.octave-label {
  color: #5a3d1a;
  font-weight: bold;
}

.octave-value {
  font-size: 2.8rem;
  line-height: 1.1;
  font-weight: bold;
  color: #2e8b57;
}

.octave-value.muted {
  color: #b3a894;
}

.midi-form {
  max-width: 34rem;
  margin: 0.25rem 0;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.35rem 0;
}

.form-row label {
  flex: 0 0 11rem;
  text-align: right;
  color: #5a3d1a;
}

.form-row input {
  flex: 1 1 auto;
  max-width: 14rem;
  padding: 0.2rem 0.4rem;
  border: 1px solid #b99b6b;
  border-radius: 4px;
}

.form-static {
  font-family: Courier, monospace;
  color: #3a2c16;
}

.midi-form-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.midi-saved {
  color: #2e8b57;
  font-weight: bold;
}

.midi-routing-ref {
  margin-top: 1rem;
  color: #5a3d1a;
}
</style>
