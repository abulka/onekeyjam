import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

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
  }), tailwindcss()],
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

  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.test.js', 'src/**/*.spec.js'],
  },

})
