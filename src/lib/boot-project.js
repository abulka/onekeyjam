// @ts-check
import { globals } from "./globals.js"
import { WebMidi } from "./midi/webmidi.js"
import { changeScaleFilter } from "./change-scale.js" // for testing
import { wireNoteOnEvents, wireNoteOffEvents, wireCCEvents, calculateRhBlackNoteModifierNotes } from './midi/wire-events.js';
import { wireQwertyKeyState } from "./midi/qwertyKeyState.js"
import { wireScaleFilterShortcuts } from "./midi/scaleFilterShortcuts.js"
import { emergencyRepairProject } from './emergencyRepairProject.js';
import { verifyTriggerMap, candidatesToTriggerMapSmart, existingToTriggerMapSmart } from './triggerMaps';
import { openJsonUrl } from "./util.js";
import { setMaxDisplayed } from './maxChordConfig'
import { findMatchingScalesForProject } from "./findMatchingScales"
import { detectChords } from './parse-midi.js';
import { buildProject } from './build-project.js';
import { keyDetection } from "./keyDetection"
import { deletePendingChordConfigs } from './massOperationsOnChordConfigs'
import { fetchFeaturedProject, fetchClassicProject, fetchUserProject } from './projectLibrary';
import { listKeyboardConfigs, fetchKeyboardConfig, listFeaturedProjects, listClassicProjects, listUserProjects } from './projectLibrary';

/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */
/** @typedef {import("./typedefs").KeyboardConfig} KeyboardConfig */

// ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
// ╠═╝├┬┘│ │ │├┤ │   │   │  │ ││││├┤ ││ ┬
// ╩  ┴└─└─┘└┘└─┘└─┘ ┴   └─┘└─┘┘└┘└  ┴└─┘

function emptyProject() {  // TODO move this into globals and integrate with globals.project
    return JSON.parse(JSON.stringify({
        name: "Untitled",
        chords: [],
        options: {},
        songs: {
            default: {
                ids: [],
                favourites: [],
                blacklist: []
            }
        },
        chordSequences: {
            default: { mml: "t100o4l8c1d1c1d1e1f1g1g1", tempo: 99 },
        },
    }))
}

export async function bootProject() {
    // Called by the initial boot in src/lib/main.js. This only seeds the empty
    // project into globals; the orchestrator then calls regen(), keyDetection(),
    // initChordPlayEvents() and linkProjectToKeyboard() (see src/lib/main.js).
    // Subsequent project loads go through projectChores() instead, which reruns
    // regen(), keyDetection() and linkProjectToKeyboard() but not the one-time
    // initChordPlayEvents().

    projectChores2name(
        emptyProject(),     // project data object
        '',                 // name empty string because untitled new project
        undefined,          // currentChordTriggerNote
        'user'                  // userOrFeatured
    )
}

async function setProject(url, project, currentChordTriggerNote) {
    // Pass in an url or a project object
    if (url)
        project = await openJsonUrl(url)
    else
        if (!project)
            throw ('No project specified')

    projectChores2url(project, url, currentChordTriggerNote);
}


async function setFeaturedProject(name, project, currentChordTriggerNote) {
    // Pass in a project name or a project object
    if (name)
        project = await fetchFeaturedProject(name)
    else
        if (!project)
            throw ('No project specified')

    projectChores2name(project, name, currentChordTriggerNote, 'featured');
}

async function setClassicProject(name, project, currentChordTriggerNote) {
    // Pass in a project name or a project object
    if (name)
        project = await fetchClassicProject(name)
    else
        if (!project)
            throw ('No project specified')

    projectChores2name(project, name, currentChordTriggerNote, 'classic');
}

async function setUserProject(name, project, currentChordTriggerNote) {
    // Pass in a locally saved project name or a project object
    if (name)
        project = await fetchUserProject(name)
    else
        if (!project)
            throw ('No project specified')

    projectChores2name(project, name, currentChordTriggerNote, 'user');
}



export function loadFeaturedProject(name) {
    // 1. Called by combobox select in main UI
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name, category: 'featured' })
}
export function loadClassicProject(name) {
    // 1. Called by the classic combobox in the File menu
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name, category: 'classic' })
}
export function loadUserProject(name) {
    // 1. Called by combobox select in main UI
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name })
}

