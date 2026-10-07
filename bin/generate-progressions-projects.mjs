// @ts-check
import { DEFINITIONS } from './progressions-project-definitions.mjs'
import { generateStaticLibrary } from './generate-static-library.mjs'

/*
 * Generates the progressions project library in public/projects/progressions.
 *
 * Run: node bin/generate-progressions-projects.mjs
 */

generateStaticLibrary(DEFINITIONS, 'progressions', 'progression')
