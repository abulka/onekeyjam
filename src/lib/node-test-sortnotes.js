import { sortNotes } from "./note-tools.js"

// Run with
// node src/lib/node-test-sortnotes.js 

let result1 = sortNotes(['D5', 'F#4', 'G4'])
let result2 = sortNotes(['G4', 'D5', 'F#4'])

console.log(result1)
console.log(result2)

const equals = (a, b) =>
    a.length === b.length &&
    a.every((v, i) => v === b[i]);

if (!equals(result1, result2))
    throw new Error('sortNotes failed, both results should be the same')

if (!equals(result1, ['F#4', 'G4', 'D5']))
    throw new Error('sortNotes failed to produce expected result')

console.log('done, pass')