export function reAllocateChords() {
    // 4. only called from the button 'reallocate chords'

    deletePendingChordConfigs()

    // document.broadcastEvent("switch-project", {
    //     url: undefined, // must specify undefined so that project is not re-loaded
    //     docId: undefined,  // must specify undefined so that project is not re-loaded
    //     project: globals.project,
    //     currentChordTriggerNote: globals.currentChordTriggerNote, // preserve current chord config
    //     preserveSongIds: true,
    //     maxChordConfigs: globals.maxChordConfigs,
    // });

    const project = globals.project;
    const currentChordTriggerNote = globals.currentChordTriggerNote; // preserve current chord config
    const name = globals.projectLibrary.projectName;
    const maxChordConfigs = globals.maxChordConfigs;
    const preserveSongIds = true;
    const userOrFeatured = globals.projectLibrary.projectIsUserOrFeatured;

    projectChores2name(project, name, currentChordTriggerNote, userOrFeatured);
    projectChores({ project, maxChordConfigs, preserveSongIds });
}

export function reAllocateChordsPreserveCurrentChordConfig(ids) {
    // NEW!
    const preserveSongIds = true;
    const useExistingChordMap = true;
    regen(preserveSongIds, useExistingChordMap, ids) // ids is and araay of ids in the new order we want
    keyDetection();
    linkProjectToKeyboard();
}

export function reAllocateScales(simple = true) {
    // 5. only called from the button 'Find Matching Scales'
    const affectProject = true
    findMatchingScalesForProject(globals.project, simple, affectProject)

    $('body')
        .toast({
            message: 'Scales Allocated OK',
            displayTime: 1000,
            class: 'brown',
        })
}

export function parseMidiAndAllocateChords(midi, fileName) {
    // 6. Called by both the button and the file uploaded - common
    let chords = detectChords(midi); // chords is array chords - each chord is an array of string notes e.g. ['C4', 'E4', 'G4']
    let project = buildProject(chords);

    project.name = `Imported ${fileName}`;

    setMaxDisplayed(project); // adjust UI range slider

    document.broadcastEvent("switch-project", {
        url: undefined,
        project: project,
        currentChordTriggerNote: globals.currentChordTriggerNote, // preserve current chord config
        preserveSongIds: false
    });
}

export function newProject() {
    // 7. Called by Menu File/New. Creates a fresh empty project.
    projectChores2name(emptyProject(), '', undefined, 'user');
    projectChores({ project: globals.project, maxChordConfigs: globals.maxChordConfigs, preserveSongIds: false });
}

// ┌─┐┬ ┬┬┌┬┐┌─┐┬ ┬   ┌─┐┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
// └─┐││││ │ │  ├─┤───├─┘├┬┘│ │ │├┤ │   │ 
// └─┘└┴┘┴ ┴ └─┘┴ ┴   ┴  ┴└─└─┘└┘└─┘└─┘ ┴ 

// Event handlers - work around for vue setters not being async and we need to await the json load before linking

let _projectEventsWired = false
export function wireProjectEvents() {
    // Registered explicitly during boot rather than as an import side effect.
    if (_projectEventsWired)
        return
    _projectEventsWired = true

    document.addEventListener("switch-project", async function (/** @type {CustomEvent} */ event) {
        if (event.detail.url) {
            await setProject(
                event.detail.url,
                event.detail.project,  // usually undefined
                event.detail.currentChordTriggerNote,  // usually undefined
            )
        }
        else {
            if (event.detail.category === 'featured')
                await setFeaturedProject(
                    event.detail.name,
                    event.detail.project,  // usually undefined
                    event.detail.currentChordTriggerNote,  // usually undefined
                )
            else if (event.detail.category === 'classic')
                await setClassicProject(
                    event.detail.name,
                    event.detail.project,  // usually undefined
                    event.detail.currentChordTriggerNote,  // usually undefined
                )
            else
                await setUserProject(
                    event.detail.name,
                    event.detail.project,  // usually undefined
                    event.detail.currentChordTriggerNote,  // usually undefined
                )

        }
        projectChores({
            project: event.detail.project,
            maxChordConfigs: event.detail.maxChordConfigs,
            preserveSongIds: event.detail.preserveSongIds
        });

        document.broadcastEvent("project-loaded", { name: globals.projectLibrary.projectName });
    })

    document.addEventListener("switch-keyboard", async function (/** @type {CustomEvent} */ event) {
        await switchKeyboard(event.detail.name)
        regen();
        linkProjectToKeyboard()
    })
}

