<script setup>
// @ts-check
import { ref, computed } from 'vue'
import { globals } from "@/lib/globals.js"
import { parseChordSequence } from "@/lib/parseChordSequence.js"
import { voiceChordSequence } from "@/lib/voiceChordSequence.js"
import { appendChordSequence, lastProjectChordNotes } from "@/lib/appendChordSequence.js"

const inputText = ref('')
const statusMessage = ref('')

const parseResult = computed(() => parseChordSequence(inputText.value))
const hasEntries = computed(() => parseResult.value.entries.length > 0)
const hasErrors = computed(() => parseResult.value.errors.length > 0)

// Track grid length so the preview re-anchors when chords are added elsewhere.
const anchorNotes = computed(() => {
  const count = globals.project?.chords?.length ?? 0
  void count
  return lastProjectChordNotes()
})

const voicedPreview = computed(() => {
  if (!hasEntries.value)
    return []
  try {
    return voiceChordSequence(parseResult.value.entries, { previousChordNotes: anchorNotes.value })
  } catch (error) {
    console.warn('Could not voice chord sequence', error)
    return []
  }
})

const canAppend = computed(() => hasEntries.value && !hasErrors.value)
const appendLabel = computed(() => {
  const count = parseResult.value.entries.length
  return count === 1 ? 'Append 1 Chord' : `Append ${count} Chords`
})

function inversionLabel(inversion) {
  return inversion === 0 ? 'root position' : `inversion ${inversion}`
}

function appendToGrid() {
  if (!canAppend.value)
    return
  const voiced = voiceChordSequence(parseResult.value.entries, { previousChordNotes: lastProjectChordNotes() })
  const { addedCount } = appendChordSequence(voiced)
  statusMessage.value = addedCount === 1
    ? 'Added 1 chord to the grid.'
    : `Added ${addedCount} chords to the grid.`
  inputText.value = ''
}
</script>

<template>
  <div>
    <p>
      Type chord names separated by spaces, commas, or new lines, for example
      <code>Dsus4 Dmaj7 C#min11</code>. Each chord is appended to the chord grid
      with a voicing chosen to minimise movement from the previous chord.
    </p>

    <textarea
      v-model="inputText"
      rows="3"
      style="width: 100%;"
      placeholder="Dsus4 Dmaj7 C#min11"
    ></textarea>

    <p v-if="anchorNotes.length > 0" class="mt-2">
      <i>Voicing from the last grid chord <code>[{{ anchorNotes.join(' ') }}]</code>.</i>
    </p>
    <p v-else class="mt-2">
      <i>The grid is empty, so the first chord starts in root position.</i>
    </p>

    <div v-if="hasEntries" class="mt-2">
      <h5>Preview</h5>
      <table class="ui very compact table">
        <thead>
          <tr><th>Chord</th><th>Voicing</th><th>Position</th></tr>
        </thead>
        <tbody>
          <tr v-for="chord in voicedPreview" :key="chord.input + chord.chordNotes.join('-')">
            <td><code>{{ chord.symbol }}</code></td>
            <td><code>[{{ chord.chordNotes.join(' ') }}]</code></td>
            <td>{{ inversionLabel(chord.inversion) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="hasErrors" class="ui negative message mt-2">
      <p>Fix these names before appending:</p>
      <ul>
        <li v-for="error in parseResult.errors" :key="error.input">
          <code>{{ error.input }}</code> — {{ error.message }}
        </li>
      </ul>
    </div>

    <div class="mt-2">
      <button @click="appendToGrid" class="ui small button" :disabled="!canAppend">
        {{ appendLabel }}
      </button>
      <span v-if="statusMessage" class="ml-2">{{ statusMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
textarea {
  font-family: monospace;
}
.mt-2 {
  margin-top: 0.6em;
}
</style>
