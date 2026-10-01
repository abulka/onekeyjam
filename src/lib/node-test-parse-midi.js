/*
Test parsing of midi, chord detection using node (not web browser)

Run with
    node src/lib/node-test-parse-midi.mjs
from the root of the project e.g. '~/Devel/midi-play/onekeyjam'

Output midi file is written to 'public/midi-files/output.mid'
*/

import fs from 'fs';
import { detectChords } from './parse-midi.js'
import { buildProject } from './build-project.js'
import { candidatesToTriggerMapSmart } from './triggerMaps.js'
import { stringify } from './prettyjson.js'
import { maxChordConfigs } from './globals-config.js'

/*
In this node .mjs module, whilst we can 'import' tonejs/midi from a npm node package, the syntax isn't quite perfect. 
We can use the import keyword but not the { xx } syntax on the same line.
E.g. These work
    import fs from 'fs';
    import _ from 'lodash';
    import pkg from '@tonejs/midi';
But
    import { Midi } from '@tonejs/midi'
doesn't for some reason. Perhaps "You can't use named imports when importing from CommonJS modules"

Note we can use the named import syntax in the browser, courtesy of snowpack and vite, who dynamically fix the situation.
*/
// import { Midi } from '@tonejs/midi'  <-- why can't we do this?
import pkg from '@tonejs/midi';      // <-- workaround
const { Midi } = pkg;


// const file = fs.readFileSync("public/midi-files/simple1.mid");
// const file = fs.readFileSync("public/midi-files/voicings.mid");
// const file = fs.readFileSync("public/midi-files/house6.mid");
// const file = fs.readFileSync("public/midi-files/PACO DeLUCIA2.mid");
// const file = fs.readFileSync("public/midi-files/Peg.mid");
// const file = fs.readFileSync("public/midi-files/peg-piano.mid");
// const file = fs.readFileSync("public/midi-files/AHouseis_flattened-type0.mid");
// const file = fs.readFileSync("public/midi-files/faurreq7.mid");
const file = fs.readFileSync("public/midi-files/faure-fragment1.mid");
const midi = new Midi(file);


let chords = await detectChords(midi)

writeChords()

let project = buildProject(chords)

// 'ids' are the chord config ids that we have allocated
const { chordTriggerMap, ids, statistics } = candidatesToTriggerMapSmart(
    project.chords, maxChordConfigs, project.songs.default, true, false)  // ignore resulting chordTriggerMap
project.songs.default.ids = ids

console.log('project', stringify(project))
console.log('ids allocated this time', ids)
console.log(statistics.summaryMsg, statistics)

fs.writeFileSync("public/projects/Untitled.json", stringify(project))


function writeChordsExample() {
    // create a new midi file
    var midi = new Midi()
    // add a track
    const track = midi.addTrack()
    track.addNote({
        midi: 60,
        time: 0,
        duration: 0.2
    })
        .addNote({
            name: 'C5',
            time: 0.3,
            duration: 0.1
        })
        .addNote({
            name: 'G5',
            time: 0.3,
            duration: 0.1
        })
        .addCC({
            number: 64,
            value: 127,
            time: 0.2
        })

    // write the output
    fs.writeFileSync("public/midi-files/output.mid", Buffer.from(midi.toArray()))
}

function writeChords() {
    // create a new midi file
    var midi = new Midi()
    // add a track
    const track = midi.addTrack()
    let time = 0
    for (let chord of chords) {
        for (let note of chord) {
            track.addNote({
                name: note,
                time: time,
                duration: 0.8
            })
        }
        time += 1
    }

    // write the output
    fs.writeFileSync("public/midi-files/output.mid", Buffer.from(midi.toArray()))
}

console.log('done')
