import assert from 'assert'
import {
    ACCORDION_STORAGE_KEY,
    clearAccordionState,
    readAccordionState,
    registerAccordion,
    sectionKeyFor,
    slugifySectionTitle,
    writeAccordionState,
} from '@/lib/accordionState.js'

function fakeStorage(initial = {}) {
    const data = { ...initial }
    return {
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => { data[key] = String(value) },
        removeItem: (key) => { delete data[key] },
        _data: data,
    }
}

function buildAccordion(sections) {
    const root = document.createElement('div')
    root.className = 'ui accordion'
    for (const section of sections) {
        const title = document.createElement('div')
        title.className = 'title'
        if (section.slug)
            title.setAttribute('data-accordion-section', section.slug)
        title.textContent = section.label
        if (section.open)
            title.classList.add('active')
        const content = document.createElement('div')
        content.className = 'content'
        if (section.open)
            content.classList.add('active')
        if (section.nested) {
            const nestedTitle = document.createElement('div')
            nestedTitle.className = 'title'
            nestedTitle.textContent = section.nested
            nestedTitle.classList.add('active')
            content.appendChild(nestedTitle)
        }
        root.appendChild(title)
        root.appendChild(content)
    }
    document.body.appendChild(root)
    return root
}

function openSlugs(root) {
    return Array.from(root.children)
        .filter((child) => child.classList.contains('title') && child.classList.contains('active'))
        .map((title) => sectionKeyFor(title))
}

describe('accordionState', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
        clearAccordionState(fakeStorage())
    })

    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('slugifies headings', () => {
        assert.equal(slugifySectionTitle('Key Detection'), 'key-detection')
        assert.equal(slugifySectionTitle('Chord / Scale Table'), 'chord-scale-table')
        assert.equal(slugifySectionTitle('  Filters & mode '), 'filters-mode')
    })

    it('prefers the explicit section attribute over heading text', () => {
        const title = document.createElement('div')
        title.setAttribute('data-accordion-section', 'key-detection')
        title.textContent = 'Something else entirely'
        assert.equal(sectionKeyFor(title), 'key-detection')
    })

    it('returns empty state when nothing is stored and ignores corrupt JSON', () => {
        assert.deepEqual(readAccordionState(fakeStorage()), {})
        const bad = fakeStorage({ [ACCORDION_STORAGE_KEY]: 'not json' })
        assert.deepEqual(readAccordionState(bad), {})
        const wrongShape = fakeStorage({ [ACCORDION_STORAGE_KEY]: JSON.stringify({ jammer: [true, false] }) })
        assert.deepEqual(readAccordionState(wrongShape), {})
    })

    it('persists open sections and restores them on the next mount', () => {
        const storage = fakeStorage()
        const first = buildAccordion([
            { slug: 'edit-chords', label: 'Edit Chords', open: true },
            { slug: 'key-detection', label: 'Key Detection', open: false },
        ])
        const stop = registerAccordion(first, 'jammer', storage)
        stop()
        first.remove()

        const stored = readAccordionState(storage)
        assert.deepEqual(stored.jammer, { 'edit-chords': true, 'key-detection': false })

        const second = buildAccordion([
            { slug: 'edit-chords', label: 'Edit Chords', open: false },
            { slug: 'key-detection', label: 'Key Detection', open: false },
        ])
        const stopSecond = registerAccordion(second, 'jammer', storage)
        assert.deepEqual(openSlugs(second), ['edit-chords'])
        stopSecond()
    })

    it('keeps state attached to the right section after a reorder', () => {
        const storage = fakeStorage()
        writeAccordionState({ jammer: { 'edit-chords': false, 'key-detection': true } }, storage)

        const reordered = buildAccordion([
            { slug: 'key-detection', label: 'Key Detection', open: false },
            { slug: 'edit-chords', label: 'Edit Chords', open: true },
        ])
        const stop = registerAccordion(reordered, 'jammer', storage)
        assert.deepEqual(openSlugs(reordered), ['key-detection'])
        stop()
    })

    it('leaves new sections at their markup default', () => {
        const storage = fakeStorage()
        writeAccordionState({ jammer: { 'edit-chords': true } }, storage)

        const root = buildAccordion([
            { slug: 'edit-chords', label: 'Edit Chords', open: false },
            { slug: 'create-chord-sequence', label: 'Create Chord Sequence', open: true },
        ])
        const stop = registerAccordion(root, 'jammer', storage)
        assert.deepEqual(openSlugs(root).sort(), ['create-chord-sequence', 'edit-chords'])
        stop()
    })

    it('only manages direct child sections, so nested accordions stay independent', () => {
        const storage = fakeStorage()
        const root = buildAccordion([
            { slug: 'edit-chords', label: 'Edit Chords', open: true, nested: 'Common Chords' },
            { slug: 'key-detection', label: 'Key Detection', open: false },
        ])
        const stop = registerAccordion(root, 'jammer', storage)
        stop()

        const stored = readAccordionState(storage).jammer
        assert.ok(!('common-chords' in stored))
        assert.deepEqual(stored, { 'edit-chords': true, 'key-detection': false })
    })
})
