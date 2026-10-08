import { globals } from './globals.js';
import { arraysAreEqual } from "./array-tools"
import { numericId } from './id.js'

/*
TODO more intelligence in the selection of columns - if you delete then that
     should clear the favourites etc. when doing mass operations.

TODO why do we have 'ids' in the project song anyway? I think its what's been
     allocated into the trigger map? but max configs also controls this.  So are
     we choosing max configs from the ids?  surely not cos fresh imported
     project have all ids empty yet still appear.  Whole thing needs a rethink.
     - Arguably remove ids and blacklist - just have favourites and deletion?
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

export function markAllVisibleChordsForDeletion() {

    const idsVisible = getVisibleIds()

    if (arraysAreEqual(idsVisible, globals.idsToDelete))  // if all are on, toggle them all off
        globals.idsToDelete = []
    else
        globals.idsToDelete = getVisibleIds()

}

export function markAllVisibleChordsAsFavourites() {
    const idsVisible = getVisibleIds()

    // BUG need to take into account that not all favourites may be currently visible in the chord trigger map
    // thus we need more intelligent comparison logic, plus more intelligent logic for adding to and clearing from the favourites list
    // for example when clearing favourites we only want to remove the ones that are currently visible

    if (arraysAreEqual(idsVisible, globals.project.songs.default.favourites))  // if all are on, toggle them all off
        globals.project.songs.default.favourites = []
    else
        globals.project.songs.default.favourites = getVisibleIds()

}

// utility functions

function getVisibleIds() {
    let result = []
    Object.keys(globals.chordTriggerMap).forEach(key => {
        result.push(globals.chordTriggerMap[key].id)
    })
    return result

}
