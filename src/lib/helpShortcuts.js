// @ts-check

/*
 * Page navigation shortcuts. The Tab key toggles between the Edit page and the
 * Perform page, and Shift+Tab toggles between the current page and the Help
 * page. Scroll positions are restored by the router (see scrollMemory.js).
 * Both shortcuts are left alone while typing in a form control.
 */

import { isTypingTarget } from './is-typing-target.js'

export const EDIT_PATH = '/'
export const PERFORM_PATH = '/perform'
export const HELP_PATH = '/about'

let wired = false
// The most recent page that is not Help, so Shift+Tab from Help can return to
// it. Defaults to Edit for direct deep links to the Help page.
let previousNonHelpPath = EDIT_PATH

/**
 * Where a Tab or Shift+Tab press should navigate, or null when the keypress
 * keeps its native behaviour (for example plain Tab outside Edit and Perform).
 * @param {string} currentPath
 * @param {boolean} shiftKey true for Shift+Tab, false for plain Tab
 * @param {string} [previousNonHelp] page to return to from Help
 * @returns {string|null}
 */
export function resolveTabRoute(currentPath, shiftKey, previousNonHelp = EDIT_PATH) {
    if (shiftKey) {
        if (currentPath === HELP_PATH)
            return previousNonHelp || EDIT_PATH
        return HELP_PATH
    }
    if (currentPath === EDIT_PATH)
        return PERFORM_PATH
    if (currentPath === PERFORM_PATH)
        return EDIT_PATH
    return null
}

/**
 * True when a keydown event is a Tab navigation press. Control, Meta and Alt
 * combinations are left alone (for example browser tab switching), as is
 * typing in a form control.
 * @param {KeyboardEvent} e
 * @returns {boolean}
 */
export function isTabNavigationEvent(e) {
    if (!e || e.key !== 'Tab')
        return false
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey)
        return false
    if (isTypingTarget(/** @type {EventTarget|null} */ (e.target)))
        return false
    return true
}

/**
 * @param {*} router the vue-router instance
 */
export function wireHelpShortcuts(router) {
    if (wired)
        return
    wired = true
    // Remember the current page before each navigation, so Shift+Tab from Help
    // returns to where the user came from rather than always to Edit.
    router.beforeEach((to) => {
        if (to && to.path !== HELP_PATH)
            previousNonHelpPath = to.path
    })
    window.addEventListener('keydown', (event) => {
        const e = /** @type {KeyboardEvent} */ (event)
        if (!isTabNavigationEvent(e))
            return
        const target = resolveTabRoute(router.currentRoute.value.path, e.shiftKey, previousNonHelpPath)
        if (!target)
            return
        e.preventDefault()
        router.push(target)
    })
}
