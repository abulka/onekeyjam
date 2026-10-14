import assert from 'assert'
import { beforeEach, describe, it } from 'vitest'
import { observeEditChordsOpen } from '@/lib/editChordsAccordion.js'

/** A minimal main-view accordion: Key Detection then Edit Chords. */
function buildAccordion({ open = false } = {}) {
    const root = document.createElement('div')
    root.className = 'ui fluid styled accordion'
    for (const [slug, label] of [['key-detection', 'Key Detection'], ['edit-chords', 'Edit Chords']]) {
        const title = document.createElement('div')
        title.className = 'title'
        title.setAttribute('data-accordion-section', slug)
        title.textContent = label
        const content = document.createElement('div')
        content.className = 'content'
        if (slug === 'edit-chords' && open) {
            title.classList.add('active')
            content.classList.add('active')
        }
        root.appendChild(title)
        root.appendChild(content)
    }
    document.body.appendChild(root)
    return root
}

function editChordsTitle() {
    return document.querySelector('[data-accordion-section="edit-chords"]')
}

/** Let the MutationObserver deliver its batch. */
function settle() {
    return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('editChordsAccordion open state', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
    })

    it('reads the open state from the section title', () => {
        buildAccordion({ open: false })
        const seenClosed = []
        const stopClosed = observeEditChordsOpen((open) => seenClosed.push(open))
        assert.deepEqual(seenClosed, [false], 'a closed section reports closed')
        stopClosed()

        editChordsTitle().classList.add('active')
        const seenOpen = []
        const stopOpen = observeEditChordsOpen((open) => seenOpen.push(open))
        assert.deepEqual(seenOpen, [true], 'an open section reports open')
        stopOpen()
    })

    it('reports false when there is no Edit Chords section', () => {
        const seen = []
        const stop = observeEditChordsOpen((open) => seen.push(open))
        assert.deepEqual(seen, [false], 'the Perform and Settings pages have no section')
        assert.equal(typeof stop, 'function', 'a cleanup function is always returned')
        stop()
    })

    it('reports every open and close, including a header click', async () => {
        buildAccordion({ open: false })
        const seen = []
        const stop = observeEditChordsOpen((open) => seen.push(open))
        assert.deepEqual(seen, [false], 'the current state arrives straight away')

        editChordsTitle().classList.add('active')
        await settle()
        assert.deepEqual(seen, [false, true], 'opening was reported')

        editChordsTitle().classList.remove('active')
        await settle()
        assert.deepEqual(seen, [false, true, false], 'closing was reported')

        stop()
        editChordsTitle().classList.add('active')
        await settle()
        assert.deepEqual(seen, [false, true, false], 'nothing is reported after stopping')
    })
})
