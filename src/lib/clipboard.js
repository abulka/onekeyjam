// @ts-check

/**
 * @module lib/clipboard
 * @desc Small clipboard helper shared by the debug copy buttons.
 */

/**
 * Copy text to the clipboard. Uses the async Clipboard API when available and
 * falls back to a hidden textarea + `execCommand('copy')` otherwise (for
 * example in a non-secure context or an older browser).
 * @param {string} text
 * @returns {Promise<boolean>} true when the copy is believed to have succeeded
 */
export async function copyTextToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text)
            return true
        }
        catch (error) {
            // Permission or focus issues: fall through to the legacy path.
        }
    }
    return legacyCopy(text)
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function legacyCopy(text) {
    if (typeof document === 'undefined' || !document.body)
        return false
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    let ok = false
    try {
        ok = document.execCommand('copy')
    }
    catch (error) {
        ok = false
    }
    document.body.removeChild(textarea)
    return ok
}
