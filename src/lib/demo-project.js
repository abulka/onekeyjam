// @ts-check

/**
 * @module lib/demo-project
 * @desc The "DEMO" quick-start: loads a progressions project, focuses the on-screen
 * keyboard and shows a short welcome message with a Jam! button.
 */

import { Note } from '@tonaljs/tonal'
import { globals } from './globals.js'
import { loadProgressionProject } from './boot-project.js'
import { labelForOffset } from './midi/piano-key-map.js'

export const DEMO_PROJECT_NAME = 'C Major II-V-I'

let pendingDemo = false
let listenerWired = false
let pendingKeyboardFocus = false

function wireProjectLoadedListener() {
  if (listenerWired)
    return
  listenerWired = true
  document.addEventListener('project-loaded', onProjectLoaded)
}

function onProjectLoaded() {
  if (!pendingDemo)
    return
  pendingDemo = false
  requestKeyboardFocus()
  document.broadcastEvent('show-demo-intro', buildDemoIntro())
}

/**
 * Load the demo project and, once it is ready, focus the keyboard and show the
 * welcome message.
 */
export function loadDemoProject() {
  wireProjectLoadedListener()
  pendingDemo = true
  loadProgressionProject(DEMO_PROJECT_NAME)
  // Fallback: if the project-loaded event never arrives, still show the intro.
  setTimeout(() => {
    if (!pendingDemo)
      return
    pendingDemo = false
    requestKeyboardFocus()
    document.broadcastEvent('show-demo-intro', buildDemoIntro())
  }, 4000)
}

/** Ask the on-screen keyboard to take focus, now or when it next mounts. */
export function requestKeyboardFocus() {
  pendingKeyboardFocus = true
  document.broadcastEvent('focus-keyboard', {})
}

/** True once, if a focus request is still waiting for a keyboard to mount. */
export function consumePendingKeyboardFocus() {
  const value = pendingKeyboardFocus
  pendingKeyboardFocus = false
  return value
}

/**
 * Build the welcome message's dynamic parts from the loaded project: the chord
 * trigger notes, the computer keys that play them, and the solo keys.
 */
export function buildDemoIntro() {
  const lhOctave = globals.keyboard ? globals.keyboard.lhTriggerOctave : 3
  const baseMidi = 12 * (lhOctave + 1)

  const triggers = Object.keys(globals.chordTriggerMap || {}).sort((a, b) => {
    const am = Note.midi(a)
    const bm = Note.midi(b)
    return (am == null ? 0 : am) - (bm == null ? 0 : bm)
  })

  const chordKeys = triggers
    .map(note => {
      const midi = Note.midi(note)
      return typeof midi === 'number' ? labelForOffset(midi - baseMidi) : ''
    })
    .filter(Boolean)

  // Per-trigger legend: which chord and current scale each trigger key plays,
  // so the welcome can explain the project (and call out colour chords such as
  // the C Major demo's Db7 tritone substitute).
  const legend = triggers.map(note => {
    const config = globals.chordTriggerMap[note] || {}
    const midi = Note.midi(note)
    return {
      note,
      key: typeof midi === 'number' ? labelForOffset(midi - baseMidi) : '',
      chord: config.chord || config.name || '',
      scale: config.scale1 || '',
    }
  })

  return {
    projectName: globals.projectLibrary.projectName || DEMO_PROJECT_NAME,
    triggerNotes: triggers.length ? triggers.join(' ') : 'C D E F',
    chordKeys: chordKeys.length ? chordKeys.join(' ') : 'Z X C V',
    soloKeys: 'Q W E R T Y U',
    legend,
  }
}
