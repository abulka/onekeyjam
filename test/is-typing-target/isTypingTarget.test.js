import assert from 'assert'
import { isTypingTarget } from '@/lib/is-typing-target.js'

/*
 * Only genuine text entry should pause the computer-keyboard piano. Policy
 * controls such as selects, checkboxes and buttons must not pause it.
 */

function element(tag, attributes = {}) {
    const el = document.createElement(tag)
    for (const [key, value] of Object.entries(attributes))
        el.setAttribute(key, value)
    return el
}

describe('isTypingTarget', () => {
    it('treats text entry fields as typing targets', () => {
        assert.equal(isTypingTarget(element('input')), true)
        assert.equal(isTypingTarget(element('input', { type: 'text' })), true)
        assert.equal(isTypingTarget(element('input', { type: 'search' })), true)
        assert.equal(isTypingTarget(element('input', { type: 'number' })), true)
        assert.equal(isTypingTarget(element('textarea')), true)
    })

    it('does not treat policy controls as typing targets', () => {
        assert.equal(isTypingTarget(element('select')), false)
        assert.equal(isTypingTarget(element('input', { type: 'checkbox' })), false)
        assert.equal(isTypingTarget(element('input', { type: 'radio' })), false)
        assert.equal(isTypingTarget(element('input', { type: 'range' })), false)
        assert.equal(isTypingTarget(element('button')), false)
    })

    it('treats contenteditable as a typing target', () => {
        assert.equal(isTypingTarget(element('div', { contenteditable: 'true' })), true)
    })

    it('tolerates null and plain objects', () => {
        assert.equal(isTypingTarget(null), false)
        assert.equal(isTypingTarget({}), false)
    })
})
