// @ts-check
import { reactive } from 'vue'
import { maxChordConfigs } from './globals-config.js'
import { stringify } from './prettyjson.js'
import { getProjectForPersistence } from './projectSerialize.js'
import { resolveProjectKey, projectKeyName, projectKeyNotes, projectColour, setProjectColour, transposeKey } from './projectKey.js'
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
    // Recent chord triggers and the scale each sounded, newest last. Bounded by
    // autoScale.js. Used by the follow and shuffle scale policies.
    chordHistory: [],
    // Recent right-hand solo notes (pitch classes), newest last. Bounded by
    // autoScale.js and used by the phrase-aware bias when it is enabled.
    recentSoloNotes: [],
    get currentProjectScaleName() {  // access as a property without the () call
        return this.currentChordConfig()[this.currentScaleFilter]
    },
    get currentScaleName() {  // access as a property without the () call
        if (this.scaleOverrideName)
            return `${this.scaleOverrideName} (override)`
        if (this.soloMode === 'key' && this.scaleFiltering.keyModeActive) {
            const key = this.getProjectKey()
            if (key)
                return projectKeyName(key)
        }
        if (this.scaleFiltering.autoScaleName)
            return `${this.scaleFiltering.autoScaleName} (auto)`
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
        // A live auto/shuffle scale that is not one of the stored slots.
        if (this.scaleFiltering.autoScaleNotes.length > 0)
            return this.scaleFiltering.autoScaleNotes
        if (this.soloMode === 'key' && this.scaleFiltering.keyModeActive) {
            const key = this.getProjectKey()
            const keyNotes = key ? projectKeyNotes(key) : []
            if (keyNotes.length > 0)
                return keyNotes
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
        // Some developer-only extras (such as config dumps) are shown only in
        // development builds. The Settings view's Debug section is always shown.
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
    keyboardHelpMode: 'all',  // 'off' | 'black' | 'white' | 'all' - text overlays on the main keyboard
    showKeyShortcuts: false,  // show the computer-keyboard key badges on the main keyboard
    showScaleAdvanced: false,  // show the advanced follow/shuffle policy options above the grid
    showScaleHistory: false,  // show the recent chord-to-scale strip above the grid
    showScaleCellFill: false,  // fill the current scale-filter cell instead of a border only
    showWelcomeDialog: true,  // show the welcome message when a demo project is loaded
    showFavouriteBinColumns: false,  // show the favourite and bin columns in the chord/scale table
    helpPage: 'overview',  // which Help page is open: 'overview' | 'tutorial' | 'reference'
    debugJamChord: false,
    syncChordPickerToJamChord: true,
    syncChordPickerToCurrentTriggeredChord: true,
    enableLhChordTriggers: true,

    // Global repair of held right-hand solo notes when a chord trigger changes
    // the scale just after a note started. Configured on the Settings page, not
    // in the scale policy options. See src/lib/midi/remap-held-solo-notes.js.
    heldNoteRepair: {
        enabled: true,   // move a still-sounding note onto the new scale
        windowMs: 40,    // only correct notes started within this many ms
    },

    scaleFiltering: {
        _frozen: false,  // whether scale filtering is frozen or changes as chords change
        keyModeActive: false,  // true while the active scale is the project key scale (solo mode 'key')

        // How the per-chord scale is chosen on a chord trigger:
        // 'manual' follows the sticky scale1/2/3 slot as before, 'follow' picks
        // the stored slot that continues the previous scale best, and 'shuffle'
        // picks a live scale from the top ranked candidates for variety.
        // See src/lib/autoScale.js.
        policy: 'manual',
        autoScaleName: '',  // live auto/shuffle scale when it is not a stored slot
        autoScaleNotes: [],
        autoReason: '',  // short explanation of the last automatic scale choice

        // Options for the follow and shuffle policies. See doco/SCALE-POLICIES.md.
        // The shuffle defaults are the 'Subtle' preset: stay on the three stored
        // scales, hold a drawn rank for two chord changes, and keep each shift
        // within one substituted note. Varied and Wild are one click away.
        policyOptions: {
            poolSize: 3,            // shuffle: ranked candidates to draw from (3-8)
            dwell: 2,               // shuffle: chord changes to hold the drawn rank
            changeChance: 1,        // shuffle: chance to redraw at a dwell boundary (0-1)
            maxNewNotes: 1,         // shuffle: max pitch classes a change may move (0-7)
            deferWhilePlaying: true,// shuffle: wait for held solo notes to release
            contextChords: 1,       // follow: how many previous chords to consider (1-2)
            phraseBias: false,      // follow/shuffle: bias by the last solo note
            phraseStrength: 1,      // phrase bias strength (0.5 low, 1 medium, 2 high)
            palette: 'primary',     // follow: primary / colour / bold stored-scale palette
        },
        shuffleRank: null,          // shuffle: rank index currently held (0-based)
        shuffleDwellRemaining: 0,   // shuffle: chord changes left before a redraw
        shuffleChordId: null,       // chord id the current shuffle draw belongs to
        shuffleDeferred: false,     // a draw was postponed while solo notes sounded
        // A manual scale pick (grid click, 1-4 shortcut or MIDI black key)
        // overrides the policy. manualScaleFilter is the chosen slot
        // ('scale1'/'scale2'/'scale3'/'notesOfChord'), manualScaleNote is the
        // chord it was made on. It is kept while that chord keeps sounding and
        // is carried to the next different chord once, so the pick works for
        // the next chord hit either way.
        manualScaleFilter: '',
        manualScaleNote: '',

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
                // The locked notes are now authoritative; drop the live
                // auto/shuffle state and its explanation.
                this.autoScaleName = ''
                this.autoScaleNotes = []
                this.autoReason = ''
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
        fromEntireProject: true,  // or from visible chord list of chord trigger map
        fromFavouritesOnly: false,  // or from favourites
        callMusic21Server: false,
    },

    // The resolved project key { tonic, type, source }, set when a project is
    // loaded. See src/lib/projectKey.js and doco/MUSIC-THEORY.md.
    projectKey: null,
    // Semitones the live trigger map has been transposed by (Alt+3/Alt+4, the
    // left-hand black keys, or the circle-of-fifths shortcuts). The written
    // project key never changes; this offset is applied on top of it by
    // getProjectKey().
    transpositionSemitones: 0,
    getProjectKey() {
        const key = this.projectKey ?? resolveProjectKey(this.project)
        return transposeKey(key, this.transpositionSemitones)
    },
    getProjectColour() {
        return projectColour(this.project)
    },
    setColour(colour) {
        return setProjectColour(this.project, colour)
    },
    get soloMode() {
        // 'chord' (default) follows scale1/2/3 as the chord changes;
        // 'key' keeps the right hand on the project key scale.
        return this.project?.options?.soloMode === 'key' ? 'key' : 'chord'
    },
    setSoloMode(mode) {
        if (!this.project.options)
            this.project.options = {}
        this.project.options.soloMode = mode === 'key' ? 'key' : 'chord'
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
    classicProjects: [],  // classic project combo entries { text, value }, populated from the manifest
    projectLibrary: {
        projectNames: [],  // featured project names (static library)
        classicProjectNames: [],  // classic project names (static library)
        userProjectNames: [],  // locally saved project names (IndexedDB)
        projectName: '',   // current project name
        projectIsUserOrFeatured: '',  // 'user' | 'featured' | 'classic'
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
    // Live hardware-MIDI activity, updated by src/lib/midi/midi-monitor.js for
    // every incoming message on any input, whether or not a keyboard config is
    // selected. Drives the top-bar activity dot and the MIDI Keyboard Config
    // debug log.
    midiActivity: {
        seen: false,       // true once any note has been received
        pulse: 0,          // increments on each message, used to trigger the dot
        lastAt: 0,         // Date.now() of the last message
        lastNote: '',      // note identifier (or formatted message) last seen
        lastOctave: null,  // octave of the last note, e.g. 3 for C3
        lastState: '',     // last message type, e.g. 'noteon'
        lastInput: '',     // name of the input the last message came from
        // The raw message log is only kept while the debug area is open, so a
        // busy keyboard cannot fill memory during normal use.
        captureLog: false,
        log: [],           // recent formatted messages, newest last
        logLimit: 100,
    },
    keyboard: {             // current keyboard config JSON
        name: '',
        lhTriggerOctave: 3,
        rhJamSoundOctave: 4,
    },
    // Number of octaves shown on the on-screen performance keyboard (2-6).
    // The lowest key is always the chord-trigger octave, and extra octaves
    // extend upward, so the chord trigger octave stays first/lowest. This only
    // changes what is drawn; notes can still be played anywhere. Persisted via
    // src/lib/uiPrefs.js.
    keyboardOctaves: 2,
    // Click track on/off, toggled next to the BPM in the top bar.
    metronomeEnabled: false,
    computerKeyboard: {     // normal-piano computer-keyboard state
        octaveShift: 0,
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

    // Live MIDI recording of a performance. Chords (and bass) go on the
    // 'chords' track and scale-filtered jam notes go on the 'jam' track.
    recording: {
        isRecording: false,
        bpm: 120,
        ppq: 480,
        startedAt: 0,  // audioContext.currentTime when recording started
        take: { chords: [], jam: [] },  // committed { midi, startTick, durationTicks, velocity }
        held: { chords: {}, jam: {} },  // noteName -> { midi, velocity, startTick }
        hasTake: false,  // a take with at least one note is ready to export
        lastRecordingSeconds: 0,  // wall-clock length of the last recording
        // Notes sounded by the chord sequencer since it last started. They are
        // merged into the take on stop, so this gives the Record section a live
        // count while the pattern plays.
        live: { chords: 0, jam: 0 },
        // When true the recorder ignores incoming notes. Used while the pattern
        // sequencer loops, so its notes are not captured live (they are merged
        // into the take on stop instead) and for piano-strip auditions.
        suppressCapture: false,
        // A hidden, always-on buffer that keeps the last few minutes of playing
        // so a take the user forgot to record can be recovered. `enabled` and
        // `windowSec` are persisted in uiPrefs; the rest is a read-only summary
        // of the module-local buffer in src/lib/midi/background-recorder.js.
        background: {
            enabled: true,
            windowSec: 120,
            noteCount: 0,
            available: false,
        },
        playback: {
            isPlaying: false,
            isScrubbing: false,
            positionSec: 0,
            durationSec: 0,
            // Which keys light up on the piano keyboard during playback:
            // 'played' (the keys pressed, red), 'sounding' (the notes that
            // sound, blue) or 'both'. 'played' is red like live playing.
            highlightMode: 'played',
            // MIDI numbers of the sounding notes currently tinted blue by the
            // overlay in 'sounding' and 'both' modes.
            soundingKeys: [],
        },
    },

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
