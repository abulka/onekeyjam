<script setup>
import { onMounted, onUnmounted } from "vue";
import { globals } from '@/lib/globals.js'

onMounted(() => {
  $('.ui.accordion.keyboard-note-meanings')
    .accordion({ exclusive: false })

});

onUnmounted(() => {
});


</script>

<template>

  <div class="ui accordion keyboard-note-meanings">
    <div class="title">
      <i class="dropdown icon"></i>
      Magic mode piano keyboard note meanings
    </div>
    <div class="content">

      <!-- caption underneath main piano keyboard - TURNED OFF at the moment-->
      <div class="ui two column grid" v-if="false">
        <div class="column left floated">
          Left hand piano white notes [
          <span v-for="name in projectChordsTriggers" :key="name" :class="{ 'boldy': name === globals.currentChordTriggerNote }">
            <code class="chord-note-padding">{{ name }}</code>
          </span> ] trigger chords.
        </div>
        <div class="column right floated right aligned">
          Improvise using right hand white notes beginning at
          <b><code>C{{ globals.jamTriggerOctave }}</code></b>
          (plays {{ globals.firstNoteOfCurrentRhScale }}{{ globals.keyboard.rhJamSoundOctave }})
        </div>
        <br>
      </div>

      White notes: 
        <b>L Hand</b>: trigger Chords
        <span class="ml-4"><b>R Hand</b>: trigger notes of current Scale</span>
      <br>

      <div class="mt-2"></div>
      Black notes: <b>L Hand</b>: 
        <code class="tip">C#</code> <span class="meta">shift</span>
        <code class="tip">D#</code> scale filt. off
        <code class="tip">F#</code> scale filt. on
        <code class="tip">G#</code> transpose up
        <code class="tip">A#</code> tr. down
      <br>
      <span class="ml-6"><span class="meta">shift</span> <b>+</b>:</span> 
        <code class="tip">D#</code> emergency all notes off 
        <code class="tip">F#</code> add chord 
        <code class="tip">G#</code> reset transpositions 
        <code class="tip">A#</code> reset tr.
      <br>
      
      <div class="mt-2"></div>
      Black notes: <b>R Hand</b>: 
        <code class="tip">C#</code> scale1 
        <code class="tip">D#</code> scale2 
        <code class="tip">F#</code> scale3 
        <code class="tip">G#</code> scale notes of chord 
        <code class="tip">A#</code> lock curr scale

    </div>
  </div>

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
</style>