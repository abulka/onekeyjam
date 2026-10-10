// @ts-check
import { globals } from "./globals.js"
import { WebMidi } from "./midi/webmidi.js"
import { changeScaleFilter } from "./change-scale.js" // for testing
import { wireNoteOnEvents, wireNoteOffEvents, wireCCEvents, calculateRhBlackNoteModifierNotes } from './midi/wire-events.js';
import { isSelfOutputDevice } from './midi/midi-monitor.js'
import { suggestConfigName } from './keyboardStore.js'
import { wireQwertyKeyState } from "./midi/qwertyKeyState.js"
import { wireScaleFilterShortcuts } from "./midi/scaleFilterShortcuts.js"
import { emergencyRepairProject } from './emergencyRepairProject.js';
import { verifyTriggerMap, dealArrangement } from './triggerMaps';
import { dealGrid, reorderGrid, resizeGrid, deleteGridChords, rebuildTriggerMap } from './gridArrangement.js';
import { openJsonUrl } from "./util.js";
import { setMaxDisplayed, applyUserGridRowCount } from './maxChordConfig'
import { findMatchingScalesForProject } from "./findMatchingScales"
import { resetChordHistory } from "./autoScale.js"
import { detectChords } from './parse-midi.js';
import { buildProject } from './build-project.js';
import { keyDetection } from "./keyDetection"
import { resolveProjectKey } from './projectKey.js'
import { applyProjectKeySettings } from './projectScaleSettings.js'
import { applyProjectScaleStyle } from './scaleStyles.js'
import { fetchTestSong, fetchClassicProject, fetchProgressionProject, fetchRockProject, fetchMultiKeyProject, fetchUserProject } from './projectLibrary';
import { listKeyboardConfigs, listKeyboardConfigDetails, fetchKeyboardConfig, listTestSongs, listClassicProjects, listProgressionProjects, listRockProjects, listMultiKeyProjects, listUserProjects } from './projectLibrary';
import { restoreCurrentProject, flushCurrentProject } from './currentProjectStore.js';
import { clampBpm } from './uiPrefs.js';

/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */
/** @typedef {import("./typedefs").KeyboardConfig} KeyboardConfig */

// ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
// ╠═╝├┬┘│ │ │├┤ │   │   │  │ ││││├┤ ││ ┬
// ╩  ┴└─└─┘└┘└─┘└─┘ ┴   └─┘└─┘┘└┘└  ┴└─┘

function emptyProject() {  // TODO move this into globals and integrate with globals.project
    return JSON.parse(JSON.stringify({
        name: "Untitled",
        chords: [],
        // New projects open on the "Follow the chords" scale style, the most
        // magical first experience. See src/lib/scaleStyles.js.
        options: { scaleStyle: 'follow' },
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
    // Called by the initial boot in src/lib/main.js. This restores the working
    // project saved by the autosave (including unsaved edits and the grid
    // selection), or seeds an empty project when there is none. The orchestrator
    // then calls regen(), keyDetection(), initChordPlayEvents() and
    // linkProjectToKeyboard() (see src/lib/main.js). Subsequent project loads go
    // through projectChores() instead, which reruns regen(), keyDetection() and
    // linkProjectToKeyboard() but not the one-time initChordPlayEvents().

    if (restoreCurrentProject())
        return

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


async function setTestSongsProject(name, project, currentChordTriggerNote) {
    // Pass in a project name or a project object
    if (name)
        project = await fetchTestSong(name)
    else
        if (!project)
            throw ('No project specified')

    projectChores2name(project, name, currentChordTriggerNote, 'test-songs');
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

async function setProgressionProject(name, project, currentChordTriggerNote) {
    // Pass in a project name or a project object
    if (name)
        project = await fetchProgressionProject(name)
    else
        if (!project)
            throw ('No project specified')

    projectChores2name(project, name, currentChordTriggerNote, 'progressions');
}

async function setRockProject(name, project, currentChordTriggerNote) {
    // Pass in a project name or a project object
    if (name)
        project = await fetchRockProject(name)
    else
        if (!project)
            throw ('No project specified')

    projectChores2name(project, name, currentChordTriggerNote, 'rock');
}

async function setMultiKeyProject(name, project, currentChordTriggerNote) {
    // Pass in a project name or a project object
    if (name)
        project = await fetchMultiKeyProject(name)
    else
        if (!project)
            throw ('No project specified')

    projectChores2name(project, name, currentChordTriggerNote, 'multi-key');
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



export function loadTestSongsProject(name) {
    // 1. Called by combobox select in main UI
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name, category: 'test-songs' })
}
/** @deprecated Use loadTestSongsProject instead (kept for old callers). */
export const loadFeaturedProject = loadTestSongsProject
export function loadClassicProject(name) {
    // 1. Called by the classic combobox in the File menu
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name, category: 'classic' })
}
export function loadProgressionProject(name) {
    // 1. Called by the progressions combobox in the File menu
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name, category: 'progressions' })
}
export function loadRockProject(name) {
    // 1. Called by the rock combobox in the File menu
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name, category: 'rock' })
}
export function loadMultiKeyProject(name) {
    // 1. Called by the multi-key combobox in the File menu
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name, category: 'multi-key' })
}
export function loadUserProject(name) {
    // 1. Called by combobox select in main UI
    // 2. Called by reload current project button in main UI
    if (!name)
        name = globals.projectLibrary.projectName
    document.broadcastEvent("switch-project", { name })
}

