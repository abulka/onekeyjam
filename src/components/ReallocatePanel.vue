<script setup>
import { globals } from '@/lib/globals.js'
import { reAllocateChords, resizeGridRowCount } from '../../src/lib/boot-project'

function onSliderChange(event) {
  resizeGridRowCount(globals.maxChordConfigs)
  const el = event?.target
  if (el && typeof el.blur === 'function')
    el.blur()
}

</script>

<template>
    <div class="ui row">
      <button @click="reAllocateChords" class="ui button" title="Deal a new hand of chords from the pool onto the trigger keys. Keepers (favourites) stay put. The result is saved with the project.">Deal new chords 🎲</button>
      <input type="range" id="max-chord-configs" min="1" max="235" step="1" v-model.number="globals.maxChordConfigs" @change="onSliderChange"> {{
          globals.maxChordConfigs
      }} of {{ globals.project.chords.length }}
      <span v-if="globals.maxChordConfigs === 7" title="Seven rows fit the computer keys z x c v b n m">fits z x c v b n m</span>
      &nbsp;&nbsp;&nbsp;&nbsp;

      <!-- &nbsp;&nbsp;&nbsp;&nbsp;
      <button @click="reAllocateScales" class="ui button">Find Matching Scales 🎹</button> -->

      <!-- &nbsp;&nbsp;&nbsp;&nbsp;
      <button @click="resetTranspositionsEtc()" class="ui tiny button">Reset Transpositions</button> -->

      <!-- Just for development ease -->
      <!-- &nbsp;&nbsp;&nbsp;&nbsp;
      <button @click="newProject()" class="ui tiny button">New</button>
      <button @click="loadNeoSoul()" class="ui tiny button">Neo-soul</button> -->

      <!-- <SongFavouritesDebug /> -->
    </div>

    <div class="row mt-4">
      <label title="Turn this off to prevent Favourite Chords from appearing in the chord list, so that you can temporarily examine other chords">
        Allocate Favourites <input type="checkbox" v-model="globals.allocateFavourites" /></label>
    </div>

</template>

<style scoped>
</style>
