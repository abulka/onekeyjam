import { reorderGridChords } from './boot-project';

let row;  // <tr>

export function start(event) {
    row = event.target.parentNode;
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
    }
}

export function dragend() {
    let ids = _getIdsOfVisibleTable();
    reorderGridChords(ids)
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
