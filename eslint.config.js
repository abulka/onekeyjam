import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

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
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-useless-assignment': 'off',
      'no-constant-condition': 'warn',
      'no-unreachable': 'warn',
      'no-unsafe-negation': 'error',
      'no-case-declarations': 'warn',
      'no-const-assign': 'error',
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
]
