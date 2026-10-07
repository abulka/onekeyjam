<script setup>
import { globals } from '@/lib/globals.js'
import { reAllocateChords } from '../../src/lib/boot-project'

</script>

<template>
    <div class="ui row">
      <button @click="reAllocateChords" class="ui button">Reallocate Chords 🎲</button>
      <input type="range" id="max-chord-configs" min="7" max="235" step="1" v-model.number="globals.maxChordConfigs"> {{
          globals.maxChordConfigs
      }} of {{ globals.project.chords.length }}
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
