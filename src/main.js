import { createApp } from 'vue'
// import { createPinia } from 'pinia'
// import { autoAnimatePlugin } from '@formkit/auto-animate/vue'  // https://auto-animate.formkit.com/#usage-vue npm i "@formkit/auto-animate" but conflicts with better-docs 

import VueJsTour from '@globalhive/vuejs-tour';
import '@globalhive/vuejs-tour/dist/style.css';

import App from './App.vue'
import router from './router'
import './index.css'  // tailwind - https://tailwindcss.com/docs/guides/vite

const app = createApp(App)
    .use(VueJsTour)

// app.use(createPinia())
app.use(router)
// app.use(autoAnimatePlugin)  // use v-auto-animate directive

app.mount('#app')
