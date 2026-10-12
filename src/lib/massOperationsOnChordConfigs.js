import { globals } from './globals.js';
import { numericId } from './id.js'

/*
Delete the chords whose ids are in globals.idsToDelete from the pool, the
grid arrangement and the song lists. Used by the Chord Inspector's Delete and
by deleteGridChords in gridArrangement.js.
*/
export function deletePendingChordConfigs() {
    const deleted = globals.idsToDelete.map(numericId)
    const isDeleted = (id) => deleted.includes(numericId(id))
    globals.project.chords = globals.project.chords.filter(chord => !isDeleted(chord.id))
    globals.project.songs.default.ids = globals.project.songs.default.ids.filter(id => !isDeleted(id))
    globals.project.songs.default.favourites = globals.project.songs.default.favourites.filter(id => !isDeleted(id))
    globals.project.songs.default.blacklist = globals.project.songs.default.blacklist.filter(id => !isDeleted(id))
    // A deleted chord must not linger in the recent chord/scale history.
    if (Array.isArray(globals.chordHistory))
        globals.chordHistory = globals.chordHistory.filter(entry => !isDeleted(entry.chordId))
    globals.idsToDelete = []
}
