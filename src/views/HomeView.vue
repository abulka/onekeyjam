<script setup>
import { reAllocateChords, reAllocateScales, fillScalesFromKeySignature } from '../../src/lib/boot-project'
import { resetTranspositionsEtc } from '../../src/lib/resetState'

import Jammer from '@/components/JammerView.vue'
import PageMenubar from '@/components/PageMenubar.vue'
</script>

<template>
  <main>

    <PageMenubar>
      <template #actions>
        <a class="item" @click="reAllocateChords()">Reallocate Chords 🎲</a>
        <a class="item" @click="reAllocateScales()">Find Matching Scales 🎹</a>
        <div class="ui divider"></div>
        <a class="item" @click="resetTranspositionsEtc()">Reset Transpositions</a>
        <a class="item" @click="fillScalesFromKeySignature()">Fill with Key Signature</a>
      </template>
    </PageMenubar>

    <!-- A bit of spacing -->
    <div class="mb-4"></div>

    <Jammer />

  </main>
</template>
