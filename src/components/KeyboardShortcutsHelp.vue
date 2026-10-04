<script setup>
import { onMounted, onUnmounted } from "vue";
import { labelForOffset } from '@/lib/midi/piano-key-map.js'

// Keyboard shortcuts reference, shown as a translucent panel pinned to the
// right, like the demo welcome. The panel stays on screen and lets clicks pass
// through to the app, so the user can read it and try shortcuts at the same
// time. Close with the ✕ or Esc.
const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

function keyLabel(offset) {
  return labelForOffset(offset)
}
function joinLabels(offsets) {
  return offsets.map(labelForOffset).join(' ')
}

const lhWhiteKeys = joinLabels([0, 2, 4, 5, 7, 9, 11])
const rhWhiteKeys = joinLabels([12, 14, 16, 17, 19, 21, 23])
const lhCsharp = keyLabel(1)
const lhDsharp = keyLabel(3)
const lhFsharp = keyLabel(6)
const lhGsharp = keyLabel(8)
const lhAsharp = keyLabel(10)

function onKeyDown(e) {
  if (e.key === 'Escape' && props.modelValue)
    close()
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="shortcuts-layer">
      <div class="shortcuts-panel" role="dialog" aria-label="Keyboard shortcuts">
        <div class="shortcuts-header">
          <h3>Keyboard shortcuts</h3>
          <button type="button" class="shortcuts-close" title="Close (Esc)" @click="close">✕</button>
        </div>

        <div class="shortcuts-body">
          <h4>Quick reference</h4>
          <p class="shortcuts-lead"><strong>Magic mode</strong> (default): a left-hand key plays a
            chord and the right hand is filtered to the current scale. The note keys play whenever
            the app window is focused, and pause while you type in a field.</p>

          <div class="sc-item">
            <div class="sc-label">Left hand, white</div>
            <div class="sc-body"><code class="kb">{{ lhWhiteKeys }}</code> trigger chords</div>
          </div>
          <div class="sc-item">
            <div class="sc-label">Left hand, black</div>
            <div class="sc-body">
              <code class="kb">{{ lhCsharp }}</code> shift ·
              <code class="kb">{{ lhDsharp }}</code> filter OFF ·
              <code class="kb">{{ lhFsharp }}</code> filter ON ·
              <code class="kb">{{ lhGsharp }}</code> transpose down ·
              <code class="kb">{{ lhAsharp }}</code> transpose up
            </div>
          </div>
          <div class="sc-item">
            <div class="sc-label">Shift held (<code class="kb">{{ lhCsharp }}</code>)</div>
            <div class="sc-body">
              <code class="kb">{{ lhDsharp }}</code> all notes off ·
              <code class="kb">{{ lhFsharp }}</code> add chord ·
              <code class="kb">{{ lhGsharp }}</code> reset transpositions ·
              <code class="kb">{{ lhAsharp }}</code> toggle Solo in key
            </div>
          </div>
          <div class="sc-item">
            <div class="sc-label">Right hand, white</div>
            <div class="sc-body"><code class="kb">{{ rhWhiteKeys }}</code> play the current scale</div>
          </div>
          <div class="sc-item">
            <div class="sc-label">Right hand, black (any octave)</div>
            <div class="sc-body">
              <code class="kb">1</code> scale1 ·
              <code class="kb">2</code> scale2 ·
              <code class="kb">3</code> scale3 ·
              <code class="kb">4</code> notes of chord ·
              <code class="kb">5</code> lock scale ·
              <code class="kb">0</code> Solo in key
            </div>
          </div>
          <div class="sc-item">
            <div class="sc-label">Lower-row aliases</div>
            <div class="sc-body">
              <code class="kb">,</code> C ·
              <code class="kb">L</code> C# ·
              <code class="kb">.</code> D ·
              <code class="kb">/</code> E · same notes as Q&nbsp;W&nbsp;E
            </div>
          </div>
          <div class="sc-item">
            <div class="sc-label">Higher octave</div>
            <div class="sc-body">
              <code class="kb">I</code> C ·
              <code class="kb">O</code> D ·
              <code class="kb">P</code> E ·
              <code class="kb">[</code> F ·
              <code class="kb">]</code> G ·
              <code class="kb">\</code> A · the keys right of P
            </div>
          </div>

          <h4>Normal piano mode</h4>
          <div class="sc-item">
            <div class="sc-label">White notes</div>
            <div class="sc-body">
              <code class="kb">A</code> <code class="kb">S</code> <code class="kb">D</code>
              <code class="kb">F</code> <code class="kb">G</code> <code class="kb">H</code>
              <code class="kb">J</code> <code class="kb">K</code> <code class="kb">L</code>
              <code class="kb">;</code>
            </div>
          </div>
          <div class="sc-item">
            <div class="sc-label">Black notes</div>
            <div class="sc-body">
              <code class="kb">W</code> <code class="kb">E</code> <code class="kb">T</code>
              <code class="kb">Y</code> <code class="kb">U</code> <code class="kb">O</code>
              <code class="kb">P</code>
            </div>
          </div>
          <div class="sc-item">
            <div class="sc-label">Octave</div>
            <div class="sc-body"><code class="kb">Z</code> / <code class="kb">X</code> shift the
              on-screen keyboard down / up</div>
          </div>

          <h4>Other shortcuts</h4>
          <div class="sc-item"><div class="sc-body"><code class="kb">F1</code> (hold) play / audition the picked chord</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">F2</code> (hold) play the current left-hand chord</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">F3</code> (hold) step to and play the next left-hand chord</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">F4</code> previous left-hand chord</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">F5</code> add the currently jammed chord</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">Ctrl+1</code> / <code class="kb">Ctrl+Shift+1</code> normal piano / magic mode</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">Ctrl+2</code> / <code class="kb">Ctrl+Shift+2</code> transpose up / down a semitone</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">Ctrl+3</code> / <code class="kb">Ctrl+Shift+3</code> invert chord up / down</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">Ctrl+5</code> / <code class="kb">Ctrl+Shift+5</code> circle of fifths up / down</div></div>
          <div class="sc-item"><div class="sc-body"><code class="kb">Esc</code> close this help or the welcome message</div></div>

          <h4>File <span class="shortcuts-muted">(main page only)</span></h4>
          <div class="sc-item"><div class="sc-body"><code class="kb">Alt+N</code> new · <code class="kb">Alt+O</code> open · <code class="kb">Alt+S</code> save · <code class="kb">Alt+F</code> featured · <code class="kb">Alt+C</code> classic</div></div>

          <h4>Notes</h4>
          <ul class="shortcuts-notes">
            <li><strong>Magic mode</strong> turns one left-hand white key into a chord and filters the right hand into the current scale. <strong>Normal piano</strong> plays a plain keyboard. Switch with the Magic / Normal buttons, or <code class="kb">Ctrl+1</code> / <code class="kb">Ctrl+Shift+1</code>.</li>
            <li>The number keys <code class="kb">1</code>-<code class="kb">5</code> switch scales on every octave; <code class="kb">0</code> toggles <strong>Solo in key</strong>.</li>
            <li>On Mac laptops the function keys may need <code class="kb">Fn</code>.</li>
            <li><code class="kb">F5</code> reloads the page on Windows and Linux.</li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.shortcuts-layer {
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

.shortcuts-panel {
  pointer-events: auto;
  width: min(420px, 92vw);
  max-height: calc(100vh - 7rem);
  overflow-y: auto;
  /* Translucent so the main UI shows through. */
  background: rgba(240, 195, 134, 0.9);
  color: #3a2c1a;
  border: 2px solid #2e8b57;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(3px);
  padding: 0.9rem 1.1rem 1.1rem;
}

.shortcuts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(58, 44, 26, 0.25);
  padding-bottom: 0.4rem;
  margin-bottom: 0.6rem;
}

.shortcuts-header h3 {
  margin: 0;
  font-size: 1.3rem;
}

.shortcuts-close {
  border: none;
  background: transparent;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  color: #5b4326;
}

.shortcuts-body h4 {
  margin: 1rem 0 0.4rem;
  font-size: 1.1rem;
  color: #5b4326;
}

.shortcuts-body h4:first-child {
  margin-top: 0;
}

.shortcuts-lead {
  margin: 0 0 0.6rem;
  font-size: 1rem;
  line-height: 1.45;
  color: #5b4326;
}

.sc-item {
  margin-bottom: 0.5rem;
}

.sc-label {
  font-size: 1rem;
  font-weight: bold;
  color: #5b4326;
}

.sc-body {
  font-size: 1.05rem;
  line-height: 1.5;
  color: #3a2c1a;
}

.kb {
  background-color: #fdf6e3;
  border: 1px solid #c9a86a;
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0 0.25em;
  margin: 0 0.05em;
  font-size: 0.95em;
  color: #3a2c1a;
}

.shortcuts-muted {
  font-weight: normal;
  color: #7a6547;
}

.shortcuts-notes {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
  font-size: 1rem;
  line-height: 1.45;
  color: #5b4326;
}

.shortcuts-notes li {
  margin-bottom: 0.3rem;
}
</style>
