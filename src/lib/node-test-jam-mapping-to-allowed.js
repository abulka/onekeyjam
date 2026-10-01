// Run with
// node src/lib/node-test-jam-mapping-to-allowed.js 

import { buildNoteMap } from "./jam-mapping-to-allowed.js"

const numLhTriggers = 7
let lhTriggerOctave = 3
let rhJamSoundOctave = 4
let result

// Basic situation quick test
result = buildNoteMap(['C', 'D', 'E'], numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
console.log('result', result)

result = buildNoteMap(['G', 'A', 'B', 'C'], numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
console.log('result', result)

result = buildNoteMap(['Eb', 'B'], numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
console.log('result', result)

// Novation situation quick test
lhTriggerOctave = 2
rhJamSoundOctave = 3
result = buildNoteMap(['Eb', 'B'], numLhTriggers, lhTriggerOctave, rhJamSoundOctave)
console.log('result', result)
