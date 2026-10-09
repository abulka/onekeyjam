import assert from 'assert'
import { resolveTabRoute, isTabNavigationEvent } from '@/lib/helpShortcuts.js'

function tabEvent(overrides = {}, target = null) {
    const event = new KeyboardEvent('keydown', { key: 'Tab', ...overrides })
    // KeyboardEvent target is read-only; define it for the guard.
    Object.defineProperty(event, 'target', { value: target || document.body })
    event.preventDefault = () => {}
    return event
}

describe('resolveTabRoute', () => {
    it('switches between Edit and Perform on plain Tab', () => {
        assert.equal(resolveTabRoute('/', false), '/perform')
        assert.equal(resolveTabRoute('/perform', false), '/')
    })

    it('leaves plain Tab alone on other pages', () => {
        assert.equal(resolveTabRoute('/settings', false), null)
        assert.equal(resolveTabRoute('/about', false), null)
    })

    it('toggles the current page and Help on Shift+Tab', () => {
        assert.equal(resolveTabRoute('/', true), '/about')
        assert.equal(resolveTabRoute('/perform', true), '/about')
        assert.equal(resolveTabRoute('/settings', true), '/about')
    })

    it('returns to the remembered page from Help', () => {
        assert.equal(resolveTabRoute('/about', true, '/perform'), '/perform')
        assert.equal(resolveTabRoute('/about', true, '/settings'), '/settings')
    })

    it('defaults to Edit when nothing was remembered', () => {
        assert.equal(resolveTabRoute('/about', true), '/')
        assert.equal(resolveTabRoute('/about', true, ''), '/')
    })
})

describe('isTabNavigationEvent', () => {
    it('accepts plain Tab and Shift+Tab', () => {
        assert.equal(isTabNavigationEvent(tabEvent()), true)
        assert.equal(isTabNavigationEvent(tabEvent({ shiftKey: true })), true)
    })

    it('rejects other keys, repeats and modifiers', () => {
        assert.equal(isTabNavigationEvent(tabEvent({ key: 'Enter' })), false)
        assert.equal(isTabNavigationEvent(tabEvent({ repeat: true })), false)
        assert.equal(isTabNavigationEvent(tabEvent({ ctrlKey: true })), false)
        assert.equal(isTabNavigationEvent(tabEvent({ metaKey: true })), false)
        assert.equal(isTabNavigationEvent(tabEvent({ altKey: true })), false)
    })

    it('leaves Tab alone while typing', () => {
        const input = document.createElement('input')
        input.setAttribute('type', 'text')
        assert.equal(isTabNavigationEvent(tabEvent({}, input)), false)
    })
})
