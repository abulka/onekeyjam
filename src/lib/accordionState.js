// @ts-check

/**
 * @module lib/accordionState
 * @desc Remembers which Fomantic UI accordion sections are open, across
 * project loads and browser refreshes.
 *
 * Fomantic toggles an `active` class on the `.title` and `.content` elements.
 * Each accordion is restored from browser storage when it mounts, and every
 * open or close is written back. Sections are identified by stable slugs so
 * reordering the page does not attach saved state to the wrong section.
 *
 * Only the direct child sections of the registered root are managed here.
 * Nested accordions register separately with their own name, so every level
 * is remembered.
 */

export const ACCORDION_STORAGE_KEY = 'onekeyjam.accordionState'

/** @type {Map<string, Record<string, boolean>>} */
const snapshots = new Map()

function defaultStorage() {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage
    }
    catch (error) {
        return null
    }
}

/**
 * Turn a section heading into a URL-safe slug.
 * @param {string} text
 * @returns {string}
 */
export function slugifySectionTitle(text) {
    const slug = String(text ?? '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    return slug || 'section'
}

/**
 * The stable key for one title element. An explicit
 * `data-accordion-section` attribute wins; otherwise the visible heading
 * text is slugified.
 * @param {Element} title
 * @returns {string}
 */
export function sectionKeyFor(title) {
    const explicit = (title.getAttribute && title.getAttribute('data-accordion-section')) || ''
    const trimmed = explicit.trim()
    if (trimmed)
        return trimmed
    return slugifySectionTitle(title.textContent ?? '')
}

/**
 * Direct child `.title` elements of the accordion root, in document order.
 * Nested accordions live inside a `.content` child, so they are excluded
 * here and register on their own instead.
 * @param {Element} root
 * @returns {Element[]}
 */
function directTitleElements(root) {
    return Array.from(root.children).filter(
        (child) => child instanceof Element && child.classList.contains('title'),
    )
}

/**
 * Unique slugs for the direct titles, in order. Duplicates get a numeric
 * suffix so two sections never share one entry.
 * @param {Element} root
 * @returns {{ titles: Element[], slugs: string[] }}
 */
function titledSections(root) {
    const titles = directTitleElements(root)
    /** @type {Record<string, number>} */
    const seen = {}
    const slugs = titles.map((title) => {
        const base = sectionKeyFor(title)
        seen[base] = (seen[base] ?? 0) + 1
        return seen[base] > 1 ? `${base}-${seen[base]}` : base
    })
    return { titles, slugs }
}

/**
 * The `.content` that belongs to a `.title`, if it is the next sibling.
 * @param {Element} title
 * @returns {Element|null}
 */
function contentFor(title) {
    const content = title.nextElementSibling
    return content && content instanceof Element && content.classList.contains('content')
        ? content
        : null
}

/**
 * @param {Element} root
 * @returns {Record<string, boolean>}
 */
function snapshot(root) {
    /** @type {Record<string, boolean>} */
    const state = {}
    const { titles, slugs } = titledSections(root)
    titles.forEach((title, index) => {
        state[slugs[index]] = title.classList.contains('active')
    })
    return state
}

/**
 * Apply saved state. Sections missing from the saved state keep whatever
 * the markup gave them, so newly added sections open with their default.
 * @param {Element} root
 * @param {Record<string, boolean>} saved
 */
function apply(root, saved) {
    if (!saved || typeof saved !== 'object')
        return
    const { titles, slugs } = titledSections(root)
    titles.forEach((title, index) => {
        const slug = slugs[index]
        if (!(slug in saved))
            return
        const isActive = saved[slug] === true
        title.classList.toggle('active', isActive)
        const content = contentFor(title)
        if (content)
            content.classList.toggle('active', isActive)
    })
}

/**
 * @param {*} value
 * @returns {value is Record<string, boolean>}
 */
function isSectionMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false
    return Object.values(value).every((entry) => typeof entry === 'boolean')
}

/**
 * Read and validate the whole stored accordion map.
 * @param {Storage|null} [storage]
 * @returns {Record<string, Record<string, boolean>>}
 */
export function readAccordionState(storage = defaultStorage()) {
    if (!storage)
        return {}
    try {
        const raw = storage.getItem(ACCORDION_STORAGE_KEY)
        if (!raw)
            return {}
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            return {}
        /** @type {Record<string, Record<string, boolean>>} */
        const state = {}
        for (const [name, sections] of Object.entries(parsed)) {
            if (isSectionMap(sections))
                state[name] = { ...sections }
        }
        return state
    }
    catch (error) {
        return {}
    }
}

/**
 * @param {Record<string, Record<string, boolean>>} state
 * @param {Storage|null} [storage]
 */
export function writeAccordionState(state, storage = defaultStorage()) {
    if (!storage)
        return
    try {
        storage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(state ?? {}))
    }
    catch (error) {
        // ignore storage errors (private mode, quota, etc.)
    }
}

/**
 * @param {Record<string, boolean>} a
 * @param {Record<string, boolean>} b
 * @returns {boolean}
 */
function statesEqual(a, b) {
    const keysA = Object.keys(a ?? {})
    const keysB = Object.keys(b ?? {})
    if (keysA.length !== keysB.length)
        return false
    return keysA.every((key) => a[key] === b[key])
}

/**
 * Restores the remembered open/closed state for an accordion and keeps it up
 * to date as sections are opened and closed. Call in `onMounted` before
 * initialising the Fomantic accordion. State survives project loads (the
 * views stay mounted) and browser refreshes (it is kept in localStorage).
 * @param {Element|null|undefined} root
 * @param {string} name Stable name for this accordion, unique across the app.
 * @param {Storage|null} [storage] Override for tests.
 * @returns {() => void} Cleanup that stops observing and flushes pending writes.
 */
export function registerAccordion(root, name, storage = defaultStorage()) {
    if (!root || typeof window === 'undefined' || !name)
        return () => {}
    const saved = readAccordionState(storage)[name] ?? snapshots.get(name)
    if (saved)
        apply(root, saved)
    snapshots.set(name, snapshot(root))

    /** @type {ReturnType<typeof setTimeout>|null} */
    let timer = null
    const persist = () => {
        const next = snapshot(root)
        snapshots.set(name, next)
        if (!storage)
            return
        const all = readAccordionState(storage)
        if (all[name] && statesEqual(all[name], next))
            return
        all[name] = next
        writeAccordionState(all, storage)
    }
    const schedulePersist = () => {
        if (timer)
            clearTimeout(timer)
        timer = setTimeout(() => {
            timer = null
            persist()
        }, 100)
    }

    const observer = new MutationObserver(schedulePersist)
    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] })

    return () => {
        observer.disconnect()
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        persist()
    }
}

/**
 * Forget the remembered state, mainly for tests.
 * @param {Storage|null} [storage]
 */
export function clearAccordionState(storage = defaultStorage()) {
    snapshots.clear()
    if (!storage)
        return
    try {
        storage.removeItem(ACCORDION_STORAGE_KEY)
    }
    catch (error) {
        // ignore storage errors
    }
}
