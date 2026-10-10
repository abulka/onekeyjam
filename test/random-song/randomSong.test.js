import assert from 'assert'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildRandomSongPool, pickRandomSong } from '@/lib/randomSong.js'
import { DEMO_PROJECT_NAME } from '@/lib/demo-project.js'

// Vitest runs with the project root as the working directory.
const root = process.cwd()

describe('random song pool', () => {
    it('combines classic, rock and multi-key songs with their source tagged', () => {
        const pool = buildRandomSongPool({ classic: ['Blue Moon'], rock: ['Peg'], multiKey: ['Blue Bossa in C minor (multi-key)'] })
        assert.deepEqual(pool, [
            { name: 'Blue Moon', category: 'classic' },
            { name: 'Peg', category: 'rock' },
            { name: 'Blue Bossa in C minor (multi-key)', category: 'multi-key' },
        ])
    })

    it('returns an empty pool when nothing has loaded yet', () => {
        assert.deepEqual(buildRandomSongPool({}), [])
        assert.deepEqual(buildRandomSongPool(), [])
        assert.equal(pickRandomSong([], 'Blue Moon'), null)
    })

    it('excludes the current song when there is more than one choice', () => {
        const pool = buildRandomSongPool({ classic: ['Blue Moon'], rock: ['Peg'], multiKey: [] })
        for (let i = 0; i < 20; i++)
            assert.equal(pickRandomSong(pool, 'Blue Moon').name, 'Peg')
    })

    it('still loads the only song when it is the current one', () => {
        const pool = buildRandomSongPool({ classic: ['Blue Moon'], rock: [], multiKey: [] })
        assert.equal(pickRandomSong(pool, 'Blue Moon').name, 'Blue Moon')
    })

    it('keeps the right loader when two collections share a song name', () => {
        const pool = buildRandomSongPool({ classic: ['Same Name'], rock: [], multiKey: ['Same Name'] })
        const picks = new Set(Array.from({ length: 20 }, () => pickRandomSong(pool, 'Other').category))
        assert.ok(picks.has('classic') || picks.has('multi-key'))
        for (const pick of pool.filter((entry) => entry.name === 'Same Name'))
            assert.ok(pick.category === 'classic' || pick.category === 'multi-key')
    })
})

describe('demo song home', () => {
    it('the DEMO song lives in the progressions library, not test-songs', () => {
        const demoPath = join(root, 'public', 'projects', 'progressions', `${DEMO_PROJECT_NAME}.json`)
        assert.ok(existsSync(demoPath), `${DEMO_PROJECT_NAME} is in progressions`)
        const project = JSON.parse(readFileSync(demoPath, 'utf8'))
        assert.equal(project.name, DEMO_PROJECT_NAME)
        assert.ok(!existsSync(join(root, 'public', 'projects', 'test-songs', `${DEMO_PROJECT_NAME}.json`)))
    })
})
