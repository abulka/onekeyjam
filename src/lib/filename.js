// @ts-check

/**
 * @module lib/filename
 * @desc Helpers for keeping generated and downloaded filenames safe.
 *
 * Netlify refuses to deploy filenames containing `#` or `?`, and other
 * characters are unsafe on common filesystems. Names shown in the UI (for
 * example "ii-V-i in G# minor") may contain these, so the name and the
 * filename derived from it are treated separately: keep the label pretty,
 * sanitise the filename.
 */

// `#` and `?` break Netlify deploys; the rest are reserved/unsafe on the
// filesystems the app and its build machines run on.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS_RE = /[#?\\/:*"<>|\u0000-\u001f]/g

/**
 * Return the distinct unsafe characters present in a filename.
 * @param {string} name
 * @returns {string[]}
 */
export function unsafeCharsIn(name) {
    return [...new Set(String(name ?? '').match(UNSAFE_CHARS_RE) ?? [])]
}

/**
 * Whether a filename is safe to write to disk and deploy.
 * @param {string} name
 * @returns {boolean}
 */
export function isSafeFilename(name) {
    return unsafeCharsIn(name).length === 0
}

/**
 * Convert a display name into a filename that is safe on disk and on
 * Netlify. `#` becomes `sharp` so sharp keys stay readable; other reserved
 * characters are removed or replaced. Spaces are kept because they are legal.
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFilename(name) {
    let out = String(name ?? '')
        .replace(/#/g, 'sharp')
        .replace(/\?/g, '')
        .replace(/[\\/:*"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .replace(/^[.\s]+/, '')
        .replace(/[.\s]+$/, '')
    if (!out)
        out = 'untitled'
    return out
}
