// @ts-check

/**
 * @module lib/editChordsAccordion
 * @desc Open and close the Edit Chords accordion section in the main view, and
 * report whether it is open.
 *
 * The chord inspector lives inside that one section. The grid's edit pencil
 * opens it; the inspector's Cancel button closes it again. Fomantic owns the
 * animation and the `active` classes, so both actions run through jQuery here.
 * The open state is read from those classes, because the user can also close
 * the panel by clicking its header, which goes through no code of ours. On the
 * Perform and Settings pages the section does not exist, so the open and close
 * functions are safe no-ops and the section reads as closed.
 */

const EDIT_CHORDS_SECTION = 'edit-chords'

/**
 * The Edit Chords section's title, its accordion root and the section index, or
 * null when the section is not on the page.
 * @returns {{ title: Element, accordion: Element, index: number } | null}
 */
function findEditChordsSection() {
  if (typeof document === 'undefined')
    return null
  const title = document.querySelector(`[data-accordion-section="${EDIT_CHORDS_SECTION}"]`)
  if (!title)
    return null
  const accordion = title.closest('.ui.accordion')
  if (!accordion)
    return null
  const index = Array.from(accordion.children)
    .filter((child) => child.classList.contains('title'))
    .indexOf(title)
  if (index < 0)
    return null
  return { title, accordion, index }
}

/** True when Fomantic's jQuery plugin is available to drive the accordion. */
function hasJQuery() {
  return typeof $ === 'function'
}

/**
 * Open the Edit Chords section and bring it into view when it is off screen.
 * A tall grid can push the panel below the fold, so a click in the grid that
 * opens it should also reveal it.
 */
export function openEditChordsAccordion() {
  const found = findEditChordsSection()
  if (!found || !hasJQuery())
    return
  const { title, accordion, index } = found
  $(accordion).accordion('open', index)
  const rect = title.getBoundingClientRect()
  if (rect.top < 0 || rect.top > window.innerHeight)
    title.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Close the Edit Chords section, leaving the draft where it is.
 * @returns {boolean} true when the section was closed
 */
export function closeEditChordsAccordion() {
  const found = findEditChordsSection()
  if (!found || !hasJQuery())
    return false
  $(found.accordion).accordion('close', found.index)
  return true
}

/**
 * Watch whether the Edit Chords section is open. The callback is called at once
 * with the current state, then on every open or close, including a click on the
 * accordion header, which no code of ours goes through. A missing section (the
 * Perform and Settings pages) reads as closed.
 * @param {(isOpen: boolean) => void} callback
 * @returns {() => void} stop watching
 */
export function observeEditChordsOpen(callback) {
  const found = findEditChordsSection()
  if (!found || typeof MutationObserver === 'undefined') {
    callback(false)
    return () => {}
  }
  const report = () => callback(found.title.classList.contains('active'))
  report()
  const observer = new MutationObserver(report)
  observer.observe(found.title, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