export function reAllocateChords() {
    // The explicit Deal/Shuffle action: the only random allocation besides MIDI
    // import. It replaces the grid arrangement with a fresh draw from the pool,
    // pinning favourites first when `allocateFavourites` is on. Deletions are
    // applied by their own button, never here.
    if (!globals.project || !Array.isArray(globals.project.chords))
        return
    dealGrid(globals.maxChordConfigs, globals.allocateFavourites)
    globals.projectKey = resolveProjectKey(globals.project) ?? null;
    keyDetection();
    linkProjectToKeyboard();
}

export function reorderGridChords(ids) {
    // Apply a drag order to the grid arrangement and persist it. The pool order
    // is left untouched.
    if (!globals.project || !Array.isArray(globals.project.chords))
        return
    reorderGrid(ids)
    globals.projectKey = resolveProjectKey(globals.project) ?? null;
    keyDetection();
    linkProjectToKeyboard();
}

export function resizeGridRowCount(requestedCount) {
    // User-driven grid height change from the drag handle or the row-count
    // slider.
    if (!globals.project || !Array.isArray(globals.project.chords) || globals.project.chords.length === 0)
        return globals.maxChordConfigs
    const next = resizeGrid(requestedCount)
    globals.projectKey = resolveProjectKey(globals.project) ?? null;
    keyDetection();
    linkProjectToKeyboard();
    return next
}

export function deleteSelectedChordConfigs() {
    // Delete the grid rows ticked in the bin column, then shrink the grid to
    // match. The autosave is flushed so a quick reload cannot restore the
    // pre-delete snapshot.
    if (!globals.project || !Array.isArray(globals.project.chords))
        return 0
    if (!Array.isArray(globals.idsToDelete) || globals.idsToDelete.length === 0)
        return 0
    const deletedCount = deleteGridChords()
    globals.projectKey = resolveProjectKey(globals.project) ?? null;
    keyDetection();
    linkProjectToKeyboard();
    flushCurrentProject()
    return deletedCount
}

export function reAllocateScales(simple = true) {
    // 5. only called from the buttons 'Find Matching Scales' and
    // 'Fill with Key Signature'. The project key (declared or detected) is
    // passed into the engine, so the ranking is key-aware.
    const affectProject = true
    findMatchingScalesForProject(globals.project, simple, affectProject)

    $('body')
        .toast({
            message: 'Scales Allocated OK',
            displayTime: 1000,
            class: 'brown',
        })
}