// ┬  ┌─┐┬ ┬  ┬  ┌─┐┬  ┬┌─┐┬  
// │  │ ││││  │  │ │└┐┌┘├┤ │  
// ┴─┘└─┘└┴┘  ┴─┘└─┘ └┘ └─┘┴─┘

function projectChores2name(project, name, currentChordTriggerNote, userOrFeatured = 'user') {
    emergencyRepairProject(project); // this will expand each project chord config too

    globals.project = project;
    globals.projectLibrary.projectName = name;
    globals.projectLibrary.projectIsUserOrFeatured = userOrFeatured;
    globals.currentChordTriggerNote = currentChordTriggerNote;
}

function projectChores2url(project, url, currentChordTriggerNote) {
    emergencyRepairProject(project); // this will expand each project chord config too

    globals.project = project;
    globals.projectUrl = url;
    globals.currentChordTriggerNote = currentChordTriggerNote;
}

function projectChores({ project, maxChordConfigs, preserveSongIds }) {
    setMaxDisplayed(project, maxChordConfigs);
    regen(preserveSongIds);
    keyDetection();
    linkProjectToKeyboard();
}

// ┬─┐┌─┐┌─┐┌─┐┌┐┌
// ├┬┘├┤ │ ┬├┤ │││
// ┴└─└─┘└─┘└─┘┘└┘

export function regen(updateSong = false, useExistingChordMap = false, idsInOrder = []) {
    /** @type {ChordTriggerMap} */
    let chordTriggerMap
    let ids, statistics
    if (useExistingChordMap) {
        ({ chordTriggerMap, ids, statistics } = existingToTriggerMapSmart(
            globals.chordTriggerMap,
            idsInOrder,
        ))
    }
    else
        ({ chordTriggerMap, ids, statistics } = candidatesToTriggerMapSmart(
            globals.project.chords,
            globals.maxChordConfigs,
            globals.project.songs.default,
            globals.allocateFavourites,
            false
        ));

    globals.chordTriggerMap = chordTriggerMap;
    globals.statistics = statistics;

    if (updateSong)
        globals.project.songs.default.ids = ids;
    verifyTriggerMap(chordTriggerMap);
}

// ╦╔═┌─┐┬ ┬┌┐ ┌─┐┌─┐┬─┐┌┬┐  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
// ╠╩╗├┤ └┬┘├┴┐│ │├─┤├┬┘ ││  │  │ ││││├┤ ││ ┬
// ╩ ╩└─┘ ┴ └─┘└─┘┴ ┴┴└──┴┘  └─┘└─┘┘└┘└  ┴└─┘

export async function bootKeyboard() {
    // Load the first keyboard config from the static library that was actually physically detected
    await listKeyboardConfigs()
    let keyboardName
    for (let name of globals.keyboardsDetected) {
        if (globals.keyboardsAvailable.includes(name)) {
            keyboardName = name
            break
        }
    }
    if (keyboardName) {
        try {
            await switchKeyboard(keyboardName)
        }
        catch (e) {
            console.warn('Could not get midi keyboard config - caught and continuing...')
            const dummy = globals.keyboardsManifest.find(k => k.file === 'Dummy.json')
            await switchKeyboard(dummy ? dummy.text : 'Dummy Keyboard')
        }
    }
}

async function switchKeyboard(name) {
    /** @type {KeyboardConfig} */
    let keyboardConfig = { name: '', rhJamSoundOctave: 4, lhTriggerOctave: 3 }

    try {
        keyboardConfig = await fetchKeyboardConfig(name)
    }
    catch (e) {
        console.warn('Could not get midi keyboard config', name, '- caught and continuing with emergency settings...')
        keyboardConfig = { name: 'Dummy (emergency)', description: '', rhJamSoundOctave: 4, lhTriggerOctave: 3 }
    }

    // Emergency defaults, based on a small, two octave keyboard
    if (!keyboardConfig.rhJamSoundOctave)
        keyboardConfig.rhJamSoundOctave = 4
    if (!keyboardConfig.lhTriggerOctave)
        keyboardConfig.lhTriggerOctave = 3

    globals.keyboard = keyboardConfig  // current keyboard config JSON
}




