// @ts-check
import { reactive, watch } from 'vue'
import { globals } from './globals.js'
import { playerPlay, playerStop, playerHasNotes, playerIsPlaying } from './pattern-player.js'

/**
 * @module lib/sequencer-control
 * @desc Shared control surface for the pattern sequencer. The always-visible
 * transport needs to drive the Sequencer component, which lives inside the
 * Perform page, without reaching through the component tree. The Sequencer
 * registers its actions here on mount and clears them on unmount; on other
 * pages the controller falls back to the headless pattern player, so a song's
 * sequence can be heard anywhere.
 */

/** @typedef {{ toggle: () => void, play: () => void, stop: () => void, selectSequence: (name: string) => void }} SequencerActions */

/** @type {SequencerActions|null} */
let current = null

function call(method, ...args) {
    const actions = /** @type {Record<string, Function>|null} */ (current)
    if (actions && typeof actions[method] === 'function')
        actions[method](...args)
}

/** Reflect the headless player's state while no Sequencer component is mounted. */
function syncFromPlayer() {
    sequencerControl.isPlaying = playerIsPlaying()
    sequencerControl.hasNotes = playerHasNotes()
}

export const sequencerControl = reactive({
    /** True while a Sequencer component is mounted and can be driven. */
    available: false,
    /** Mirrors the sequencer's playback state. */
    isPlaying: false,
    /** True when the loaded pattern has at least one note. */
    hasNotes: false,
    toggle() {
        if (current) {
            call('toggle')
            return
        }
        if (playerIsPlaying())
            playerStop()
        else
            playerPlay()
        syncFromPlayer()
    },
    play() {
        if (current) {
            call('play')
            return
        }
        playerPlay()
        syncFromPlayer()
    },
    stop() {
        if (current) {
            call('stop')
            return
        }
        playerStop()
        syncFromPlayer()
    },
    selectSequence(name) {
        if (current) {
            call('selectSequence', name)
            return
        }
        if (!name || name === globals.currentChordSequenceName)
            return
        const wasPlaying = playerIsPlaying()
        playerStop()
        globals.currentChordSequenceName = name
        if (wasPlaying)
            playerPlay()
        syncFromPlayer()
    },
})

/**
 * Register the Sequencer's actions. Called on mount. Any headless playback is
 * stopped so the on-screen panel takes over.
 * @param {SequencerActions} actions
 */
export function registerSequencer(actions) {
    if (playerIsPlaying())
        playerStop()
    current = actions
    sequencerControl.available = true
}

/** Clear the registered actions. Called on unmount. */
export function unregisterSequencer() {
    current = null
    sequencerControl.available = false
    syncFromPlayer()
}

// Keep the fallback transport's state in step with the project when no
// Sequencer component is mounted.
watch(
    () => [globals.project.chordSequences, globals.currentChordSequenceName],
    () => {
        if (!current)
            syncFromPlayer()
    },
    { deep: true },
)

// A newly loaded project stops any headless playback, so the old song does not
// keep sounding while the new one loads.
if (typeof document !== 'undefined') {
    document.addEventListener('project-loaded', () => {
        if (!current && playerIsPlaying())
            playerStop()
        if (!current)
            syncFromPlayer()
    })
}

/**
 * The named sequences of the current project, for the sequence pickers.
 * @returns {Array<{ name: string, label: string }>}
 */
export function sequenceOptions() {
    const map = (globals.project && globals.project.chordSequences) || {}
    return Object.keys(map).map((name) => ({
        name,
        label: (map[name] && map[name].label) || name,
    }))
}

/**
 * The sequence to load first for the current project: the remembered name when
 * it still exists, otherwise `default`, otherwise the first available.
 * @param {string} [remembered]
 * @returns {string}
 */
export function resolveSequenceName(remembered) {
    const names = sequenceOptions().map((option) => option.name)
    if (remembered && names.includes(remembered))
        return remembered
    if (names.includes('default'))
        return 'default'
    return names[0] || 'default'
}
