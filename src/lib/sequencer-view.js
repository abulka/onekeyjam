// @ts-check

/**
 * @module lib/sequencer-view
 * @desc Pure maths for the piano-roll wheel gestures and the scroll/zoom
 * sliders. Kept free of Vue and the DOM so the pan/zoom behaviour can be unit
 * tested on its own.
 */

/**
 * Clamp a number to the given inclusive range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
}

const LINE_HEIGHT = 16
const PAGE_HEIGHT = 300

/**
 * Normalise a WheelEvent delta into approximate pixels, so a line- or
 * page-based delta (Firefox) behaves like a pixel-based one (Chrome).
 * @param {number} delta
 * @param {number} [deltaMode] 0 pixels, 1 lines, 2 pages
 * @returns {number}
 */
export function normalizeWheelDelta(delta, deltaMode = 0) {
    const scale = deltaMode === 1 ? LINE_HEIGHT : deltaMode === 2 ? PAGE_HEIGHT : 1
    return delta * scale
}

/**
 * The multiplicative zoom factor for a normalised wheel delta. Scrolling up
 * (negative delta) zooms in (factor below one).
 * @param {number} delta
 * @param {number} [rate]
 * @returns {number}
 */
export function zoomFactor(delta, rate = 0.0018) {
    return Math.exp(delta * rate)
}

/**
 * Zoom one axis around a fixed anchor. For the horizontal axis `offset` and
 * `range` are bars; for the vertical axis they are rows. `anchor` is the
 * fraction of the viewport to hold still, measured from the low end of the
 * axis (left for time, bottom for rows).
 * @param {{ range:number, offset:number, min:number, max:number, offsetMin:number, offsetMax:number, factor:number, anchor:number }} opts
 * @returns {{ range:number, offset:number }}
 */
export function zoomAxis(opts) {
    const { range, offset, min, max, offsetMin, offsetMax, factor, anchor } = opts
    const nextRange = clamp(range * factor, min, max)
    const nextOffset = clamp(offset + anchor * (range - nextRange), offsetMin, offsetMax)
    return { range: nextRange, offset: nextOffset }
}

/**
 * Pan one axis by a pixel delta. `viewportPx` is the length of the scrollable
 * area in pixels. Set `invert` for the vertical axis, where scrolling down
 * reveals lower notes (a smaller offset).
 * @param {{ range:number, offset:number, deltaPx:number, viewportPx:number, offsetMin:number, offsetMax:number, invert?:boolean }} opts
 * @returns {{ offset:number }}
 */
export function panAxis(opts) {
    const { range, offset, deltaPx, viewportPx, offsetMin, offsetMax, invert = false } = opts
    if (!Number.isFinite(viewportPx) || viewportPx <= 0)
        return { offset }
    const unitsPerPx = range / viewportPx
    const moved = (invert ? -1 : 1) * deltaPx * unitsPerPx
    return { offset: clamp(offset + moved, offsetMin, offsetMax) }
}

/**
 * A gentle step for the wheel over the scroll/zoom sliders: one unit per notch,
 * up to three for a large trackpad delta, and four times that with Shift held.
 * Returns the signed number of steps to apply.
 * @param {number} deltaY
 * @param {boolean} [shift]
 * @returns {number}
 */
export function sliderWheelSteps(deltaY, shift = false) {
    if (!Number.isFinite(deltaY) || deltaY === 0)
        return 0
    const magnitude = Math.min(3, Math.max(1, Math.round(Math.abs(deltaY) / 120)))
    return Math.sign(deltaY) * magnitude * (shift ? 4 : 1)
}
