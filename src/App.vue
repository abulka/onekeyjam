<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import mainOneKeyJam from '../src/lib/main.js';
import { globals } from './lib/globals.js';
import { wireHelpShortcuts } from './lib/helpShortcuts.js';
import DemoIntroDialog from './components/DemoIntroDialog.vue';

// The Research view is a development-only playground; hide it from production builds.
const showResearch = import.meta.env.DEV

const router = useRouter()

// The current project name, shown prominently at the right of the page tabs.
const projectName = computed(() => globals.projectLibrary.projectName || 'Untitled')

onMounted(() => {
  console.log('App onMounted')

  // one time OneKeyJam application and webmidi initialisation (non vue related)
  mainOneKeyJam()

  // Tab toggles between the Edit page and the Help page.
  wireHelpShortcuts(router)
})

</script>

<template>
  <div v-if="globals.boot.status === 'error'" class="ui container negative message pad-top">
    <div class="header">OneKeyJam failed to start</div>
    <p>{{ globals.boot.message }}</p>
  </div>

  <header>
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

        <RouterLink class="item" active-class="active" to="/">Edit</RouterLink>
        <RouterLink class="item" active-class="active" to="/perform">Perform</RouterLink>
        <RouterLink class="item" active-class="active" to="/settings">Settings</RouterLink>
        <RouterLink class="item" active-class="active" to="/about">Help</RouterLink>
        <RouterLink v-if="showResearch" class="item" active-class="active" to="/research">Research</RouterLink>

        <!-- Just for development ease -->
        <!-- <div class="item"> <a href="#" @click="newProject()">New</a> </div> -->
        <!-- <div class="item"> <a href="#" @click="loadNeoSoul()">Neo-soul</a> </div> -->
        <!-- <div class="item"> <a href="#" @click="fileImportMidiDialog.open()">dialog</a> </div> -->

        <div class="right menu">
          <div class="item app-project-name" :title="projectName">
            <span class="app-project-label">Project:</span>
            <strong class="app-project-value">{{ projectName }}</strong>
          </div>
        </div>
      </div>
    </div>




  </header>

  <!-- this gets replaced by the active routed page  -->
  <RouterView />

  <!-- App-wide modal used by the DEMO quick-start -->
  <DemoIntroDialog />

</template>

<style scoped>
/* Current project name, at the right of the page tabs. */
.app-project-name {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  max-width: 46vw;
  overflow: hidden;
  white-space: nowrap;
  /* Selectable so the name can be copied. */
  -webkit-user-select: text !important;
  user-select: text !important;
  cursor: text;
}

.app-project-label {
  font-size: 0.95rem;
  font-weight: normal;
  color: #7a6547;
}

.app-project-value {
  min-width: 0;
  font-size: 1.3rem;
  color: #5a3d1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  -webkit-user-select: text !important;
  user-select: text !important;
}
</style>
