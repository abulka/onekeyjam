import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { setMaxDisplayed } from '@/lib/maxChordConfig.js'

function projectWithFavourites(count) {
    const ids = Array.from({ length: count }, (_, i) => i + 1)
    return {
        name: 'test',
        chords: ids.map((id) => ({ id })),
        songs: { default: { ids, favourites: ids, blacklist: [] } },
    }
}

describe('setMaxDisplayed with favourited songs', () => {
    let previous

    beforeEach(() => {
        previous = globals.maxChordConfigs
    })

    afterEach(() => {
        globals.maxChordConfigs = previous
    })

    it('expands the grid so an eight chord song keeps every favourite', () => {
        setMaxDisplayed(projectWithFavourites(8))
        assert.ok(globals.maxChordConfigs >= 8)
    })

    it('keeps an explicitly larger grid choice', () => {
        setMaxDisplayed(projectWithFavourites(8), 14)
        assert.equal(globals.maxChordConfigs, 14)
    })

    it('keeps an explicitly smaller grid choice so a tall song can be shrunk for soloing', () => {
        setMaxDisplayed(projectWithFavourites(19), 7)
        assert.equal(globals.maxChordConfigs, 7)
    })

    it('leaves small songs on the seven row default', () => {
        setMaxDisplayed(projectWithFavourites(3))
        assert.equal(globals.maxChordConfigs, 7)
    })

    it('leaves a hand-built project with partial favourites at the requested size', () => {
        const ids = Array.from({ length: 12 }, (_, i) => i + 1)
        const project = {
            name: 'test',
            chords: ids.map((id) => ({ id })),
            songs: { default: { ids, favourites: [1, 2, 3], blacklist: [] } },
        }
        setMaxDisplayed(project)
        assert.equal(globals.maxChordConfigs, 7)
    })
})
