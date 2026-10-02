import { createApp } from 'vue'
// import { createPinia } from 'pinia'
// import { autoAnimatePlugin } from '@formkit/auto-animate/vue'  // https://auto-animate.formkit.com/#usage-vue npm i "@formkit/auto-animate" but conflicts with better-docs 

import { VTour } from '@globalhive/vuejs-tour';
import '@globalhive/vuejs-tour/dist/style.css';

import App from './App.vue'
import router from './router'
import './index.css'  // tailwind - https://tailwindcss.com/docs/guides/vite
import { initUiPrefs } from './lib/uiPrefs.js'

// Restore saved UI preferences before the first render so the keyboard labels
// start in the user's chosen mode (default: black and white).
initUiPrefs()

// jQuery and Fomantic UI are loaded from pinned CDN <script>/<link> tags in
// index.html, so `$` and its plugins are present before this module runs.

const app = createApp(App)
app.component('VTour', VTour)

app.use(router)

app.mount('#app')
