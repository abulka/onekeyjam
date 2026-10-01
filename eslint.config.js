import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

// Globals provided by <script src> tags in index.html (CDN libraries).
const cdnGlobals = {
  Note: 'readonly',
  WebMidi: 'readonly',
  WebAudioFontPlayer: 'readonly',
  webAudioControlsWidgetManager: 'readonly',
  ac: 'readonly',
  _tone_0040_Chaos_sf2_file: 'readonly',
  _tone_0243_JCLive_sf2_file: 'readonly',
  _tone_0321_GeneralUserGS_sf2_file: 'readonly',
}

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'research/**', 'doco/**', 'public/**'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        $: 'readonly',
        jQuery: 'readonly',
        ...cdnGlobals,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'no-constant-condition': 'warn',
      'no-unreachable': 'warn',
      'no-unsafe-negation': 'warn',
      'no-case-declarations': 'warn',
      'no-const-assign': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/require-v-for-key': 'warn',
      'vue/no-use-v-if-with-v-for': 'warn',
    },
  },
  {
    files: ['test/**/*.js', 'src/**/*.spec.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        suite: 'readonly',
      },
    },
  },
  {
    // Vendored third-party library that references browser globals not declared above.
    files: ['src/lib/webaudio-controls.js'],
    rules: {
      'no-undef': 'off',
    },
  },
]
