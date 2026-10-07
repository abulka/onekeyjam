// @ts-check
import { DEFINITIONS } from './classic-project-definitions.mjs'
import { generateStaticLibrary } from './generate-static-library.mjs'

/*
 * Generates the classic project library in public/projects/classic. Each
 * song excerpt becomes a project with standard voicings (via the chord
 * symbol, which the app expands on load), an explicit project key and
 * colour, and key-aware engine-chosen scale1/2/3.
 *
 * Run: node bin/generate-classic-projects.mjs
 */

generateStaticLibrary(DEFINITIONS, 'classic', 'classic')
