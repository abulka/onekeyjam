import { globals } from "./globals.js";
import { reAllocateChords, reAllocateChordsPreserveCurrentChordConfig } from './boot-project';

let row;  // <tr>
let indexDroppedTo
let indexDraggedFrom
let idDragged

export function start(event) {
    row = event.target.parentNode;
    idDragged = parseInt(row.querySelector('span').innerText);
    indexDraggedFrom = row.rowIndex - 1;
    indexDroppedTo = undefined
    // console.log('start', idDragged, indexDraggedFrom)
}

export function dragover(event) {
    let e = event;
    e.preventDefault();

    const parent = e.target.parentNode.parentNode.parentNode
    if (parent.tagName == 'TR') {
        let children = Array.from(parent.parentNode.children);
        if (children.indexOf(parent) > children.indexOf(row))
            parent.after(row);
        else
            parent.before(row);

        // row is now possibly different and is now the dropped row
        indexDroppedTo = row.rowIndex - 1 // can also use children.indexOf(row)

        // e.target.innerText is either the span containing the id or the svg drag handle
        const draggedDiv = e.target.parentNode  // so get the parent
        idDragged = parseInt(draggedDiv.querySelector('span').innerText);  // then scan down for the id
    }
}

export function dragend(event) { // nice obvious logic
    let ids = _getIdsOfVisibleTable();
    // console.log('dragend: id', idDragged, 'dragged from', indexDraggedFrom, 'to', indexDroppedTo, 'visible table', ids)
    reAllocateChordsPreserveCurrentChordConfig(ids)
}

export function dragendORI(event) { // horrible favourite based logic
    respectNewOrderOfFavourites()
}

function respectNewOrderOfFavourites() {
    // Sets the official 'globals.project.songs.default.favourites' array to
    // the order of the favourites in the visible table
    // Logic is a bit weird, but it works

    const draggedAFavourite = globals.project.songs.default.favourites.includes(idDragged)
    const droppedInsideFavourites = indexDroppedTo < globals.project.songs.default.favourites.length

    // console.log(`Dragged id ${idDragged} from index ${indexDraggedFrom} -> ${indexDroppedTo}`)
    // console.log(`Dragged a fav? ${draggedAFavourite} Dropped inside favourites? ${droppedInsideFavourites}`)

    if (draggedAFavourite && droppedInsideFavourites) {
        let ids = _getIdsOfVisibleTable();
        let newFavourites = ids.slice(0, globals.project.songs.default.favourites.length)
        globals.project.songs.default.favourites = newFavourites
    }

}

function _getIdsOfVisibleTable() {
    // Scan html grand summary table and return array of chord config ids
    let ids = [];
    let table = document.getElementById("grand-summary");
    for (const row of table.rows) {
        for (const cell of row.cells) {
            if (cell.getAttribute('draggable')) {
                let id = parseInt(cell.querySelector('span').innerText);
                ids.push(id);
            }
        }
    }
    return ids;
}
