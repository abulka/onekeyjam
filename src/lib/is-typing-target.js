// @ts-check

/**
 * True when focus is in a form control where the user is typing text, so
 * global single-key shortcuts should leave the keystroke alone.
 * @param {EventTarget|null} target
 */
export function isTypingTarget(target) {
    if (!target || !(/** @type {HTMLElement} */ (target)).tagName)
        return false
    const element = /** @type {HTMLElement} */ (target)
    const tag = element.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable
}
