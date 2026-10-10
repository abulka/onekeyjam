// @ts-check
import { globals } from '../globals.js'
import { changeScaleFilter, toggleSoloMode, pickManualScaleFilter } from '../change-scale.js'
import { isTypingTarget } from '../is-typing-target.js'

/*
 * Computer-keyboard shortcuts for switching the right-hand scale filter:
 * 1 = scale1, 2 = scale2, 3 = scale3, 4 = notes of chord, 5 = lock/unlock,
 * 0 = toggle Solo in key.
 *
 * The freed lower-row punctuation keys have their own jobs:
 *   /  add the jammed chord (works in both magic and normal piano mode)
 *   ,  switch to magic mode
 *   .  switch to normal piano mode
 *
 * These work on every page and every octave and do not need the on-screen
 * keyboard to be focused. They mirror the right-hand black-key modifiers in
 * wire-events.js. Number keys are ignored while typing in a form field.
 */

/** @type {Array<'scale1'|'scale2'|'scale3'|'notesOfChord'>} */
const SCALE_FILTERS = ['scale1', 'scale2', 'scale3', 'notesOfChord']

/** @param {KeyboardEvent} e */
function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat)
        return
    if (isTypingTarget(e.target))
        return

    // The repurposed lower-row keys work in every mode, so handle them before
    // the magic-mode-only scale shortcuts below.
    if (!e.shiftKey && e.code === 'Slash') {
        e.preventDefault()
        document.broadcastEvent('chord-add', {})
        return
    }
    if (!e.shiftKey && e.code === 'Comma') {
        e.preventDefault()
        globals.bypass = false  // magic mode
        return
    }
    if (!e.shiftKey && e.code === 'Period') {
        e.preventDefault()
        globals.bypass = true  // normal piano mode
        return
    }

    // The number keys are only scale shortcuts in magic mode. In normal piano
    // mode scale filtering is off, and digits should do nothing.
    if (!globals.scaleFilteringEnabled)
        return
    if (!e.code || !e.code.startsWith('Digit'))
        return
    const digit = Number(e.code.slice(5))
    if (digit >= 1 && digit <= 4) {
        e.preventDefault()
        pickManualScaleFilter(SCALE_FILTERS[digit - 1])
    }
    else if (digit === 5) {
        e.preventDefault()
        globals.scaleFiltering.frozen = !globals.scaleFiltering.frozen
        changeScaleFilter()
    }
    else if (digit === 0) {
        e.preventDefault()
        globals.scaleFiltering.frozen = false
        toggleSoloMode()
    }
}

let wired = false

export function wireScaleFilterShortcuts() {
    if (wired)
        return
    wired = true
    window.addEventListener('keydown', onKeyDown)
}
