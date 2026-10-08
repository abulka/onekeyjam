// @ts-check

/**
 * @module lib/keyboard-size
 * @desc Pixel-width maths for the on-screen performance keyboard.
 *
 * The keyboard squeezes its keys to fit the available width up to a chosen
 * octave limit, then keeps its 2-octave key size and grows wider instead, so
 * the extra notes are reached by scrolling.
 */

/** Octave count whose key size is kept once the keyboard starts scrolling. */
export const SCROLL_REFERENCE_OCTAVES = 2

/**
 * Number of white keys shown for an octave count. Each octave adds seven
 * white keys, plus the top C that ends the widget range.
 * @param {number} octaves
 * @returns {number}
 */
export function whiteKeysForOctaves(octaves) {
  return 7 * octaves + 1
}

/**
 * Work out the keyboard pixel width.
 * @param {number} available visible width in pixels
 * @param {number} octaves shown octave count
 * @param {number} fitOctaves fit up to this many octaves, scroll beyond it
 * @param {{ small?: number, large?: number }} [limits] clamp for the fitted width
 * @returns {number}
 */
export function computeKeyboardWidth(available, octaves, fitOctaves, limits = {}) {
  const small = limits.small ?? 710
  const large = limits.large ?? 1130
  const fitWidth = Math.max(small, Math.min(large, available || 0))
  if (!Number.isFinite(octaves) || !Number.isFinite(fitOctaves) || octaves <= fitOctaves)
    return fitWidth
  return Math.round(fitWidth * whiteKeysForOctaves(octaves) / whiteKeysForOctaves(SCROLL_REFERENCE_OCTAVES))
}
