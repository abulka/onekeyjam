// @ts-check

/**
 * @module lib/sequencer-playhead
 * @desc Pure maths for the piano-roll playhead overlay: converting between
 * widget ticks and horizontal pixels so the playhead line can be drawn and
 * dragged. Kept free of Vue and the DOM so it can be unit tested on its own.
 *
 * The widget lays time out as `x = (tick - xoffset) * step + yruler + kbwidth`
 * where `step = swidth / xrange`. All tick values here are widget ticks
 * (not bars); callers multiply bars by the timebase first.
 */

/**
 * Horizontal geometry of the time area.
 * @typedef {object} PlayheadGeometry
 * @property {number} xoffsetTicks left edge in ticks
 * @property {number} xrangeTicks visible width in ticks
 * @property {number} swidth time-area width in pixels
 * @property {number} yruler left ruler width in pixels
 * @property {number} kbwidth piano-strip width in pixels
 */

/**
 * Pixel x of a tick, measured from the left of the widget/canvas.
 * @param {number} tick
 * @param {PlayheadGeometry} geo
 * @returns {number}
 */
export function tickToX(tick, geo) {
  const step = geo.swidth / geo.xrangeTicks
  return (tick - geo.xoffsetTicks) * step + geo.yruler + geo.kbwidth
}

/**
 * Tick for a pixel x, rounded to the nearest whole tick and clamped at zero.
 * The widget never shows a negative cursor, and its own drag does the same.
 * @param {number} xPx pixel x from the left of the widget/canvas
 * @param {PlayheadGeometry} geo
 * @returns {number}
 */
export function xToTick(xPx, geo) {
  const step = geo.swidth / geo.xrangeTicks
  if (!Number.isFinite(step) || step <= 0)
    return 0
  return Math.max(0, Math.round(geo.xoffsetTicks + (xPx - geo.yruler - geo.kbwidth) / step))
}

/**
 * Whether a tick is currently visible in the time area.
 * @param {number} tick
 * @param {PlayheadGeometry} geo
 * @returns {boolean}
 */
export function isTickVisible(tick, geo) {
  const x = tickToX(tick, geo)
  const left = geo.yruler + geo.kbwidth
  return x >= left && x <= left + geo.swidth
}

/**
 * Where playback should start when Play is pressed with the head parked at
 * `cursor`: the head itself, unless it sits at or past the loop end, when
 * playback restarts at the loop start (mirroring how take playback restarts
 * at zero when already at the end). Pure, so the transport can be tested.
 * @param {number} cursor
 * @param {number} loopStart
 * @param {number} loopEnd
 * @returns {number}
 */
export function resolveResumeTick(cursor, loopStart, loopEnd) {
  const start = Number.isFinite(Number(loopStart)) ? Math.max(0, Number(loopStart)) : 0
  const end = Number(loopEnd)
  const pos = Number.isFinite(Number(cursor)) ? Math.max(0, Number(cursor)) : 0
  if (Number.isFinite(end) && pos >= end - 1e-6)
    return start
  return pos
}
