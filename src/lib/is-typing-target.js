// @ts-check

/** Input types where the user is entering text, so single-key shortcuts must
 * leave the keystroke alone. Checkboxes, radios, ranges, buttons and selects
 * are not typing targets: the piano should keep playing after you use them. */
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number'])

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
    if (tag === 'textarea')
        return true
    if (element.isContentEditable || element.getAttribute('contenteditable') === 'true')
        return true
    if (tag === 'input') {
        const type = (element.getAttribute('type') || 'text').toLowerCase()
        return TEXT_INPUT_TYPES.has(type)
    }
    return false
}
