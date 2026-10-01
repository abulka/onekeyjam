<script setup>
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import mainOneKeyJam from '../src/lib/main.js';

// The Research view is a development-only playground; hide it from production builds.
const showResearch = import.meta.env.DEV

onMounted(() => {
  console.log('App onMounted')

  // one time OneKeyJam application and webmidi initialisation (non vue related)
  mainOneKeyJam()
})

</script>

<template>
  <header>
    <!-- <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" /> -->

    <!-- Main menu -->
    <div class="ui container center aligned pad-top">

      <div class="ui secondary  menu">

        <!-- <div class="ui dropdown item">
          <div class="text">View</div>
          <i class="dropdown icon"></i>
          <div class="menu">
            <RouterLink class="item" active-class="active" to="/">OneKeyJam</RouterLink>
            <RouterLink class="item" active-class="active" to="/about">Help</RouterLink>
            <RouterLink class="item" active-class="active" to="/research">Research</RouterLink>

          </div>
        </div> -->

        <RouterLink class="item" active-class="active" to="/">OneKeyJam</RouterLink>
        <RouterLink class="item" active-class="active" to="/perform">Perform</RouterLink>
        <RouterLink class="item" active-class="active" to="/about">Help</RouterLink>
        <RouterLink v-if="showResearch" class="item" active-class="active" to="/research">Research</RouterLink>

        <!-- Just for development ease -->
        <!-- <div class="item"> <a href="#" @click="newProject()">New</a> </div> -->
        <!-- <div class="item"> <a href="#" @click="loadNeoSoul()">Neo-soul</a> </div> -->
        <!-- <div class="item"> <a href="#" @click="fileImportMidiDialog.open()">dialog</a> </div> -->

        <div class="right menu">

        </div>
      </div>
    </div>




  </header>

  <!-- this gets replaced by the active routed page  -->
  <RouterView />

</template>

<style>

</style>