export function fillScalesFromKeySignature() {
    // 8. only called from the button 'Fill with Key Signature'. Declare the
    // detected key on the project so it survives saving, then re-rank every
    // chord scale in that key.
    const key = globals.getProjectKey()
    if (key)
        applyProjectKeySettings({ tonic: key.tonic, type: key.type, source: 'detected' })

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

    // Seed the grid with an initial hand drawn from the imported pool. This is
    // the sampling workflow's entry point; the exact hand is saved with the
    // project and only changes when the user deals again.
    const gridRows = Math.min(globals.maxChordConfigs, project.chords.length)
    const song = project.songs.default
    song.ids = /** @type {number[]} */ (dealArrangement(project.chords, gridRows, song, globals.allocateFavourites))
    applyUserGridRowCount(gridRows, project) // remember the grid size and adjust the slider

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
    projectChores({ project: globals.project, maxChordConfigs: globals.maxChordConfigs });
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
            if (event.detail.category === 'test-songs' || event.detail.category === 'featured')
                await setTestSongsProject(
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
            else if (event.detail.category === 'progressions')
                await setProgressionProject(
                    event.detail.name,
                    event.detail.project,  // usually undefined
                    event.detail.currentChordTriggerNote,  // usually undefined
                )
            else if (event.detail.category === 'rock')
                await setRockProject(
                    event.detail.name,
                    event.detail.project,  // usually undefined
                    event.detail.currentChordTriggerNote,  // usually undefined
                )
            else if (event.detail.category === 'multi-key')
                await setMultiKeyProject(
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
        });

        document.broadcastEvent("project-loaded", { name: globals.projectLibrary.projectName });
    })

    document.addEventListener("switch-keyboard", async function (/** @type {CustomEvent} */ event) {
        await switchKeyboard(event.detail.name)
        regen();
        linkProjectToKeyboard()
    })

    // A MIDI device appeared or disappeared, or access was granted after boot
    // (the "Re-scan"/"Enable MIDI access" button). Re-select and re-wire the
    // keyboard, which is what a page refresh would otherwise be needed for.
    // Device changes arrive in bursts, so debounce the re-link.
    let midiRelinkTimer = null
    document.addEventListener("midi-devices-changed", function () {
        if (globals.boot.status !== 'ready')
            return
        if (midiRelinkTimer)
            clearTimeout(midiRelinkTimer)
        midiRelinkTimer = setTimeout(async () => {
            midiRelinkTimer = null
            await bootKeyboard()
            linkProjectToKeyboard()
        }, 100)
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
    resetChordHistory();
}

function projectChores2url(project, url, currentChordTriggerNote) {
    emergencyRepairProject(project); // this will expand each project chord config too

    globals.project = project;
    globals.projectUrl = url;
    globals.currentChordTriggerNote = currentChordTriggerNote;
    resetChordHistory();
}

function projectChores({ project, maxChordConfigs }) {
    setMaxDisplayed(project, maxChordConfigs);
    regen();
    globals.projectKey = resolveProjectKey(globals.project) ?? null;
    keyDetection();
    // A project remembers how its right hand should choose scales.
    applyProjectScaleStyle();
    // A stored demo tempo becomes the global BPM, so each song plays at its
    // own speed. Knob edits afterwards still persist until the next load.
    applyProjectTempo();
    linkProjectToKeyboard();
}

/**
 * Apply a stored pattern tempo to the global BPM. Defaults to the currently
 * selected chord sequence, falling back to `default`; projects without a
 * stored tempo leave the global BPM alone.
 * @param {string} [name] sequence name, e.g. `full`
 */
export function applyProjectTempo(name) {
    const sequences = globals.project?.chordSequences
    if (!sequences)
        return
    const key = name || globals.currentChordSequenceName || 'default'
    const stored = sequences[key]?.tempo ?? sequences.default?.tempo
    const bpm = clampBpm(stored)
    if (bpm !== undefined)
        globals.recording.bpm = bpm
}

// ┬─┐┌─┐┌─┐┌─┐┌┐┌
// ├┬┘├┤ │ ┬├┤ │││
// ┴└─└─┘└─┘└─┘┘└┘

export function regen() {
    // Rebuild the trigger map as a deterministic view over the grid
    // arrangement. This never writes to the project, so it can be called
    // freely (keyboard switches, device changes) without reshuffling anything.
    const project = globals.project ?? {}
    const chords = Array.isArray(project.chords) ? project.chords : []
    const song = project.songs?.default
    /** @type {ChordTriggerMap} */
    const chordTriggerMap = rebuildTriggerMap()

    globals.statistics = _buildStatistics(chords, chordTriggerMap, song);
    verifyTriggerMap(chordTriggerMap);
}

function _buildStatistics(chords, chordTriggerMap, song) {
    const numAllocated = Object.keys(chordTriggerMap).length
    const numFavourites = Array.isArray(song?.favourites) ? song.favourites.length : 0
    const numBlacklisted = Array.isArray(song?.blacklist) ? song.blacklist.length : 0
    const numInPool = Math.max(0, chords.length - numAllocated)
    return {
        totalChordsAvailable: chords.length,
        numAllocated,
        numFavourites,
        numBlacklisted,
        numUnAllocated: Math.max(0, numInPool - numBlacklisted),
        summaryMsg: `Showing ${numAllocated} of ${chords.length} chords (${numInPool} left in the pool).`,
    }
}

// ╦╔═┌─┐┬ ┬┌┐ ┌─┐┌─┐┬─┐┌┬┐  ┌─┐┌─┐┌┐┌┌─┐┬┌─┐
// ╠╩╗├┤ └┬┘├┴┐│ │├─┤├┬┘ ││  │  │ ││││├┤ ││ ┬
// ╩ ╩└─┘ ┴ └─┘└─┘┴ ┴┴└──┴┘  └─┘└─┘┘└┘└  ┴└─┘

export async function bootKeyboard() {
    // Pick a detected input. A physical keyboard often exposes both a USB MIDI
    // input and output endpoint under one name, so nothing is filtered out for
    // having an output port. The only thing avoided in auto-selection is the
    // device the app itself sends to (the IAC Driver), because wiring that back
    // in could loop the app's own notes; the user can still choose it by hand.
    await listKeyboardConfigs()
    // Cache every config's octaves, so each connected keyboard can be aligned to
    // the shared reference while notes are playing.
    await listKeyboardConfigDetails()
    const detected = [...globals.keyboardsDetected]
    // If the current keyboard is still connected, keep its config (including any
    // unsaved octave edits); the caller still re-wires it afterwards.
    if (globals.keyboard.name && detected.includes(globals.keyboard.name))
        return
    // Otherwise prefer a device that has a config, then any other detected
    // device, and only fall back to the app's own output device last.
    let keyboardName = detected.find(name => globals.keyboardsAvailable.includes(name) && !isSelfOutputDevice(name))
    if (!keyboardName)
        keyboardName = detected.find(name => !isSelfOutputDevice(name))
    if (!keyboardName)
        keyboardName = detected[0]
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
        // No bundled or saved config for this device. Still select it under its
        // own name so the input can be opened, using default octaves. It can be
        // saved from the MIDI Keyboard Config section.
        console.warn('No keyboard config for', name, '- using default octaves')
        keyboardConfig = { name, description: suggestConfigName(name), rhJamSoundOctave: 4, lhTriggerOctave: 3 }
    }

    // Emergency defaults, based on a small, two octave keyboard
    if (!keyboardConfig.rhJamSoundOctave)
        keyboardConfig.rhJamSoundOctave = 4
    if (!keyboardConfig.lhTriggerOctave)
        keyboardConfig.lhTriggerOctave = 3
    if (!keyboardConfig.name)
        keyboardConfig.name = name

    globals.keyboard = keyboardConfig  // current keyboard config JSON
    globals.keyboardConfigs[name] = keyboardConfig
}




