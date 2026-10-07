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

    it('leaves small songs on the seven row default', () => {
        setMaxDisplayed(projectWithFavourites(3))
        assert.equal(globals.maxChordConfigs, 7)
    })
})
