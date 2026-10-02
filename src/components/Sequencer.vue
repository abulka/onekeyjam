<script setup>
import { computed, onMounted, ref } from 'vue'
import { globals } from "@/lib/globals.js"
import { Note } from '@/lib/midi/webmidi.js'
import { Note as TonalNote } from '@tonaljs/tonal'
import { indexToNote } from "@/lib/note-tools.js"
import { audioContext } from '@/lib/audio/general-midi.js'
import { onNoteOn } from "@/lib/midi/wire-events.js"
import { auditionMidiNote } from '@/lib/midi/audition-note.js'
import PianoRollPanel from './PianoRollPanel.vue'

// the pattern sequencer. Renders on the shared PianoRollPanel (full width).

const panel = ref(null)
const inputSequencerPersist = ref(null)

// The widget's rows are relative to C4 (60), so a sounding MIDI note lights the
// row the sequencer maps it to: row = midi - rowOffset.
const rowOffset = computed(() => 12 * globals.keyboard.lhTriggerOctave + 12 - 60)

onMounted(() => {
  // Two bars at the panel's timebase of 16 (16 ticks per whole note).
  panel.value?.setLoop(0, 128)
})

function sequencerPlay(e, from = 'beginning') {
  // Trigger a chord
  // parameter: e is the event object
  // parameter: string: 'beginning' or 'current' where to start playing the chord sequence from

  const starttick = (from == 'beginning') ? 0 : undefined; // 0 for start, undefined for current position
  console.log('starttick', starttick)

  panel.value.play(audioContext, function (options) {
    // parameter options: {t:noteOnTime, g:noteOffTime, n:noteNumber}
    // starts at 60 by default which I think is the midi number?
    const allowedNote = indexToNote(options.n - 60, globals.keyboard.lhTriggerOctave)
    const duration = options.g - options.t
    const when = options.t
    let simulatedEvent = {
      note: new Note(allowedNote, { attack: 0.5 }),
      duration: duration,
      when: when,
    }
    onNoteOn(simulatedEvent)
  }, starttick)
}

function sequencerResume(e) {
  sequencerPlay(e, 'current')
}

function onAudition({ midi }) {
  // Play the note the same way the sequencer would when it runs.
  const noteName = indexToNote(midi - 60, globals.keyboard.lhTriggerOctave)
  const sounding = TonalNote.midi(noteName)
  if (typeof sounding === 'number')
    auditionMidiNote(sounding)
}

function sequencerStop() {
  panel.value.stop()
}

function sequencerSave() {
  const s = panel.value.getMML()
  console.log('MML string:', s)
  inputSequencerPersist.value.value = s
}

function sequencerSaveToProject() {
  const s = panel.value.getMML()
  let entry = getDefaultEntry()
  entry.mml = s
}

function sequencerLoad() {
  const s = inputSequencerPersist.value.value
  panel.value.setMML(s)
}

function sequencerPatternAscendingWhiteNotes() {
  // const s = "t100o4l8c2d2e2f2g2a2b2o5c2d2e2f2g2a2b2o6c2d2e2f2g2a2b2"
  const s = "t100o4l8c4d4e4f4g4a4b4o5c4d4e4f4g4a4b4o6c4d4e4f4g4a4b4o7c4d4e4f4g4a4b4o8c4d4e4f4g4a4b4"
  inputSequencerPersist.value.value = s
  panel.value.setMML(s)
}

function sequencerLoadFromProject() {
  const entry = getDefaultEntry()
  panel.value.setMML(entry.mml)
}

function getDefaultEntry() {
  let entry
  if (globals.project.chordSequences != undefined && globals.project.chordSequences.default != undefined) {
    entry = globals.project.chordSequences.default
  }
  else {
    globals.project.chordSequences = {}
    entry = {
      mml: '',
      tempo: 99,
    }
    globals.project.chordSequences.default = entry
  }
  return entry
}

function sequencerClear() {
  const s = 't100o4l8'
  panel.value.setMML(s)
}

</script>

<template>
  <!-- doco https://github.com/g200kg/webaudio-pianoroll -->

  <PianoRollPanel
    ref="panel"
    :timebase="16"
    :tempo="100"
    :octadj="-1"
    :initial-bars="1"
    :initial-y-range="16"
    :initial-y-offset="60"
    :min-width="500"
    :row-offset="rowOffset"
    @audition="onAudition"
  />

  <br>
  <button @click="sequencerPlay()" class="ui button">Play</button>
  <button @click="sequencerStop()" class="ui button">Stop</button>
  <button @click="sequencerResume()" class="ui button">Resume</button>
  <button @click="sequencerSaveToProject()" class="ui button">Save To Project</button>
  <button @click="sequencerLoadFromProject()" class="ui button">Load From Project</button>
  <button @click="sequencerClear()" class="ui button">Clear</button>

  <div>
    <input ref="inputSequencerPersist" type="text" style="width: 100%; font-size: larger; margin-top: 0.5em;"
      placeholder="" value="t100o4l8c1d1c1d1e1f1g1g1" />
  </div>
  <button @click="sequencerSave()" class="ui button">Save</button>
  <button @click="sequencerLoad()" class="ui button">Load</button>
  <button @click="sequencerPatternAscendingWhiteNotes()" class="ui button">Pattern Ascending White Notes</button>

</template>
