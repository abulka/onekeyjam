// @ts-check
import { MULTI_KEY_DEFINITIONS } from './multi-key-project-definitions.mjs'
import { generateStaticLibrary } from './generate-static-library.mjs'

/*
 * Generates the multi-key project library in public/projects/multi-key. Each
 * song changes key, so its chords carry section keys and the generator ranks
 * each chord's scales in its own key. See doco/MULTI-KEY.md.
 *
 * Run: node bin/generate-multi-key-projects.mjs
 */

generateStaticLibrary(MULTI_KEY_DEFINITIONS, 'multi-key', 'multi-key')
