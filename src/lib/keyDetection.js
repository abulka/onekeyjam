// @ts-check
import { uniq } from 'lodash';
import * as Tonal from '@tonaljs/tonal';
import { keyFromChords, keyFromNotes } from './keyFromChords';
import { globals } from './globals.js';
import { http, localHost } from './globals-config.js';
import { openJsonUrl } from './util.js';
import { sortNotesNoOctave, notesToPreferredRepresentation } from './note-tools.js';


export function keyDetection() {
    let result = {}
    const options = { useHitWeight: true, usePenalty: true }

    if (!globals.isProjectLoaded)
        return

    // Gather chord configs
    let chordConfigs = globals.keySignatureDetection.fromEntireProject ? globals.project.chords : Object.values(globals.chordTriggerMap)
    if (globals.keySignatureDetection.fromFavouritesOnly)
        chordConfigs = chordConfigs.filter(c => globals.project.songs.default.favourites.includes(c.id))
    
    // Via chord symbols
    const symbols = chordConfigs.map(c => c.chord)
    result.allChordsInProject = symbols
    result.keyFromChords = keyFromChords(symbols, options)

    // Via notes themselves
    let listOfListOfNotes = chordConfigs.map(c => c.chordNotes)
    const lolNoOct = listOfListOfNotes.map(chord => chord.map(note => Tonal.Note.get(note).pc))
    const lolNiceNames = lolNoOct.map(chord => notesToPreferredRepresentation(chord))
    const forDisplay = sortNotesNoOctave(uniq(lolNiceNames.flat()))
    result.allChordNotesInProject = forDisplay  // TODO highlight weights of recurring notes
    result.keyFromChordNotes = keyFromNotes(lolNiceNames, options)
    result.allChordsInProject
    // preserve user options, since we completely overwrite globals.keySignatureDetection below with 'result' (yuk) 
    result.fromEntireProject = globals.keySignatureDetection.fromEntireProject
    result.fromFavouritesOnly = globals.keySignatureDetection.fromFavouritesOnly
    result.callMusic21Server = globals.keySignatureDetection.callMusic21Server

    if (globals.keySignatureDetection.callMusic21Server)
        // @ts-ignore: Property 'broadcastEvent' does not exist on type 'Document'
        // document.broadcastEvent("music21KeyDetectionFromChords", { chords: symbols }) // bypass need for async
        document.broadcastEvent("music21KeyDetectionFromNotes", { notes: listOfListOfNotes }) // bypass need for async

    // $('body')
    // .toast({
    //     message: 'Key Signatures Detected',
    //     displayTime: 1000,
    //     class: 'brown',
    // })    

    globals.keySignatureDetection = result
    return result
}


// ┌┬┐┬ ┬┌─┐┬┌─┐     ┌─┐┬─┐┌─┐┌┬┐  ┌┐┌┌─┐┌┬┐┌─┐┌─┐
// ││││ │└─┐││   21  ├┤ ├┬┘│ ││││  ││││ │ │ ├┤ └─┐
// ┴ ┴└─┘└─┘┴└─┘     └  ┴└─└─┘┴ ┴  ┘└┘└─┘ ┴ └─┘└─┘

document.addEventListener("music21KeyDetectionFromNotes", function (event) {
    // @ts-ignore
    const data = event.detail.notes
    // const data = [
    //     ['B2', 'G3', 'A3', 'B3', 'D4', 'G4'],
    //     ['C3', 'G3', 'B3', 'D4', 'E4', 'G4']
    // ]
    music21KeyDetectionFromNotes(data)
});

async function music21KeyDetectionFromNotes(listOfListOfNotes) {
    const url = `${http}${localHost}:8082/notes`
    const payload = { notes: listOfListOfNotes }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        const data = await response.json()
        if (data.status == 'success')
            globals.keySignatureDetection.music21Result = data
    } catch (e) {
        console.log('music21 server not responding')
    }
}

// ┌┬┐┬ ┬┌─┐┬┌─┐     ┌─┐┬─┐┌─┐┌┬┐  ┌─┐┬ ┬┌─┐┬─┐┌┬┐┌─┐
// ││││ │└─┐││   21  ├┤ ├┬┘│ ││││  │  ├─┤│ │├┬┘ ││└─┐
// ┴ ┴└─┘└─┘┴└─┘     └  ┴└─└─┘┴ ┴  └─┘┴ ┴└─┘┴└──┴┘└─┘
// Deprecated because it relies on chord symbols which music21 doesn't have many of, and some
// of the symbols are different between tonal and music21.

document.addEventListener("music21KeyDetectionFromChords", function (event) {  // deprecated
    // @ts-ignore
    const chords = event.detail.chords
    const chordsString = chords.length > 0 ? chords.join(",") : "none"
    music21KeyDetectionFromChords(chordsString)
});

async function music21KeyDetectionFromChords(chordsString) {  // deprecated
    // BUG if you pass D6/9 chord it will be interpreted as a url not a chord
    const url = `${http}${localHost}:8082/chords/${chordsString}`
    const data = await openJsonUrl(url)
    globals.keySignatureDetection.music21Result = data
    console.log('music21KeyDetection', JSON.stringify(data))
    console.log(data)
}
