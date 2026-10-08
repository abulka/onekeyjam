// @ts-check
import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { buildProject } from '@/lib/build-project.js'
import { emergencyRepairProject } from '@/lib/emergencyRepairProject.js'
import { getProjectForPersistence } from '@/lib/projectSerialize.js'
import {
    rebuildTriggerMap,
    appendChordConfigsToGrid,
    dealGrid,
    reorderGrid,
    resizeGrid,
    deleteGridChords,
} from '@/lib/gridArrangement.js'

function makeProject(chordCount = 5) {
    const chords = []
    for (let i = 0; i < chordCount; i++)
        chords.push(['C3', 'E3', 'G3'])
    const project = buildProject(chords)
    project.name = 'test'
    return project
}

function install(project, maxChordConfigs = 7) {
    globals.project = project
    globals.maxChordConfigs = maxChordConfigs
    globals.chordTriggerMap = {}
    globals.idsToDelete = []
    rebuildTriggerMap()
}

function idsInMapOrder() {
    return Object.values(globals.chordTriggerMap).map(config => config.id)
}

describe('grid arrangement', () => {
    let saved

    beforeEach(() => {
        saved = {
            project: globals.project,
            maxChordConfigs: globals.maxChordConfigs,
            chordTriggerMap: globals.chordTriggerMap,
            idsToDelete: globals.idsToDelete,
        }
    })

    afterEach(() => {
        globals.project = saved.project
        globals.maxChordConfigs = saved.maxChordConfigs
        globals.chordTriggerMap = saved.chordTriggerMap
        globals.idsToDelete = saved.idsToDelete
    })

    it('rebuilds the trigger map in arrangement order', () => {
        const project = makeProject(3)
        project.songs.default.ids = [2, 0, 1]
        install(project, 3)
        assert.deepEqual(idsInMapOrder(), [2, 0, 1])
        assert.deepEqual(Object.keys(globals.chordTriggerMap), ['C3', 'D3', 'E3'])
    })

    it('falls back to pool order when the arrangement is empty', () => {
        const project = makeProject(3)
        project.songs.default.ids = []
        install(project, 7)
        assert.deepEqual(idsInMapOrder(), [0, 1, 2])
    })

    it('appends added chords to the pool, the grid and the map', () => {
        const project = makeProject(2)
        project.songs.default.ids = [0, 1]
        install(project, 2)
        const newChord = { id: 99, name: 'FM', chord: 'FM', chordNotes: ['F3', 'A3', 'C4'], scale1: 'f major' }
        appendChordConfigsToGrid([newChord])

        assert.equal(project.chords.length, 3)
        assert.deepEqual(project.songs.default.ids, [0, 1, 99])
        assert.equal(globals.maxChordConfigs, 3)
        assert.equal(project.options.gridRows, 3)
        assert.equal(globals.chordTriggerMap['E3'].id, 99)  // third trigger key
    })

    it('deals a hand with favourites pinned first', () => {
        const project = makeProject(5)
        project.songs.default.favourites = [3, 4]
        install(project, 2)
        // rng always 0 -> deterministic draw from the front of the pool
        dealGrid(2, true, () => 0)
        assert.deepEqual(project.songs.default.ids, [3, 4])
    })

    it('browse mode sets favourites aside', () => {
        const project = makeProject(5)
        project.songs.default.favourites = [0, 1]
        install(project, 2)
        const ids = dealGrid(2, false, () => 0)
        assert.equal(ids.length, 2)
        for (const id of ids)
            assert.ok([2, 3, 4].includes(id), `unexpected id ${id}`)
    })

    it('reorders the arrangement without touching the pool', () => {
        const project = makeProject(4)
        install(project, 4)
        const poolOrder = project.chords.map(chord => chord.id)
        reorderGrid([3, 1, 2, 0])
        assert.deepEqual(project.songs.default.ids, [3, 1, 2, 0])
        assert.deepEqual(project.chords.map(chord => chord.id), poolOrder)
        assert.deepEqual(idsInMapOrder(), [3, 1, 2, 0])
    })

    it('shrinks then grows back to the same rows', () => {
        const project = makeProject(6)
        install(project, 2)
        resizeGrid(4)
        assert.deepEqual(project.songs.default.ids, [0, 1, 2, 3])
        resizeGrid(2)
        assert.deepEqual(project.songs.default.ids, [0, 1])
        resizeGrid(4)
        assert.deepEqual(project.songs.default.ids, [0, 1, 2, 3])
        assert.equal(project.options.gridRows, 4)
    })

    it('deletes rows and shrinks the grid height', () => {
        const project = makeProject(5)
        project.songs.default.ids = [0, 1, 2, 3]
        install(project, 4)
        globals.idsToDelete = [1, 3]
        const count = deleteGridChords()
        assert.equal(count, 2)
        assert.deepEqual(project.chords.map(chord => chord.id), [0, 2, 4])
        assert.deepEqual(project.songs.default.ids, [0, 2])
        assert.equal(globals.maxChordConfigs, 2)
        assert.deepEqual(idsInMapOrder(), [0, 2])
    })

    it('keeps added chords after a save and reopen', () => {
        const project = makeProject(2)
        project.songs.default.ids = [0, 1]
        install(project, 2)
        appendChordConfigsToGrid([
            { id: 10, name: 'FM', chord: 'FM', chordNotes: ['F3', 'A3', 'C4'], scale1: 'f major' },
            { id: 11, name: 'GM', chord: 'GM', chordNotes: ['G3', 'B3', 'D4'], scale1: 'g major' },
        ])
        const expected = project.songs.default.ids.slice()

        // Save (slim) then reopen from JSON.
        const persisted = JSON.parse(getProjectForPersistence(project, true, true))
        const reopened = JSON.parse(JSON.stringify(persisted))
        emergencyRepairProject(reopened)
        install(reopened, reopened.options.gridRows ?? 7)

        assert.deepEqual(reopened.songs.default.ids, expected)
        assert.deepEqual(idsInMapOrder(), expected)
    })

    it('keeps a drag order after a save and reopen', () => {
        const project = makeProject(4)
        install(project, 4)
        reorderGrid([3, 2, 1, 0])

        const persisted = JSON.parse(getProjectForPersistence(project, true, true))
        const reopened = JSON.parse(JSON.stringify(persisted))
        emergencyRepairProject(reopened)
        install(reopened, reopened.options.gridRows ?? 7)

        assert.deepEqual(reopened.songs.default.ids, [3, 2, 1, 0])
        assert.deepEqual(idsInMapOrder(), [3, 2, 1, 0])
    })

    it('keeps deleted rows deleted after a save and reopen', () => {
        const project = makeProject(5)
        install(project, 4)
        globals.idsToDelete = [1, 3]
        deleteGridChords()

        const persisted = JSON.parse(getProjectForPersistence(project, true, true))
        const reopened = JSON.parse(JSON.stringify(persisted))
        emergencyRepairProject(reopened)

        assert.deepEqual(reopened.chords.map(chord => chord.id).sort((a, b) => a - b), [0, 2, 4])
        assert.ok(!reopened.songs.default.ids.includes(1))
        assert.ok(!reopened.songs.default.ids.includes(3))
    })
})

