<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { globals } from '@/lib/globals.js'
import { requestKeyboardFocus } from '@/lib/demo-project.js'

// The quick-start welcome shown after the DEMO button loads a featured project.
// Rendered as a translucent panel pinned to the top-right so the main UI stays
// visible (and interactive) while the user reads the instructions.

const show = ref(false)
const intro = ref({ triggerNotes: 'C D E F', chordKeys: 'Z X C V', soloKeys: 'Q W E R T Y U', legend: [] })

const route = useRoute()
const router = useRouter()

// Backed by the persisted preference: checking "Don't show again" turns the
// welcome off until it is re-enabled in Settings > Preferences.
const dontShowAgain = computed({
  get: () => !globals.showWelcomeDialog,
  set: (value) => { globals.showWelcomeDialog = !value },
})

function onShowIntro(event) {
  if (!globals.showWelcomeDialog)
    return
  if (event.detail)
    intro.value = event.detail
  show.value = true
}

async function jam() {
  show.value = false
  // The keyboard only exists on the Edit and Perform views; send the user there
  // from Settings before asking it to focus.
  if (route.name === 'settings')
    await router.push('/perform')
  requestKeyboardFocus()
}

function close() {
  show.value = false
}

function onKeyDown(event) {
  if (event.key === 'Escape')
    close()
}

onMounted(() => {
  document.addEventListener('show-demo-intro', onShowIntro)
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('show-demo-intro', onShowIntro)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="demo-intro-layer">
      <div class="demo-intro-panel" role="dialog" aria-label="Welcome to OneKeyJam">
        <div class="demo-intro-header">
          <h3>Welcome to OneKeyJam</h3>
          <button type="button" class="demo-intro-close" title="Close" @click="close()">✕</button>
        </div>

        <p class="demo-intro-lead">Play chords with your left hand and solo with your right.</p>

        <ul class="demo-intro-list">
          <li>
            <strong>Chords (left hand):</strong> play <strong>{{ intro.triggerNotes }}</strong> on a
            MIDI keyboard, or press <strong>{{ intro.chordKeys }}</strong> on your computer keyboard.
          </li>
          <li>
            <strong>Solo (right hand):</strong> play to the right on a MIDI keyboard, or use
            <strong>{{ intro.soloKeys }}</strong> on your computer keyboard. The notes are filtered
            into the current scale, so they always fit the chord.
          </li>
          <li>
            Using the computer keyboard? It works as soon as the app window is focused; notes pause only while you type in a field.
          </li>
        </ul>

        <ul v-if="intro.legend && intro.legend.length" class="demo-intro-legend">
          <li v-for="trigger in intro.legend" :key="trigger.note">
            <strong>{{ trigger.key || trigger.note }}</strong>
            <span v-if="trigger.chord"> · {{ trigger.chord }}</span>
            <em v-if="trigger.scale"> · {{ trigger.scale }}</em>
          </li>
        </ul>

        <label class="demo-intro-dont-show">
          <input type="checkbox" v-model="dontShowAgain" />
          Don't show again
        </label>

        <div class="demo-intro-actions">
          <button type="button" class="demo-jam-button" @click="jam()">Jam!</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.demo-intro-layer {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 5.5rem 1.5rem 1.5rem;
  /* Let clicks pass through to the app behind the panel. */
  pointer-events: none;
}

.demo-intro-panel {
  pointer-events: auto;
  width: min(400px, 92vw);
  max-height: calc(100vh - 7rem);
  overflow-y: auto;
  /* Translucent so the main UI shows through. */
  background: rgba(240, 195, 134, 0.85);
  color: #3a2c1a;
  border: 2px solid #2e8b57;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(3px);
  padding: 0.9rem 1.1rem 1.1rem;
}

.demo-intro-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(58, 44, 26, 0.25);
  padding-bottom: 0.4rem;
  margin-bottom: 0.6rem;
}

.demo-intro-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.demo-intro-close {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: #5b4326;
}

.demo-intro-lead {
  margin: 0 0 0.5rem;
}

.demo-intro-list {
  margin: 0.4rem 0 0.9rem;
  padding-left: 1.1rem;
}

.demo-intro-list li {
  margin-bottom: 0.45rem;
  line-height: 1.35;
  font-size: 0.92rem;
}

.demo-intro-legend {
  margin: 0 0 0.9rem;
  padding: 0.4rem 0.6rem;
  list-style: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.45);
  font-size: 0.88rem;
}

.demo-intro-legend li {
  margin-bottom: 0.2rem;
}

.demo-intro-legend em {
  color: #5b4326;
}

.demo-intro-dont-show {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.7rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.demo-intro-actions {
  text-align: right;
}

.demo-jam-button {
  padding: 0.35rem 1.1rem;
  border: 1px solid #1f6b3f;
  border-radius: 999px;
  background: #2e8b57;
  color: #fff;
  font-size: 0.95rem;
  font-weight: bold;
  cursor: pointer;
}

.demo-jam-button:hover {
  background: #26744a;
}
</style>
