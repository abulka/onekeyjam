<script setup>
import { ref, watch } from 'vue'
import { globals } from "@/lib/globals.js"
import { Note } from '@/lib/midi/webmidi.js'
import { indexToNote } from "@/lib/note-tools.js"
import { audioContext } from '@/lib/audio/general-midi.js'
import { onNoteOn } from "@/lib/midi/wire-events.js"

// declare a ref to hold the element reference
// the name must match template ref value
const sequencer = ref(null)
const inputSequencerPersist = ref(null)
const xrange = ref(1)
const xoffset = ref(0)
const yrange = ref(16)
const yoffset = ref(60)
const vanillaSliders = ref(false)

const timebase = 16;

watch(xrange, (value, prevValue) => {
  sequencer.value.xrange = value * timebase;
})
watch(xoffset, (value, prevValue) => {
  sequencer.value.xoffset = value * timebase;
})
watch(yrange, (value, prevValue) => {
  sequencer.value.yrange = value
})
watch(yoffset, (value, prevValue) => {
  sequencer.value.yoffset = value
})

function sequencerPlay(e, from='beginning') {
  // Trigger a chord
  // parameter: e is the event object
  // parameter: string: 'beginning' or 'current' where to start playing the chord sequence from

  const starttick = (from == 'beginning') ? 0 : undefined; // 0 for start, undefined for current position
  console.log('starttick', starttick)

  sequencer.value.play(audioContext, function (options) {
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

function sequencerStop(e) {
  sequencer.value.stop()
}

function sequencerSave(e) {
  const s = sequencer.value.getMMLString()
  console.log('MML string:', s)
  inputSequencerPersist.value.value = s
}

function sequencerSaveToProject(e) {
  const s = sequencer.value.getMMLString()
  let entry = getDefaultEntry()
  entry.mml = s
}

function sequencerLoad(e) {
  const s = inputSequencerPersist.value.value
  sequencer.value.setMMLString(s)
}

function sequencerPatternAscendingWhiteNotes(e) {
  // const s = "t100o4l8c2d2e2f2g2a2b2o5c2d2e2f2g2a2b2o6c2d2e2f2g2a2b2"
  const s = "t100o4l8c4d4e4f4g4a4b4o5c4d4e4f4g4a4b4o6c4d4e4f4g4a4b4o7c4d4e4f4g4a4b4o8c4d4e4f4g4a4b4"
  inputSequencerPersist.value.value = s
  sequencer.value.setMMLString(s)
}

function sequencerLoadFromProject(e) {
  const entry = getDefaultEntry()
  sequencer.value.setMMLString(entry.mml)
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

function sequencerClear(e) {
  const s = 't100o4l8'
  sequencer.value.setMMLString(s)
}

// const isLargeScreen = computed({
//   get: () => window.innerWidth > 768,
// })

</script>

<template>
  <!-- doco https://github.com/g200kg/webaudio-pianoroll -->

  <div class="ui grid">
    <div class="fourteen wide column">
      <!-- <webaudio-pianoroll v-if="isLargeScreen" ref="sequencer" width="950" wheelzoom="0" timebase="16" xrange="128" markend="128" tempo="100" octadj="-1"></webaudio-pianoroll> -->
      <!-- <webaudio-pianoroll v-else ref="sequencer" width="550" wheelzoom="0" timebase="16" xrange="128" markend="128" tempo="100" octadj="-1"></webaudio-pianoroll> -->
      <webaudio-pianoroll ref="sequencer" width="600" wheelzoom="0" timebase="16" xrange="128" markend="128" tempo="100" octadj="-1"></webaudio-pianoroll>
    </div>

    <div class="one wide column">
      Scroll
      <span v-if="vanillaSliders">{{ yoffset }}
        <input type="range" min="50" max="94" step="1" v-model="yoffset" class="vertical" /></span>
      <webaudio-slider v-if="!vanillaSliders" id="yoffset" v-model="yoffset" tracking="abs" direction="vert" width="24"
        height="200" min="50" max="94">
      </webaudio-slider>

    </div>
    <div class="one wide column">
      Zoom
      <span v-if="vanillaSliders">{{ yrange }} <input type="range" min="3" max="32" step="1" v-model="yrange"
          class="vertical" /></span>
      <webaudio-slider v-if="!vanillaSliders" v-model="yrange" tracking="abs" direction="vert" width="24" height="120"
        min="3" max="32"></webaudio-slider>

    </div>

  </div>
  <br>

  <span v-if="!vanillaSliders">
    Scroll
    <webaudio-slider v-model="xoffset" direction="horz" tracking="abs" width="500" height="24" min="0" max="20"
      step="0.1">
    </webaudio-slider>
  </span>
  <span v-if="!vanillaSliders">
    Zoom
    <webaudio-slider v-model="xrange" direction="horz" tracking="abs" width="320" height="24" min="1" max="20" step="1">
    </webaudio-slider>
  </span>

  <br>
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

  <span v-if="vanillaSliders">
    Zoom x: {{ xrange }} <input type="range" min="1" max="20" step="1" v-model="xrange" />
    Scroll x: {{ xoffset }} <input type="range" min="0" max="20" step="1" v-model="xoffset" />
  </span>

</template>

<style scoped>
input[type=range].vertical {
  transform: rotate(90deg);
  transform-origin: left;
}
</style>
