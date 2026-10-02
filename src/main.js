import { createApp } from 'vue'
// import { createPinia } from 'pinia'
// import { autoAnimatePlugin } from '@formkit/auto-animate/vue'  // https://auto-animate.formkit.com/#usage-vue npm i "@formkit/auto-animate" but conflicts with better-docs 

import { VTour } from '@globalhive/vuejs-tour';
import '@globalhive/vuejs-tour/dist/style.css';

// jQuery + Fomantic UI (previously loaded from CDN <script> tags).
import { fomanticReady } from './vendor/index.js'
import './index.css'  // tailwind - https://tailwindcss.com/docs/guides/vite

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.component('VTour', VTour)

app.use(router)

// Mount after Fomantic has registered its jQuery plugins, so component
// onMounted hooks can call dropdown()/modal()/accordion()/toast().
fomanticReady
  .catch(error => console.error('Fomantic UI failed to load:', error))
  .finally(() => app.mount('#app'))
