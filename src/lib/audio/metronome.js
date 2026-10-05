// @ts-check
import { globals } from '../globals.js'
import { audioContext } from './general-midi.js'
import { getPlaybackClock } from '../midi/playback.js'

/**
 * @module lib/audio/metronome
 * @desc A click track that follows the recorded take's playback rather than
 * running free. When the Recording Sequencer plays, the clicks line up with the
 * take's beat grid (accenting the first beat of each 4/4 bar) at the app-wide
 * BPM. While the take is not playing, the metronome is silent.
 */

const LOOKAHEAD_SEC = 0.1
const INTERVAL_MS = 25
const BEATS_PER_BAR = 4

/** @type {ReturnType<typeof setInterval>|null} */
let timer = null
// The playback clock this run is aligned to, so a start or seek re-syncs.
let syncBaseTime = null
let syncOffsetSec = null
let syncedBpm = 0
let nextBeatTime = 0
let nextBeatIndex = 0

/**
 * @param {number} time audio-context time
 * @param {boolean} accent first beat of the bar
 */
function click(time, accent) {
  const ctx = audioContext
  if (!ctx)
    return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = accent ? 1600 : 1000
  const level = accent ? 0.32 : 0.2
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(level, time + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.06)
}

/** Align the beat counter to the playback clock. */
function syncTo(baseTime, offsetSec) {
  const bpm = Number(globals.recording.bpm) || 120
  const beatSec = 60 / bpm
  const firstBeat = Math.ceil(offsetSec / beatSec - 1e-9)
  syncBaseTime = baseTime
  syncOffsetSec = offsetSec
  syncedBpm = bpm
  nextBeatIndex = firstBeat
  nextBeatTime = baseTime + (firstBeat * beatSec - offsetSec)
}

function schedule() {
  const ctx = audioContext
  if (!ctx || !globals.metronomeEnabled)
    return
  const clock = getPlaybackClock()
  if (!clock.isPlaying) {
    // Re-sync the next time playback starts.
    syncBaseTime = null
    return
  }
  if (syncBaseTime === null || clock.baseTime !== syncBaseTime || clock.offsetSec !== syncOffsetSec
    || (Number(globals.recording.bpm) || 120) !== syncedBpm) {
    syncTo(clock.baseTime, clock.offsetSec)
  }
  const beatSec = 60 / syncedBpm
  while (nextBeatTime < ctx.currentTime + LOOKAHEAD_SEC) {
    const at = Math.max(nextBeatTime, ctx.currentTime + 0.01)
    click(at, nextBeatIndex % BEATS_PER_BAR === 0)
    nextBeatIndex += 1
    nextBeatTime += beatSec
  }
}

export function startMetronome() {
  if (timer !== null)
    return
  if (audioContext && audioContext.state === 'suspended' && typeof audioContext.resume === 'function')
    audioContext.resume()
  syncBaseTime = null
  schedule()
  timer = setInterval(schedule, INTERVAL_MS)
}

export function stopMetronome() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
  syncBaseTime = null
}

/** @param {boolean} enabled */
export function setMetronomeEnabled(enabled) {
  globals.metronomeEnabled = !!enabled
  if (globals.metronomeEnabled)
    startMetronome()
  else
    stopMetronome()
}
