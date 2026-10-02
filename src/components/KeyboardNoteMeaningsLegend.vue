<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { labelForOffset } from '@/lib/midi/piano-key-map.js'
import { globals } from '@/lib/globals.js'

const showShortcuts = ref(false)

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
const rhCsharp = keyLabel(13)
const rhDsharp = keyLabel(15)
const rhFsharp = keyLabel(18)
const rhGsharp = keyLabel(20)
const rhAsharp = keyLabel(22)

function onKeyDown(e) {
  if (e.key === 'Escape')
    showShortcuts.value = false
}

onMounted(() => {
  $('.ui.accordion.keyboard-note-meanings')
    .accordion({ exclusive: false })
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

</script>

<template>

  <div class="ui accordion keyboard-note-meanings">
    <div class="title">
      <i class="dropdown icon"></i>
      Magic mode piano keyboard note meanings
      <button type="button" class="shortcuts-button" title="Show all keyboard shortcuts"
        @click.stop="showShortcuts = true">? Shortcuts</button>
      <label class="shortcuts-checkbox" title="Show the computer-keyboard key on each piano key"
        @click.stop>
        <input type="checkbox" v-model="globals.showKeyShortcuts">
        Show computer keyboard shortcuts
      </label>
    </div>
    <div class="content">

      White notes:
        <b>L Hand</b> [<code class="kb">{{ lhWhiteKeys }}</code>]: trigger Chords
        <span class="ml-4"><b>R Hand</b> [<code class="kb">{{ rhWhiteKeys }}</code>]: trigger notes of current
          Scale</span>
      <br>

      <div class="mt-2"></div>
      Black notes: <b>L Hand</b>:
        <code class="tip">C#</code> [<code class="kb">{{ lhCsharp }}</code>] <span class="meta">shift</span>
        <code class="tip">D#</code> [<code class="kb">{{ lhDsharp }}</code>] scale filt. off
        <code class="tip">F#</code> [<code class="kb">{{ lhFsharp }}</code>] scale filt. on
        <code class="tip">G#</code> [<code class="kb">{{ lhGsharp }}</code>] transpose down
        <code class="tip">A#</code> [<code class="kb">{{ lhAsharp }}</code>] transpose up
      <br>
      <span class="ml-6"><span class="meta">shift</span> (hold <code class="tip">C#</code>) <b>+</b>:</span>
        <code class="tip">D#</code> [<code class="kb">{{ lhDsharp }}</code>] emergency all notes off
        <code class="tip">F#</code> [<code class="kb">{{ lhFsharp }}</code>] add chord
        <code class="tip">G#</code> [<code class="kb">{{ lhGsharp }}</code>] reset transpositions
      <br>

      <div class="mt-2"></div>
      Black notes: <b>R Hand</b>:
        <code class="tip">C#</code> [<code class="kb">{{ rhCsharp }}</code>] scale1
        <code class="tip">D#</code> [<code class="kb">{{ rhDsharp }}</code>] scale2
        <code class="tip">F#</code> [<code class="kb">{{ rhFsharp }}</code>] scale3
        <code class="tip">G#</code> [<code class="kb">{{ rhGsharp }}</code>] scale notes of chord
        <code class="tip">A#</code> [<code class="kb">{{ rhAsharp }}</code>] lock current scale
      <br>
      <span class="text-muted">Click the on-screen keyboard first so it has focus, then use the keys in [brackets].</span>
      <br>
      <span class="text-muted">Right hand aliases on the lower row:
        <code class="kb">,</code> C <code class="kb">L</code> C# <code class="kb">.</code> D
        <code class="kb">/</code> E
        (same notes as <code class="kb">Q</code> <code class="kb">2</code> <code class="kb">W</code>
        <code class="kb">E</code>).</span>
      <br>
      <span class="text-muted">Higher octave:
        <code class="kb">I</code> C <code class="kb">9</code> C# <code class="kb">O</code> D
        <code class="kb">0</code> D# <code class="kb">P</code> E <code class="kb">[</code> F
        <code class="kb">-</code> F# <code class="kb">]</code> G <code class="kb">=</code> G#
        <code class="kb">\</code> A.</span>

    </div>
  </div>

  <Teleport to="body">
    <div v-if="showShortcuts" class="shortcuts-overlay" @click.self="showShortcuts = false">
      <div class="shortcuts-panel" role="dialog" aria-label="Keyboard shortcuts">
        <div class="shortcuts-header">
          <h3>Keyboard shortcuts</h3>
          <button type="button" class="shortcuts-close" title="Close" @click="showShortcuts = false">✕</button>
        </div>

        <div class="shortcuts-body">
          <h4>On-screen piano <span class="text-muted">(click the keyboard first)</span></h4>
          <table class="shortcuts-table">
            <tbody>
              <tr>
                <td>Left hand white</td>
                <td><code class="kb">{{ lhWhiteKeys }}</code></td>
                <td>trigger chords</td>
              </tr>
              <tr>
                <td>Left hand black</td>
                <td>
                  <code class="kb">{{ lhCsharp }}</code> shift /
                  <code class="kb">{{ lhDsharp }}</code> filter OFF /
                  <code class="kb">{{ lhFsharp }}</code> filter ON /
                  <code class="kb">{{ lhGsharp }}</code> transpose down /
                  <code class="kb">{{ lhAsharp }}</code> transpose up
                </td>
                <td></td>
              </tr>
              <tr>
                <td>SHIFT held (<code class="kb">{{ lhCsharp }}</code>)</td>
                <td>
                  <code class="kb">{{ lhDsharp }}</code> all notes off /
                  <code class="kb">{{ lhFsharp }}</code> add chord /
                  <code class="kb">{{ lhGsharp }}</code> reset transpositions
                </td>
                <td></td>
              </tr>
              <tr>
                <td>Right hand white</td>
                <td><code class="kb">{{ rhWhiteKeys }}</code></td>
                <td>play current scale notes</td>
              </tr>
              <tr>
                <td>Right hand black</td>
                <td>
                  <code class="kb">{{ rhCsharp }}</code> scale1 /
                  <code class="kb">{{ rhDsharp }}</code> scale2 /
                  <code class="kb">{{ rhFsharp }}</code> scale3 /
                  <code class="kb">{{ rhGsharp }}</code> notes of chord /
                  <code class="kb">{{ rhAsharp }}</code> lock current scale
                </td>
                <td></td>
              </tr>
              <tr>
                <td>Lower-row aliases</td>
                <td>
                  <code class="kb">,</code> C /
                  <code class="kb">L</code> C# /
                  <code class="kb">.</code> D /
                  <code class="kb">/</code> E
                </td>
                <td>same notes as Q 2 W E</td>
              </tr>
              <tr>
                <td>Higher octave</td>
                <td>
                  <code class="kb">I</code> C /
                  <code class="kb">9</code> C# /
                  <code class="kb">O</code> D /
                  <code class="kb">0</code> D# /
                  <code class="kb">P</code> E /
                  <code class="kb">[</code> F /
                  <code class="kb">-</code> F# /
                  <code class="kb">]</code> G /
                  <code class="kb">=</code> G# /
                  <code class="kb">\</code> A
                </td>
                <td>the keys right of P</td>
              </tr>
            </tbody>
          </table>

          <h4>Other shortcuts</h4>
          <table class="shortcuts-table">
            <tbody>
              <tr><td><code class="kb">F1</code> (hold)</td><td>play / audition the picked chord</td></tr>
              <tr><td><code class="kb">F2</code> (hold)</td><td>play the current left-hand chord</td></tr>
              <tr><td><code class="kb">F3</code> (hold)</td><td>step to and play the next left-hand chord</td></tr>
              <tr><td><code class="kb">F4</code></td><td>previous left-hand chord</td></tr>
              <tr><td><code class="kb">F5</code></td><td>add the currently jammed chord</td></tr>
              <tr><td><code class="kb">Ctrl+1</code> / <code class="kb">Ctrl+Shift+1</code></td><td>normal piano / magic mode</td></tr>
              <tr><td><code class="kb">Ctrl+2</code> / <code class="kb">Ctrl+Shift+2</code></td><td>transpose up / down a semitone</td></tr>
              <tr><td><code class="kb">Ctrl+3</code> / <code class="kb">Ctrl+Shift+3</code></td><td>invert chord up / down</td></tr>
              <tr><td><code class="kb">Ctrl+5</code> / <code class="kb">Ctrl+Shift+5</code></td><td>circle of fifths up / down</td></tr>
            </tbody>
          </table>

          <h4>File <span class="text-muted">(main page only)</span></h4>
          <table class="shortcuts-table">
            <tbody>
              <tr><td><code class="kb">Alt+N</code></td><td>new project</td></tr>
              <tr><td><code class="kb">Alt+O</code></td><td>open a project</td></tr>
              <tr><td><code class="kb">Alt+S</code></td><td>save project</td></tr>
              <tr><td><code class="kb">Alt+F</code></td><td>open a featured project</td></tr>
            </tbody>
          </table>

          <h4>Notes</h4>
          <ul class="shortcuts-notes">
            <li>The number row skips <code class="kb">4</code> and <code class="kb">8</code> because there is no black key between E–F or B–C.</li>
            <li>On Mac laptops the function keys may need <code class="kb">Fn</code>, or enable "use F1, F2, etc. keys as standard function keys".</li>
            <li><code class="kb">F5</code> reloads the page on Windows and Linux.</li>
            <li>The on-screen keyboard must be clicked first so it has focus before the letter and number shortcuts work.</li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>

</template>

<style scoped>
.tip {
  font-size: 1.2em;
  color: rgb(107, 64, 64);
  margin-left: 0.4em;
}

.meta {
  font-size: 1.0em;
  color: rgb(164, 23, 196);
  margin-left: 0.2em;
}

.kb {
  background-color: #f3f4f6;
  border: 1px solid #cbd5e1;
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0 0.3em;
  margin: 0 0.1em;
  font-size: 0.9em;
  color: #1f2937;
}

.text-muted {
  color: #6b7280;
  font-size: 0.9em;
}

.shortcuts-button {
  margin-left: 0.75rem;
  padding: 0.15rem 0.6rem;
  border: 1px solid #2f4fa8;
  border-radius: 999px;
  background: #4a6fd4;
  color: #fff;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
}

.shortcuts-button:hover {
  background: #3a5cc0;
}

.shortcuts-checkbox {
  margin-left: 0.75rem;
  font-size: 0.85rem;
  font-weight: normal;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.shortcuts-checkbox input {
  margin-right: 0.3rem;
  vertical-align: middle;
}

.shortcuts-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.shortcuts-panel {
  background: #fff;
  color: #1f2937;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  width: min(720px, 100%);
  max-height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
}

.shortcuts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.shortcuts-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.shortcuts-close {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  color: #6b7280;
}

.shortcuts-body {
  padding: 1rem 1.25rem 1.5rem;
  overflow-y: auto;
}

.shortcuts-body h4 {
  margin: 1rem 0 0.5rem;
  font-size: 1rem;
}

.shortcuts-body h4:first-child {
  margin-top: 0;
}

.shortcuts-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.5rem;
}

.shortcuts-table td {
  padding: 0.3rem 0.5rem;
  vertical-align: top;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}

.shortcuts-table td:first-child {
  white-space: nowrap;
  color: #374151;
}

.shortcuts-notes {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.9rem;
  color: #4b5563;
}

.shortcuts-notes li {
  margin-bottom: 0.25rem;
}
</style>
