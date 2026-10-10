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
 * The inclusive span of a list of row numbers, or null when there is nothing
 * to frame (an empty panel keeps today's free scrolling).
 * @param {Array<number>} [values]
 * @returns {{ min:number, max:number }|null}
 */
export function rowSpan(values) {
    let min = Infinity
    let max = -Infinity
    for (const value of values || []) {
        const n = Number(value)
        if (!Number.isFinite(n))
            continue
        if (n < min)
            min = n
        if (n > max)
            max = n
    }
    return min === Infinity ? null : { min, max }
}

/**
 * The scrollable box for a row span: the span widened by `pad` rows on each
 * side. The top is exclusive (one past the highest row), matching how the
 * view window `[offset, offset + range]` addresses rows.
 * @param {{ min:number, max:number }|null} span
 * @param {number} [pad]
 * @returns {{ min:number, max:number }|null}
 */
export function rowBox(span, pad = 0) {
    if (!span)
        return null
    const padding = Number.isFinite(pad) && pad > 0 ? pad : 0
    return { min: Math.floor(span.min) - padding, max: Math.ceil(span.max) + 1 + padding }
}

/**
 * The allowed scroll-offset range for a view window of `range` inside the box
 * `[boxMin, boxMax]`, intersected with the absolute `[absMin, absMax]`. When
 * the range covers the box, both ends park at the box start.
 * @param {number} range
 * @param {number|null} boxMin
 * @param {number|null} boxMax
 * @param {number} absMin
 * @param {number} absMax
 * @returns {{ min:number, max:number }}
 */
export function viewOffsetBounds(range, boxMin, boxMax, absMin, absMax) {
    if (!Number.isFinite(boxMin) || !Number.isFinite(boxMax))
        return { min: absMin, max: absMax }
    const lo = Math.max(absMin, boxMin)
    const hi = Math.min(absMax, boxMax - range)
    if (hi <= lo)
        return { min: clamp(boxMin, absMin, absMax), max: clamp(boxMin, absMin, absMax) }
    return { min: lo, max: hi }
}

/**
 * Clamp a scroll offset so the view window of `range` stays inside the box.
 * A null box means unbounded (today's behaviour for empty panels).
 * @param {number} offset
 * @param {number} range
 * @param {number|null} boxMin
 * @param {number|null} boxMax
 * @param {number} absMin
 * @param {number} absMax
 * @returns {number}
 */
export function clampViewOffset(offset, range, boxMin, boxMax, absMin, absMax) {
    const bounds = viewOffsetBounds(range, boxMin, boxMax, absMin, absMax)
    return clamp(offset, bounds.min, bounds.max)
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