// ╔═╗┌┬┐┬ ┬┌─┐┬─┐
// ║ ║ │ ├─┤├┤ ├┬┘
// ╚═╝ ┴ ┴ ┴└─┘┴└─

export function linkProjectToKeyboard() {
    // combination of keyboard and project init

    const keyboardName = globals.keyboard.name  // from the static keyboard library
    if (globals.keyboardsAvailable.length == 0)
        console.warn('No keyboard configs available in public/keyboards')
    else if (!keyboardName)
        console.warn('linkProjectToKeyboard: keyboardName is undefined, probably no matching midi keyboard detected')

    // Disconnect from existing keyboard if necessary
    if (globals.mySynth) {
        // globals.mySynth.disconnect()  // TODO what would this do?
        wireNoteOnEvents(false)
        wireNoteOffEvents(false)
        wireCCEvents(false)
    }

    if (keyboardName) {  // current keyboard config JSON

        // Open INPUT of hardware MIDI keyboard, so that we can later listen for notes on it
        globals.mySynth = WebMidi.getInputByName(keyboardName)

        // Scraps - other ways of detecting the external MIDI keyboard
        // globals.mySynth = WebMidi.getInputByName("Arturia MiniLab mkII")  // be specific if you have multiple devices
        // globals.mySynth = WebMidi.getInputByName("SL MkII Port 1")  // be specific if you have multiple devices
        // globals.mySynth = WebMidi.inputs[0]  // pick the first one available

        if (!globals.mySynth) {  // TODO is this safe to check for undefined, as it is a reactive variable?

            if (keyboardName == 'Dummy Keyboard') {
                // console.log("Skipping connect to hardware INPUT synth", keyboardName)
            }
            else
                console.warn("Failed to connect to hardware INPUT synth", keyboardName)
        }
        else {
            // Listen for input events from a MIDI keyboard to trigger chords and jam notes
            wireNoteOnEvents()
            wireNoteOffEvents()
            wireCCEvents()
        }

        pingOut()
    }

    wireQwertyKeyState()
    wireScaleFilterShortcuts()

    calculateLhBlackNoteModifierNotes()
    calculateRhBlackNoteModifierNotes()

    // Set scale to be the one for the first chord of the project config
    // and build mappings across new keyboard
    if (!Object.keys(globals.chordTriggerMap).includes(globals.currentChordTriggerNote))
        globals.currentChordTriggerNote = Object.keys(globals.chordTriggerMap)[0]  // revert to first chord config

    changeScaleFilter()

    document.broadcastEvent('chord-changed', {
        notes: globals.currentLhNotes(),
        bass: globals.currentBass()
    })

    // This used to be done in wireGuiEvents() but that is gone now, so do here.
    listFeaturedProjects()
    listClassicProjects()
    listUserProjects()
}

function pingOut() {
    // if (globals.channel)  // Ensure DAW output channel (jam) exists. Note that globals.channel2 (chord) and globals.channel3 (bass) will also be undefined
    //     globals.channel.playNote("C6", { duration: 330, attack: 0.1 });  // ping!
    // else
    //     console.warn('No IAC Driver Bus 1 output MIDI channel to play initial playNote() ping to your DAW')
}

function calculateLhBlackNoteModifierNotes() {
    // Look for octave of lh chord trigger notes and allocate all lh black notes of that octave

    let lhTriggerOctave = globals.keyboard.lhTriggerOctave

    globals.lhMetaKeys.lhCsharp = `C#${lhTriggerOctave}`
    globals.lhMetaKeys.lhDsharp = `D#${lhTriggerOctave}`
    globals.lhMetaKeys.lhFsharp = `F#${lhTriggerOctave}`
    globals.lhMetaKeys.lhGsharp = `G#${lhTriggerOctave}`
    globals.lhMetaKeys.lhAsharp = `A#${lhTriggerOctave}`
}
