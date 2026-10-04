// @ts-check

/*
 * Help shortcuts. The Tab key toggles between the Edit page and the Help page,
 * so you can read a topic, try it on the Edit page, and tab back without losing
 * your place (the router restores the scroll position; see scrollMemory.js).
 * Tab is left alone while typing in a form control.
 */

/** @param {EventTarget|null} target */
function isTypingTarget(target) {
    if (!target || !(/** @type {HTMLElement} */ (target)).tagName)
        return false
    const element = /** @type {HTMLElement} */ (target)
    const tag = element.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable
}

let wired = false

/**
 * @param {*} router the vue-router instance
 */
export function wireHelpShortcuts(router) {
    if (wired)
        return
    wired = true
    window.addEventListener('keydown', (event) => {
        const e = /** @type {KeyboardEvent} */ (event)
        if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)
            return
        if (isTypingTarget(e.target))
            return
        e.preventDefault()
        const current = router.currentRoute.value.path
        router.push(current === '/about' ? '/' : '/about')
    })
}
