// @ts-check
/**
 * @module lib/auditionHover
 * @desc Shared memory of the audition preview the pointer is still over.
 *
 * Browse chords, Transpose & invert buttons, and grid speaker buttons all
 * preview through the same fake trigger. Holding backquote plays the draft,
 * and releasing it should hand sound back to whatever preview is still
 * hovered, no matter which component started it. A local ref inside
 * ChordInspector cannot see grid hovers, so this module holds it instead.
 */

let hovered = null

function notesMatch(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b))
    return false
  if (a.length !== b.length)
    return false
  return a.every((note, index) => note === b[index])
}

/**
 * Remember the preview currently under the pointer.
 * @param {string[]} notes notes with octaves
 * @param {string} bass raw bass value (may be empty)
 */
export function rememberHover(notes, bass) {
  if (!Array.isArray(notes) || notes.length === 0) {
    hovered = null
    return
  }
  hovered = { notes: [...notes], bass: bass || '' }
}

/**
 * Clear the remembered preview when the pointer leaves. Only clears when the
 * leaving preview matches, so moving fast across buttons keeps the newest.
 * @param {string[]} [notes] notes of the leaving preview, if known
 */
export function forgetHover(notes) {
  if (!Array.isArray(notes)) {
    hovered = null
    return
  }
  if (hovered && notesMatch(hovered.notes, notes))
    hovered = null
}

/** The preview still hovered, or null. Returns a copy. */
export function getHoveredPreview() {
  if (!hovered || !Array.isArray(hovered.notes) || hovered.notes.length === 0)
    return null
  return { notes: [...hovered.notes], bass: hovered.bass || '' }
}

/** Clear unconditionally, for tests. */
export function clearHoveredPreview() {
  hovered = null
}
