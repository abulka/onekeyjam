<script setup>
import { onMounted } from 'vue'
import PageMenubar from '@/components/PageMenubar.vue'
import MidiKeyboardsDetected from '@/components/MidiKeyboardsDetected.vue'
import DebugAdmin from '@/components/DebugAdmin.vue'

onMounted(() => {
  $('#big-accordion-settings').accordion({ exclusive: false })
})
</script>

<template>
  <main>

    <PageMenubar />

    <div class="mb-4"></div>

    <div class="ui container">
      <div id="big-accordion-settings" class="ui fluid styled accordion" style="background-color: burlywood;"
        data-step="settings">

        <div class="active title">
          <i class="dropdown icon"></i>
          MIDI Keyboard Config
        </div>
        <div class="active content">
          <MidiKeyboardsDetected />
        </div>

        <div class="title">
          <i class="dropdown icon"></i>
          Debug
        </div>
        <div class="content">
          <DebugAdmin />
        </div>

      </div>
    </div>

  </main>
</template>
