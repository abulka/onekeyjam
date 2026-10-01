// @ts-check
import { globals } from "./globals.js"
import { stringify } from './prettyjson.js'
import { getProjectForPersistence } from './projectConfig'
import { saveUserProject } from './projectLibrary'
import { loadUserProject } from '../../src/lib/boot-project'
import { exportMidiChords, exportMidiChordsForChordMemoryTrigger } from './parse-midi';

async function _saveProject(name, project) {
    // Save the project to local storage (IndexedDB)

    const projectData = JSON.parse(getProjectForPersistence(project, true, true))  // slim true, meta true
    projectData.name = name

    await saveUserProject(name, projectData)

    globals.projectLibrary.projectName = name
    globals.projectLibrary.projectIsUserOrFeatured = 'user'

    $('body')
        .toast({
            message: `Saved project '${name}'`,
            displayTime: 2500,
            class: 'brown',
        })
}

// ┌─┐┌─┐┬  ┬┌─┐  ┌─┐┌┐┌┌┬┐  ┌─┐┌─┐┬  ┬┌─┐╔═╗┌─┐
// └─┐├─┤└┐┌┘├┤   ├─┤│││ ││  └─┐├─┤└┐┌┘├┤ ╠═╣└─┐
// └─┘┴ ┴ └┘ └─┘  ┴ ┴┘└┘─┴┘  └─┘┴ ┴ └┘ └─┘╩ ╩└─┘

export async function saveProjectAs() {
    const project = globals.project
    let fileName = prompt('Save Project As', globals.projectLibrary.projectName);
    if (fileName) {
        await _saveProject(fileName, project)
    }
}

export async function saveProject() {
    const project = globals.project
    const fileName = globals.projectLibrary.projectName
    if (fileName == 'Empty' || fileName == 'Untitled')
        throw ('Cannot save project with name ' + fileName)
    if (fileName) {
        await _saveProject(fileName, project)
    }
    else {
        await saveProjectAs()
    }
}

// ┌┬┐┌─┐┬ ┬┌┐┌┬  ┌─┐┌─┐┌┬┐   ┬┌─┐┌─┐┌┐┌
//  │││ ││││││││  │ │├─┤ ││   │└─┐│ ││││
// ─┴┘└─┘└┴┘┘└┘┴─┘└─┘┴ ┴─┴┘  └┘└─┘└─┘┘└┘

export function downloadProject() {
    let project = globals.project
    let name = prompt('Save Project As', project.name);
    if (name != null) {
        // Update the download project link with the contents of the project as JSON
        const json = stringify(project, { indent: 2 })

        // Use existing link on page
        // var a = document.getElementById('download-project')

        // Create a new link
        var a = document.createElement("a")

        // Create the content
        // a.innerHTML = "Download File"
        a.href = URL.createObjectURL(
            new Blob([json], { type: "application/json" })
        )
        a.download = `${name} project.json`

        a.click()  // causes auto download
    }
}
export function downloadMidiChords() {
    let chords = convertProjChordsToSimple()
    let midiObj = exportMidiChords(chords)
    downloadFileTrick(midiObj)
}

export function downloadMidiChordsForChordMemoryTrigger() {
    let chords = convertProjChordsToSimple()
    let midiObj = exportMidiChordsForChordMemoryTrigger(chords)
    downloadFileTrick(midiObj)
}

function convertProjChordsToSimple() {
    // globals.project.chords is an array of ChordConfig objects
    // so... we need to convert them to a simple string[][] of chords
    return globals.project.chords.map(chord => chord.chordNotes)
}    

function downloadFileTrick(midiObj) {
    // Convert midiObj to a Uint8Array
    const midiBuffer = new Uint8Array(midiObj.toArray())

    // Trigger the download of the midiBuffer as a midi file 'untitled.mid'
    var a = document.createElement("a")
    a.href = URL.createObjectURL(
        new Blob([midiBuffer], { type: "audio/midi" })
    )
    a.download = `chords-${globals.project.name}.mid`
    a.click()
}

// ┬ ┬┌─┐┬  ┌─┐┌─┐┌┬┐  ┬  ┌─┐┌─┐┌─┐┬    ┌┬┐┌─┐  ┌─┐┬┬─┐┌─┐┌┐ ┌─┐┌─┐┌─┐
// │ │├─┘│  │ │├─┤ ││  │  │ ││  ├─┤│     │ │ │  ├┤ │├┬┘├┤ ├┴┐├─┤└─┐├┤ 
// └─┘┴  ┴─┘└─┘┴ ┴─┴┘  ┴─┘└─┘└─┘┴ ┴┴─┘   ┴ └─┘  └  ┴┴└─└─┘└─┘┴ ┴└─┘└─┘

export async function uploadProject() {

    // Create the input element
    var input = document.createElement('input')  // TODO create an element in the DOM and use that instead of re-creating each time
    input.type = 'file'

    // Listen for the change event
    input.addEventListener('change', function (/** @type {Event} */ e) {
        // Get the file
        var file = (/** @type {HTMLInputElement} */ (e.target)).files[0]

        // Read the file
        var reader = new FileReader()
        reader.readAsText(file, 'UTF-8')

        // When the file is loaded
        reader.onload = async function (/** @type {ProgressEvent<FileReader>} */ evt) {
            // Parse the JSON
            var project = JSON.parse(/** @type {string} */ (evt.target.result))

            console.log('uploading project', project)
            let fileName = input.value.replace(/^.*[\\/]/, '')
            fileName = fileName.replace('.json', '')
            fileName = prompt('Save Project As', fileName);
            if (fileName) {
                await _saveProject(fileName, project)

                loadUserProject(fileName)

                $('body')
                    .toast({
                        message: `Uploaded ${fileName}`,
                        displayTime: 1500,
                        class: 'brown',
                    })
            }

        }
    })

    // Click the input
    input.click()
}
