import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import postcss from './postcss.config.js'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: '8080'
  },  
  // plugins: [vue()],
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: tag => (tag === 'webaudio-keyboard' || 
                                 tag === 'webaudio-switch' ||
                                 tag === 'webaudio-slider' ||
                                 tag === 'webaudio-pianoroll' 
                                 ) 
      }
    }
  })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    minify: 'esbuild'
  },

  // logs all file changes, not just the last one
  clearScreen: false,

  css: {
    postcss,
  },
  
})
