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
 *
 * A preview whose target depends on the draft (a transpose, or a speaker that
 * shows the draft) can move after the pointer entered without a new
 * mouseenter to refresh it. Those callers pass a resolver, and the resume asks
 * it for the current answer instead of replaying the notes seen on entry.
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
 * The preview the pointer is over, resolved from the current draft when the
 * caller supplied a resolver. Returns a fresh copy, or null when there is
 * nothing playable.
 * @returns {{ notes: string[], bass: string } | null}
 */
function currentPreview() {
  if (!hovered)
    return null
  if (typeof hovered.resolve === 'function') {
    let fresh
    try {
      fresh = hovered.resolve()
    }
    catch {
      return null
    }
    if (!fresh || !Array.isArray(fresh.notes) || fresh.notes.length === 0)
      return null
    return { notes: [...fresh.notes], bass: fresh.bass || '' }
  }
  if (!Array.isArray(hovered.notes) || hovered.notes.length === 0)
    return null
  return { notes: [...hovered.notes], bass: hovered.bass || '' }
}

/**
 * Remember the preview currently under the pointer.
 * @param {string[]} notes notes with octaves
 * @param {string} bass raw bass value (may be empty)
 * @param {() => ({ notes: string[], bass: string } | null)} [resolve] recomputes
 *   the preview from the current draft; omit for previews that never change
 */
export function rememberHover(notes, bass, resolve) {
  if (!Array.isArray(notes) || notes.length === 0) {
    hovered = null
    return
  }
  hovered = {
    notes: [...notes],
    bass: bass || '',
    resolve: typeof resolve === 'function' ? resolve : null,
  }
}

/**
 * Clear the remembered preview when the pointer leaves. Only clears when the
 * leaving preview matches, so moving fast across buttons keeps the newest. A
 * draft-dependent preview may have moved since entry, so the freshly resolved
 * notes are compared as well; otherwise the memory would linger after a draft
 * change.
 * @param {string[]} [notes] notes of the leaving preview, if known
 */
export function forgetHover(notes) {
  if (!Array.isArray(notes)) {
    hovered = null
    return
  }
  if (!hovered)
    return
  if (notesMatch(hovered.notes, notes)) {
    hovered = null
    return
  }
  const fresh = currentPreview()
  if (fresh && notesMatch(fresh.notes, notes))
    hovered = null
}

/** The preview still hovered, resolved against the current draft. Returns a copy. */
export function getHoveredPreview() {
  return currentPreview()
}

/** Clear unconditionally, for tests. */
export function clearHoveredPreview() {
  hovered = null
}
