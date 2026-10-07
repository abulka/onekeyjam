// @ts-check
import { DEFINITIONS } from './rock-project-definitions.mjs'
import { generateStaticLibrary } from './generate-static-library.mjs'

/*
 * Generates the rock project library in public/projects/rock.
 *
 * Run: node bin/generate-rock-projects.mjs
 */

generateStaticLibrary(DEFINITIONS, 'rock', 'rock')
