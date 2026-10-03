// @ts-check

/**
 * @module lib/accordionState
 * @desc Remembers which Fomantic UI accordion sections are open for the current
 * page, so navigating away to another view and back restores them.
 *
 * Fomantic toggles an `active` class on the `.title` and `.content` elements.
 * We snapshot the active state of every `.title` in the accordion subtree
 * (including nested accordions) and re-apply it the next time the page mounts.
 * State is kept in memory only, so it lasts for the session and resets on a full
 * page reload.
 */

/** @type {Map<string, boolean[]>} */
const snapshots = new Map()

/**
 * All `.title` elements inside the accordion, in document order. Nested
 * accordions are included so their sections are remembered too.
 * @param {Element} root
 * @returns {Element[]}
 */
function titleElements(root) {
    return Array.from(root.querySelectorAll('.title'))
}

/**
 * The `.content` that belongs to a `.title`, if it is the next sibling.
 * @param {Element} title
 * @returns {Element|null}
 */
function contentFor(title) {
    const content = title.nextElementSibling
    return content && content.classList.contains('content') ? content : null
}

/**
 * @param {Element} root
 * @returns {boolean[]}
 */
function snapshot(root) {
    return titleElements(root).map(title => title.classList.contains('active'))
}

/**
 * @param {Element} root
 * @param {boolean[]} active
 */
function apply(root, active) {
    titleElements(root).forEach((title, index) => {
        const isActive = active[index] === true
        title.classList.toggle('active', isActive)
        const content = contentFor(title)
        if (content)
            content.classList.toggle('active', isActive)
    })
}

/**
 * Restores the remembered open/closed state for an accordion and keeps it up to
 * date as sections are opened and closed. Call in `onMounted` before
 * initialising the Fomantic accordion.
 * @param {Element|null|undefined} root
 * @param {string} name Stable name for this accordion within the page.
 * @returns {() => void} Cleanup that stops observing.
 */
export function registerAccordion(root, name) {
    if (!root || typeof window === 'undefined')
        return () => {}
    const key = `${window.location.pathname}::${name}`
    const saved = snapshots.get(key)
    if (saved)
        apply(root, saved)

    const observer = new MutationObserver(() => {
        snapshots.set(key, snapshot(root))
    })
    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
}
