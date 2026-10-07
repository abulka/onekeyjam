// @ts-check
import { globals } from './globals.js'
import { audioContext } from './audio/general-midi.js'
import { patternOnNote, clearPatternTimers, resetLiveCounts } from './pattern-playback.js'
import { noteSequencerStarted, noteSequencerStopped } from './pattern-snapshot.js'

/**
 * @module lib/pattern-player
 * @desc A headless pattern sequencer, so a song's chord sequence can be
 * played from any page. It owns an off-screen `webaudio-pianoroll` element and
 * reuses the same per-note callback as the on-screen Sequencer. When the
 * Sequencer is mounted (the Perform page) the shared controller drives that
 * instead, so the piano roll shows the play cursor.
 */

const PANEL_TIMEBASE = 16

/** @type {any} */
let panel = null
let playing = false

/** The off-screen widget, created on first use. */
function getPanel() {
  if (panel)
    return panel
  panel = document.createElement('webaudio-pianoroll')
  panel.style.position = 'absolute'
  panel.style.left = '-10000px'
  panel.style.width = '1px'
  panel.style.height = '1px'
  panel.style.opacity = '0'
  panel.style.pointerEvents = 'none'
  document.body.appendChild(panel)
  return panel
}

/** The currently selected chord sequence entry, or null. */
export function currentSequenceEntry() {
  const sequences = globals.project && globals.project.chordSequences
  if (!sequences)
    return null
  const name = globals.currentChordSequenceName || 'default'
  return sequences[name] || sequences.default || null
}

/** True when the selected sequence has pattern notes. */
export function playerHasNotes() {
  const entry = currentSequenceEntry()
  return !!(entry && typeof entry.mml === 'string' && entry.mml.trim().length > 0)
}

export function playerIsPlaying() {
  return playing
}

export function playerPlay() {
  const entry = currentSequenceEntry()
  if (!entry || !entry.mml)
    return
  if (audioContext && audioContext.state === 'suspended' && typeof audioContext.resume === 'function')
    audioContext.resume()
  const el = getPanel()
  if (typeof el.setMMLString !== 'function') {
    // The vendor widget is not defined (for example in a test environment).
    return
  }
  el.timebase = PANEL_TIMEBASE
  el.octadj = -1
  el.setMMLString(entry.mml)
  // The panel's tempo wins, so playback follows the app's global BPM.
  el.tempo = globals.recording.bpm
  const start = Number.isFinite(entry.markstart) ? entry.markstart : 0
  const end = Number.isFinite(entry.markend) && entry.markend > start ? entry.markend : start + PANEL_TIMEBASE * 4
  el.markstart = start
  el.markend = end
  clearPatternTimers()
  resetLiveCounts()
  el.play(audioContext, patternOnNote, 0)
  playing = true
  noteSequencerStarted()
}

export function playerStop() {
  if (panel && typeof panel.stop === 'function')
    panel.stop()
  playing = false
  clearPatternTimers()
  resetLiveCounts()
  noteSequencerStopped()
}