// ╔═╗┌┬┐┬ ┬┌─┐┬─┐
// ║ ║ │ ├─┤├┤ ├┬┘
// ╚═╝ ┴ ┴ ┴└─┘┴└─

/**
 * A detected keyboard is live only when it has a config and the user has not
 * switched it off. A keyboard with no config has no known octaves to align to,
 * so it is not wired; the UI offers to add a config for it instead. The app's
 * own output device is never treated as a keyboard.
 * @param {string} name
 */
export function isKeyboardEnabled(name) {
    return globals.keyboardsAvailable.includes(name)
        && !globals.keyboardsDisabled.includes(name)
        && !isSelfOutputDevice(name)
}

/**
 * The detected keyboards that should be wired right now: everything with a
 * config that the user has not switched off, in the order detected.
 * @returns {string[]}
 */
export function enabledKeyboardNames() {
    return globals.keyboardsDetected.filter(name => isKeyboardEnabled(name))
}

export function linkProjectToKeyboard() {
    // combination of keyboard and project init

    const keyboardName = globals.keyboard.name  // from the static keyboard library
    if (globals.keyboardsAvailable.length == 0)
        console.warn('No keyboard configs available in public/keyboards')
    else if (!keyboardName)
        console.warn('linkProjectToKeyboard: keyboardName is undefined, probably no matching midi keyboard detected')

    // Disconnect every input that was wired on the previous pass.
    if (globals.midiInputs.length) {
        wireNoteOnEvents(false)
        wireNoteOffEvents(false)
        wireCCEvents(false)
    }
    globals.midiInputs = []
    globals.mySynth = undefined

    if (WebMidi.enabled) {
        // Every connected keyboard that is switched on is live at the same time,
        // so one can trigger chords while another solos. Notes are aligned to the
        // shared reference octaves as they arrive (see wire-events.js).
        for (const name of enabledKeyboardNames()) {
            const input = WebMidi.getInputByName(name)
            if (!input)
                continue
            globals.midiInputs.push({ name, input })
            if (name === keyboardName)
                globals.mySynth = input  // the reference keyboard, for compatibility
        }

        if (globals.midiInputs.length) {
            // Listen for input events from any wired keyboard.
            wireNoteOnEvents()
            wireNoteOffEvents()
            wireCCEvents()
        }
        else if (keyboardName && keyboardName !== 'Dummy Keyboard') {
            console.warn('Failed to connect to hardware INPUT synth', keyboardName)
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
    listTestSongs()
    listClassicProjects()
    listProgressionProjects()
    listRockProjects()
    listMultiKeyProjects()
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
