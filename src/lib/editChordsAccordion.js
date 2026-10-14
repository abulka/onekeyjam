// @ts-check

/**
 * @module lib/editChordsAccordion
 * @desc Open and close the Edit Chords accordion section in the main view.
 *
 * The chord inspector lives inside that one section. The grid's edit pencil
 * opens it; the inspector's Cancel button closes it again. Fomantic owns the
 * animation and the `active` classes, so both actions run through jQuery here.
 * On the Perform and Settings pages the section does not exist, so every
 * function is a safe no-op there.
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
