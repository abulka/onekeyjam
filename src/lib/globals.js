// @ts-check
import { reactive } from 'vue'
import { maxChordConfigs } from './globals-config.js'
import { stringify } from './prettyjson.js'
import { getProjectForPersistence } from './projectSerialize.js'
import { isProduction } from './settings.js'

/** @typedef {import("./typedefs").Chord} Chord */
/** @typedef {import("./typedefs").ChordConfig} ChordConfig */
/** @typedef {import("./typedefs").Project} Project */
/** @typedef {import("./typedefs").ChordTriggerMap} ChordTriggerMap */

/**
 * @module lib/globals
 * @desc Global variables and functions (reactive).
*/

// Identifiers imported from other modules cannot be reassigned.
// so we wrap in a object and export that object instead - CAN change the innards of the object!
// We also make this reactive so that it plays nice with vue.
// TIP: reactive variables are never 'undefined', as vue will set them to a special proxy object
export const globals = reactive({
    /** @type {Project} */
    project: {
        name: '',
        chords: [],  // original chord configs
        songs: {},
        chordSequences: {
            default: { mml: "t100o4l8c1d1c1d1e1f1g1g1", tempo: 99 },
        },
        options: {}
    },
    idsToDelete: [],  // ids of chords to delete, cleared after deletion
    maxChordConfigs: maxChordConfigs,  // max number of chord configs to show in chord configs list

    chordTriggerMap: {},
    scaleTriggerMap: {},
    statistics: {},

    currentChordTriggerNote: undefined,  // incl. octave e.g. e.g. "D2"
    currentScaleFilter: 'scale1',  // e.g. 'scale1', 'scale2', 'scale3', 'notesOfChord'
    get currentProjectScaleName() {  // access as a property without the () call
        return this.currentChordConfig()[this.currentScaleFilter]
    },
    get currentScaleName() {  // access as a property without the () call
        if (this.scaleOverrideName)
            return `${this.scaleOverrideName} (override)`
        // incl. tonic e.g. "C major", may also be a custom chord name or special 'notes of chord' name
        if (this.currentScaleFilter == 'notesOfChord')
            return 'notes of chord'
        return this.currentChordConfig()[this.currentScaleFilter]
    },
    get currentScaleNotes() {  // access as a property without the () call
        if (this.scaleOverrideName.length > 0 && this.scaleOverrideNotes.length > 0) {
            // console.log('GETcurrentScaleNotes: override')
            return this.scaleOverrideNotes
        }
        if (this.scaleFiltering.frozen) {
            // console.log('GETcurrentScaleNotes: frozen')
            return this.scaleFiltering.frozenScaleNotes
        }
        if (this.currentScaleFilter == 'notesOfChord') {
            // console.log('GETcurrentScaleNotes: notesOfChord')
            return this.currentChordConfig().scaleNotesOfChord
        }
        // console.log('GETcurrentScaleNotes: normal')
        return this.currentChordConfig()[`${this.currentScaleFilter}Notes`]
    },
    get currentScaleEmpty() {  // access as a property without the () call
        if (this.currentScaleFilter == 'notesOfChord')
            return this.currentChordConfig().scaleNotesOfChord.length == 0
        return globals.currentChordConfig()[globals.currentScaleFilter].length == 0
    },
    scaleOverrideName: '',
    scaleOverrideNotes: [],
    currentJamNote: { real: '', mapped: '' },
    currentRawLiveNote: '',

    jamTriggerOctave: '',  // needs to be calculated when load a keyboard and depends on num lh trigger notes

    chordPicker: {
        currentRoot: 'C',
        currentChord: 'M',
        currentBass: '',
        currentChordInversion: 0,
        inversionChangesBass: true,
        showAllChords: false,
        shortChordNames: true,
    },

    get superUser() {
        // Debug panels are only shown in development builds
        return !isProduction
    },

    // ┌─┐┌─┐┌┬┐┬┌─┐┌┐┌┌─┐
    // │ │├─┘ │ ││ ││││└─┐
    // └─┘┴   ┴ ┴└─┘┘└┘└─┘
    importMidiUnrecognisedChords: false,
    playChordBass: false,  // play bass note of chord on channel 2, as well as on the bass channel 3
    playBassOnly: false,  // play bass note only
    playChordOnly: false,  // play chord channel only
    delayBassToChord: 0,  // delay bass note to chord, 0.5 is not a bad value
    allocateFavourites: true,  // allocate favourites when allocating project.chords -> globals.chordTriggerMap
    scaleFilteringModificationSticky: true,  // whether e.g. 'scale2' is preserved during chord changes
    scaleFilteringEnabled: true,
    keyboardHelpMode: 'off',  // 'off' | 'black' | 'white' | 'all' - text overlays on the main keyboard
    debugJamChord: false,
    syncChordPickerToJamChord: true,
    syncChordPickerToCurrentTriggeredChord: true,
    enableLhChordTriggers: true,

    scaleFiltering: {
        _frozen: false,  // whether scale filtering is frozen or changes as chords change

        // These should always match the currentScaleName caused by lh trigger note chord changes
        // unless frozen is true. UI combo reflects this info. jamming map always respects this.
        scaleType: '', // scale type, sans tonic e.g. 'major', 'minor'
        scaleTonic: 'C',
        frozenScaleNotes: [],  // when frozen, these are the last used scale notes

        scaleTypesMatchingCurrentChord: undefined, // e.g. ['major', 'minor', 'harmonic minor', 'melodic minor']
        chordsThatFitScale: [],  // list of chords that fit the scale
        modesOfScale: [],  // list of modes of scale, if any https://github.com/tonaljs/tonal/tree/main/packages/scale 

        // buildNoteMap options
        strategy: 'CToC',  // 'CToScaleTonic', // or 'CToC'
        preserveOctaves: false,
        padWithLastGoodNote: true,  // only works with preserveOctaves: true
        autoDropOctave: true,  // only works with 'CToScaleTonic' strategy
        backfill: true,
        get frozen() {
            // console.log('GET frozen', this._frozen)
            return this._frozen
        },
        set frozen(value) {
            if (value) {
                this.frozenScaleNotes = globals.currentScaleNotes
            } else {
                this.frozenScaleNotes = [];
            }
            this._frozen = value
        }
    },
    // these are both called via the Ab and Bb piano buttons via src/lib/wire-events.js
    toggleScaleStrategy() {
        const v = this.scaleFiltering.strategy == 'CToC'
        this.scaleFiltering.strategy = v ? 'CToScaleTonic' : 'CToC'
    },
    toggleScalePreserveOctaves() {
        this.scaleFiltering.preserveOctaves = !this.scaleFiltering.preserveOctaves
    },
    keySignatureDetection: {
        allChordsInProject: [],
        allChordNotesInProject: [],
        keyFromChords: [],
        keyFromChordNotes: [],
        music21Result: {},
        // options
        fromEntireProject: false,  // or from visible chord list of chord trigger map
        fromFavouritesOnly: true,  // or from favourites
        callMusic21Server: false,
    },

    currentChordBeingJammed: {
        // We use the same names as a `ChordConfig`
        chord: '',      // first chordSymbol in chordSymbols sans bass note e.g. 'Cmaj7'
        chordNotes: [], // list of chord notes, e.g. ['C', 'E', 'G', 'B']
        symbols: [],    // chord symbols detected by Tonal e.g. ['Cmaj7/G', ...]
        bass: '',       // first chordSymbol bass note, if any e.g. 'G'

        // Note, the following are not available in a `ChordConfig`
        type: '',       // first chordSymbol in chordSymbols sans root, sans bass e.g. 'maj7'
        tonic: '',      // first chordSymbol root note, if any e.g. 'C'
        stale: true,    // last chord detection failed, so chord is not currently indicative of a user jam chord 
    },
    clearCurrentChordBeingJammed() {
        this.currentChordBeingJammed.chord = ''
        this.currentChordBeingJammed.chordNotes = []
        this.currentChordBeingJammed.symbols = []
        this.currentChordBeingJammed.bass = ''

        this.currentChordBeingJammed.type = ''
        this.currentChordBeingJammed.tonic = ''
    },

    projectUrl: '',
    projects: [],  // featured project combo entries { text, value }, populated from the manifest
    projectLibrary: {
        projectNames: [],  // featured project names (static library)
        userProjectNames: [],  // locally saved project names (IndexedDB)
        projectName: '',   // current project name
        projectIsUserOrFeatured: '',  // 'user' or 'featured'
    },
    get isProjectLoaded() {
        // A project is loaded if the globals.chordTriggerMap becomes populated
        return (this.chordTriggerMap != undefined && Object.keys(globals.chordTriggerMap).length !== 0)
    },

    boot: {
        // 'unknown' | 'booting' | 'ready' | 'error'
        status: 'unknown',
        message: '',
    },
    keyboardsDetected: [],  // list of MIDI input keyboard names detected on User's system
    midiAccess: {
        // 'unknown' | 'granted' | 'denied' | 'unsupported' | 'error'
        status: 'unknown',
        message: '',
    },
    keyboard: {             // current keyboard config JSON
        name: '',
        lhTriggerOctave: 3,
        rhJamSoundOctave: 4,
    },
    keyboardsAvailable: [],  // list of keyboard config names from the static manifest
    keyboardsManifest: [],   // keyboard manifest entries { text, value, file }

    lhMetaKeys: {
        lhCsharp: 'C#',  // lhTriggerOctave will be added later, based on current keyboard config
        lhDsharp: 'D#',
        lhFsharp: 'F#',
        lhGsharp: 'G#',
        lhAsharp: 'A#',
    },

    myOutput: undefined,
    mySynth: undefined,
    channel: undefined,
    channel2: undefined,
    channel3: undefined,

    // Records which allowed note to turn off, key is real note, value is allowed note.
    // Needed because looking up current note mappings is often wrong, mapping could have changed.
    pendingNoteOffs: {},
    pendingChordBassNoteOffs: {},
    // For chords, key is real lh note trigger, value is array of chord notes.
    pendingChordNoteOffs: {},

    // which black modifier keys are currenty pressed, key is black note, value is true if pressed
    blackKeysDownMap: {},
    // whether the C# black shifter is pressed
    blackShiftState: false,

    keyState: {
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
    },

    // By setting this to true any click in the UI will enable web sounds without having to 
    // explicitly 'switch on' gm sounds in the UI.
    GM: true,

    // ┌─┐┬ ┬┌─┐┬─┐┌┬┐╔╦╗┬─┐┬┌─┐┌─┐┌─┐┬─┐╔╦╗┌─┐┌─┐
    // │  ├─┤│ │├┬┘ ││ ║ ├┬┘││ ┬│ ┬├┤ ├┬┘║║║├─┤├─┘  functions
    // └─┘┴ ┴└─┘┴└──┴┘ ╩ ┴└─┴└─┘└─┘└─┘┴└─╩ ╩┴ ┴┴    

    // Warning: All these getters refer to the chord trigger map config and NOT
    // the project configs Arguably we should have project versions of these, or
    // perhaps a parameter to decide which we want? 

    currentChordName() {
        return this.currentChordConfig().chord
    },

    currentLhNotes() {
        return this.currentChordConfig().chordNotes
    },

    currentBass() {
        return this.currentChordConfig().bass
    },

    currentConfigEmpty() {
        const chordTriggerNote = globals.currentChordTriggerNote
        const result =
            !globals.project ||
            !chordTriggerNote ||
            !(chordTriggerNote in globals.chordTriggerMap)
        return result
    },

    /** 
     * Gets the current `ChordConfig` from the chord trigger map.
     * @returns {ChordConfig} An empty dummy `ChordConfig` if no current config is found.
     */
    currentChordConfig() {
        let chordTriggerNote = globals.currentChordTriggerNote

        /** @type {ChordConfig } */
        const emptyConfig = {
            id: -1,
            name: '',
            chord: '',
            chordNotes: [],
            symbols: '',
            bass: '',
            bassNote: '',
            scale1: '',
            scale2: '',
            scale3: '',
            scaleNotesOfChord: [],
        }

        return this.currentConfigEmpty() ? emptyConfig : globals.chordTriggerMap[chordTriggerNote]
    },

    getTriggerNote(n) {
        return Object.keys(globals.chordTriggerMap)[n]
    },

    getResolvedChordsConfig() {
        return stringify(globals.chordTriggerMap)
    },

    // ┌─┐┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
    // ├─┘├┬┘│ │ │├┤ │   │    functions
    // ┴  ┴└─└─┘└┘└─┘└─┘ ┴ 

    getProjectConfig() {
        let _project = JSON.parse(JSON.stringify(globals.project))  // clone
        return getProjectForPersistence(_project, true, false)  // slim true, meta false
    },

    getLhTriggerOctave() {
        // return the keyboard config value, unless its been overriden by the project config
        let result = globals.keyboard.lhTriggerOctave
        try {
            result = globals.project.options.keyboard.lhTriggerOctave
        // eslint-disable-next-line no-empty
        } catch (error) {
        }
        return result
    },
    getRhJamSoundOctave() {
        // return the keyboard config value, unless its been overriden by the project config
        let result = globals.keyboard.rhJamSoundOctave
        try {
            result = globals.project.options.keyboard.rhJamSoundOctave
        // eslint-disable-next-line no-empty
        } catch (error) {
        }
        return result
    },

    get firstNoteOfCurrentRhScale() {  // access as a property without the () call
        if (globals.currentScaleNotes === undefined || Object.keys(globals.currentScaleNotes).length === 0)
            return '?'
        else
            return globals.currentScaleNotes[0]
    },

    isLhMetaKey: function (note) {
        return Object.values(this.lhMetaKeys).includes(note)
    },

    get bypass() { return !globals.scaleFilteringEnabled && !globals.enableLhChordTriggers },
    set bypass(v) {
        // console.log('bypass', v)
        if (v) {
            globals.scaleFilteringEnabled = false;
            globals.enableLhChordTriggers = false
        }
        else {
            globals.scaleFilteringEnabled = true;
            globals.enableLhChordTriggers = true

        }
    }


})


/*
┌┐┌┌─┐┌┬┐┌─┐┌─┐
││││ │ │ ├┤ └─┐
┘└┘└─┘ ┴ └─┘└─┘
Notes on getters vs. functions on the reactive globals object:

Define a getter on the reactive globals object - which is accessed like properties 
of the globals object - not via a function call.

    get blah() {...}

Define a normal function on the reactive globals object

    blah() {...}

Can also keep getters in the vue createApp 'app' object, which is really any
script area of any component, thus is local to that component.

*/


// testing
export const store = reactive({
    count: 0,
    inc() {
        this.count++
    }
})
// export const store = ref({
//     count: 0,
//     inc() {
//         this.count++
//     }
// })
