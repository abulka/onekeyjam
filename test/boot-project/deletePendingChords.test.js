import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { deletePendingChordConfigs } from '@/lib/massOperationsOnChordConfigs.js'

function seedProject() {
    globals.project = {
        name: 'test',
        chords: [{ id: 0 }, { id: 1 }, { id: 2 }],
        songs: {
            default: {
                ids: [0, 1, 2],
                favourites: [1],
                blacklist: [2],
            },
        },
    }
    globals.idsToDelete = []
}

describe('deletePendingChordConfigs', () => {
    let previousProject
    let previousIdsToDelete

    beforeEach(() => {
        previousProject = globals.project
        previousIdsToDelete = globals.idsToDelete
        seedProject()
    })

    afterEach(() => {
        globals.project = previousProject
        globals.idsToDelete = previousIdsToDelete
    })

    it('removes only the ticked rows and cleans up song lists', () => {
        globals.idsToDelete = [1, 2]
        deletePendingChordConfigs()
        assert.deepEqual(globals.project.chords.map((chord) => chord.id), [0])
        assert.deepEqual(globals.project.songs.default.ids, [0])
        assert.deepEqual(globals.project.songs.default.favourites, [])
        assert.deepEqual(globals.project.songs.default.blacklist, [])
        assert.deepEqual(globals.idsToDelete, [])
    })

    it('allows deleting every row', () => {
        globals.idsToDelete = [0, 1, 2]
        deletePendingChordConfigs()
        assert.deepEqual(globals.project.chords, [])
        assert.deepEqual(globals.project.songs.default.ids, [])
        assert.deepEqual(globals.idsToDelete, [])
    })
})
