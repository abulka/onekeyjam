// @ts-check

/**
 * @module lib/takeSectionRequest
 * @desc A one-shot signal that the Perform page should open its Take section.
 *
 * The Edit page's Flashback Capture recovers a take and then navigates to the
 * Perform page. That view is lazy-loaded, so a plain document broadcast would
 * fire before the Perform view has mounted and registered its listener. The
 * request is stored here instead and consumed when the view mounts, which keeps
 * the navigation and the "open the Take section" action independent of load
 * timing.
 */

let pending = false

/** Ask the next-mounted Perform view to open the Take section. */
export function requestTakeSectionOpen() {
    pending = true
}

/**
 * Read and clear the request. Only the first caller sees `true`, so the
 * section is opened once per request rather than on every later mount.
 * @returns {boolean} true when the Perform view should open the Take section
 */
export function consumeTakeSectionOpenRequest() {
    const requested = pending
    pending = false
    return requested
}