describe('emergencyRepairProject id and arrangement normalisation', () => {
    /** @returns {any} */
    function rawProject(overrides = {}) {
        return {
            name: 'raw',
            options: {},
            chords: [
                { id: '1', name: 'CM', chord: 'CM', chordNotes: ['C3', 'E3', 'G3'], scale1: 'c major' },
                { id: 2, name: 'DM', chord: 'DM', chordNotes: ['D3', 'F#3', 'A3'], scale1: 'd major' },
                { id: 2, name: 'EM', chord: 'EM', chordNotes: ['E3', 'G#3', 'B3'], scale1: 'e major' },
            ],
            songs: { default: { ids: [], favourites: [], blacklist: [] } },
            ...overrides,
        }
    }

    it('coerces numeric string ids and reallocates duplicates', () => {
        const project = rawProject()
        emergencyRepairProject(project)
        const ids = project.chords.map(chord => chord.id)
        assert.deepEqual(ids, [1, 2, 3])
        assert.ok(ids.every(id => typeof id === 'number'))
    })

    it('seeds an empty arrangement from favourites then pool order', () => {
        const project = rawProject()
        project.songs.default.favourites = [2]
        emergencyRepairProject(project)
        assert.deepEqual(project.songs.default.ids, [2, 1, 3])
    })

    it('drops arrangement ids that are not in the pool', () => {
        const project = rawProject()
        project.songs.default.ids = [2, 99, 1]
        emergencyRepairProject(project)
        assert.deepEqual(project.songs.default.ids, [2, 1])
    })

    it('never assigns a random id', () => {
        const project = rawProject()
        emergencyRepairProject(project)
        for (const chord of project.chords) {
            const id = Number(chord.id)
            assert.ok(Number.isFinite(id) && id > 0 && id < 100)
        }
    })
})
