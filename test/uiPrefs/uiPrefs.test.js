import assert from 'assert'
import { readPrefs, writePrefs, loadUiPrefs, currentPrefs, KEYBOARD_HELP_MODES, KEYBOARD_OCTAVE_MIN, KEYBOARD_OCTAVE_MAX, clampKeyboardOctaves, BPM_MIN, BPM_MAX, clampBpm } from '@/lib/uiPrefs.js'
import { globals } from '@/lib/globals.js'

function fakeStorage(initial = {}) {
    const data = { ...initial }
    return {
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => { data[key] = String(value) },
        removeItem: (key) => { delete data[key] },
        _data: data,
    }
}

describe('uiPrefs', () => {

    it('defaults the keyboard help mode to black and white', () => {
        assert.equal(globals.keyboardHelpMode, 'all')
    })

    it('defaults the keyboard to two octaves', () => {
        assert.equal(globals.keyboardOctaves, 2)
    })

    it('defaults the scale policy options panel to hidden', () => {
        assert.equal(globals.showScaleAdvanced, false)
        assert.equal(readPrefs(fakeStorage()).scaleAdvanced, undefined)
    })

    it('returns empty prefs when nothing is stored', () => {
        assert.deepEqual(readPrefs(fakeStorage()), {})
    })

    it('ignores an invalid keyboard help mode', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ keyboardHelpMode: 'nonsense' }) })
        assert.deepEqual(readPrefs(storage), {})
    })

    it('reads and validates the shortcut badge flag', () => {
        const on = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showKeyShortcuts: true }) })
        assert.equal(readPrefs(on).showKeyShortcuts, true)
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showKeyShortcuts: 'yes' }) })
        assert.equal(readPrefs(bad).showKeyShortcuts, undefined)
    })

    it('defaults the welcome dialog to shown', () => {
        assert.equal(globals.showWelcomeDialog, true)
    })

    it('reads and validates the welcome dialog flag', () => {
        const off = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showWelcomeDialog: false }) })
        assert.equal(readPrefs(off).showWelcomeDialog, false)
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showWelcomeDialog: 'no' }) })
        assert.equal(readPrefs(bad).showWelcomeDialog, undefined)
    })

    it('loads the welcome dialog flag into globals', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showWelcomeDialog: false }) })
        loadUiPrefs(storage)
        assert.equal(globals.showWelcomeDialog, false)
        globals.showWelcomeDialog = true
    })

    it('defaults the favourite/bin columns to hidden', () => {
        assert.equal(globals.showFavouriteBinColumns, false)
    })

    it('reads and validates the favourite/bin columns flag', () => {
        const on = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showFavouriteBinColumns: true }) })
        assert.equal(readPrefs(on).showFavouriteBinColumns, true)
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showFavouriteBinColumns: 'yes' }) })
        assert.equal(readPrefs(bad).showFavouriteBinColumns, undefined)
    })

    it('loads the favourite/bin columns flag into globals', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showFavouriteBinColumns: true }) })
        loadUiPrefs(storage)
        assert.equal(globals.showFavouriteBinColumns, true)
        globals.showFavouriteBinColumns = false
    })

    it('round-trips the favourite/bin columns flag', () => {
        const storage = fakeStorage()
        writePrefs({ showFavouriteBinColumns: true }, storage)
        assert.equal(readPrefs(storage).showFavouriteBinColumns, true)
    })

    it('reads, loads and round-trips the scale history flag', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ scaleHistory: true }) })
        assert.equal(readPrefs(storage).scaleHistory, true)
        loadUiPrefs(storage)
        assert.equal(globals.showScaleHistory, true)
        globals.showScaleHistory = false
        const roundTrip = fakeStorage()
        writePrefs({ scaleHistory: true }, roundTrip)
        assert.equal(readPrefs(roundTrip).scaleHistory, true)
    })

    it('reads, loads and round-trips the scale-cell fill flag', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showScaleCellFill: true }) })
        assert.equal(readPrefs(storage).showScaleCellFill, true)
        loadUiPrefs(storage)
        assert.equal(globals.showScaleCellFill, true)
        globals.showScaleCellFill = false
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showScaleCellFill: 'yes' }) })
        assert.equal(readPrefs(bad).showScaleCellFill, undefined)
        const roundTrip = fakeStorage()
        writePrefs({ showScaleCellFill: true }, roundTrip)
        assert.equal(readPrefs(roundTrip).showScaleCellFill, true)
    })

    it('loads the shortcut badge flag into globals', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ showKeyShortcuts: true }) })
        loadUiPrefs(storage)
        assert.equal(globals.showKeyShortcuts, true)
        globals.showKeyShortcuts = false
    })

    it('round-trips the shortcut badge flag', () => {
        const storage = fakeStorage()
        writePrefs({ keyboardHelpMode: 'all', showKeyShortcuts: true }, storage)
        const prefs = readPrefs(storage)
        assert.equal(prefs.keyboardHelpMode, 'all')
        assert.equal(prefs.showKeyShortcuts, true)
    })

    it('reports the current prefs from globals', () => {
        globals.keyboardHelpMode = 'white'
        globals.showKeyShortcuts = true
        globals.keyboardOctaves = 5
        globals.recording.bpm = 140
        globals.metronomeEnabled = true
        globals.showWelcomeDialog = false
        globals.showFavouriteBinColumns = true
        globals.helpPage = 'tutorial'
        globals.scaleFiltering.policy = 'manual'
        globals.showScaleAdvanced = false
        globals.scaleFiltering.policyOptions.poolSize = 6
        globals.scaleFiltering.policyOptions.dwell = 1
        globals.scaleFiltering.policyOptions.changeChance = 1
        globals.scaleFiltering.policyOptions.maxNewNotes = 1
        globals.scaleFiltering.policyOptions.deferWhilePlaying = true
        globals.scaleFiltering.policyOptions.variety = 'gentle'
        globals.scaleFiltering.policyOptions.contextChords = 1
        globals.scaleFiltering.policyOptions.phraseBias = false
        globals.scaleFiltering.policyOptions.phraseStrength = 1
        globals.scaleFiltering.policyOptions.palette = 'primary'
        globals.heldNoteRepair.enabled = true
        globals.heldNoteRepair.windowMs = 40
        globals.showScaleHistory = false
        globals.showScaleCellFill = true
        globals.recording.background.enabled = true
        globals.recording.background.windowSec = 120
        assert.deepEqual(currentPrefs(), {
            keyboardHelpMode: 'white',
            showKeyShortcuts: true,
            keyboardOctaves: 5,
            bpm: 140,
            metronomeEnabled: true,
            showWelcomeDialog: false,
            showFavouriteBinColumns: true,
            helpPage: 'tutorial',
            scalePolicy: 'manual',
            scaleAdvanced: false,
            scaleHistory: false,
            showScaleCellFill: true,
            policyOptions: { poolSize: 6, dwell: 1, changeChance: 1, maxNewNotes: 1, deferWhilePlaying: true, variety: 'gentle', contextChords: 1, phraseBias: false, phraseStrength: 1, palette: 'primary' },
            heldNoteRepair: { enabled: true, windowMs: 40 },
            backgroundCaptureEnabled: true,
            backgroundCaptureWindowSec: 120,
        })
        globals.showWelcomeDialog = true
        globals.showFavouriteBinColumns = false
        globals.helpPage = 'overview'
        globals.showScaleCellFill = false
        globals.keyboardOctaves = 2
        globals.recording.bpm = 120
        globals.metronomeEnabled = false
    })

    it('reads, loads and round-trips the metronome flag', () => {
        const on = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ metronomeEnabled: true }) })
        assert.equal(readPrefs(on).metronomeEnabled, true)
        loadUiPrefs(on)
        assert.equal(globals.metronomeEnabled, true)
        globals.metronomeEnabled = false
        const roundTrip = fakeStorage()
        writePrefs({ metronomeEnabled: true }, roundTrip)
        assert.equal(readPrefs(roundTrip).metronomeEnabled, true)
    })

    it('clamps the keyboard octave count to the supported range', () => {
        assert.equal(clampKeyboardOctaves(1), KEYBOARD_OCTAVE_MIN)
        assert.equal(clampKeyboardOctaves(99), KEYBOARD_OCTAVE_MAX)
        assert.equal(clampKeyboardOctaves(4.6), 5)
        assert.equal(clampKeyboardOctaves('nonsense'), undefined)
    })

    it('reads and validates the keyboard octave count', () => {
        const good = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ keyboardOctaves: 5 }) })
        assert.equal(readPrefs(good).keyboardOctaves, 5)
        const clamped = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ keyboardOctaves: 99 }) })
        assert.equal(readPrefs(clamped).keyboardOctaves, KEYBOARD_OCTAVE_MAX)
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ keyboardOctaves: 'wide' }) })
        assert.equal(readPrefs(bad).keyboardOctaves, undefined)
    })

    it('loads the keyboard octave count into globals', () => {
        loadUiPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ keyboardOctaves: 3 }) }))
        assert.equal(globals.keyboardOctaves, 3)
        globals.keyboardOctaves = 2
    })

    it('round-trips the keyboard octave count', () => {
        const storage = fakeStorage()
        writePrefs({ keyboardOctaves: 6 }, storage)
        assert.equal(readPrefs(storage).keyboardOctaves, 6)
    })

    it('clamps the BPM to the supported range', () => {
        assert.equal(clampBpm(10), BPM_MIN)
        assert.equal(clampBpm(999), BPM_MAX)
        assert.equal(clampBpm(128.4), 128)
        assert.equal(clampBpm('fast'), undefined)
    })

    it('reads and validates the BPM', () => {
        const good = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ bpm: 128 }) })
        assert.equal(readPrefs(good).bpm, 128)
        const clamped = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ bpm: 999 }) })
        assert.equal(readPrefs(clamped).bpm, BPM_MAX)
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ bpm: 'fast' }) })
        assert.equal(readPrefs(bad).bpm, undefined)
    })

    it('loads the BPM into globals', () => {
        loadUiPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ bpm: 132 }) }))
        assert.equal(globals.recording.bpm, 132)
        globals.recording.bpm = 120
    })

    it('round-trips the BPM', () => {
        const storage = fakeStorage()
        writePrefs({ bpm: 96 }, storage)
        assert.equal(readPrefs(storage).bpm, 96)
    })

    it('reads, validates and clamps the shuffle options', () => {
        const good = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { poolSize: 8, dwell: 3, changeChance: 0.5, maxNewNotes: 2, deferWhilePlaying: false, contextChords: 2 } }) })
        assert.deepEqual(readPrefs(good).policyOptions, { poolSize: 8, dwell: 3, changeChance: 0.5, maxNewNotes: 2, deferWhilePlaying: false, contextChords: 2 })
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { poolSize: 99, dwell: 0, changeChance: 5, maxNewNotes: 99, contextChords: 5 } }) })
        assert.deepEqual(readPrefs(bad).policyOptions, { poolSize: 8, dwell: 1, changeChance: 1, maxNewNotes: 7, contextChords: 2 })
    })

    it('reads, validates and loads the shuffle variety', () => {
        const good = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { variety: 'lively' } }) })
        assert.deepEqual(readPrefs(good).policyOptions, { variety: 'lively' })
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { variety: 'wild' } }) })
        assert.equal(readPrefs(bad).policyOptions, undefined)
        loadUiPrefs(good)
        assert.equal(globals.scaleFiltering.policyOptions.variety, 'lively')
        globals.scaleFiltering.policyOptions.variety = 'gentle'
    })

    it('loads the shuffle options and advanced flag into globals', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ scaleAdvanced: true, policyOptions: { poolSize: 4, dwell: 2, changeChance: 0.25 } }) })
        loadUiPrefs(storage)
        assert.equal(globals.showScaleAdvanced, true)
        assert.deepEqual({ ...globals.scaleFiltering.policyOptions }, { poolSize: 4, dwell: 2, changeChance: 0.25, maxNewNotes: 1, deferWhilePlaying: true, variety: 'gentle', contextChords: 1, phraseBias: false, phraseStrength: 1, palette: 'primary' })
        globals.showScaleAdvanced = false
        globals.scaleFiltering.policyOptions.poolSize = 6
        globals.scaleFiltering.policyOptions.dwell = 1
        globals.scaleFiltering.policyOptions.changeChance = 1
        globals.scaleFiltering.policyOptions.maxNewNotes = 1
        globals.scaleFiltering.policyOptions.deferWhilePlaying = true
        globals.scaleFiltering.policyOptions.variety = 'gentle'
    })

    it('round-trips the shuffle options', () => {
        const storage = fakeStorage()
        writePrefs({ policyOptions: { poolSize: 5, dwell: 4, changeChance: 0.75 } }, storage)
        assert.deepEqual(readPrefs(storage).policyOptions, { poolSize: 5, dwell: 4, changeChance: 0.75 })
    })

    it('reads, clamps and loads the phrase bias', () => {
        const good = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { phraseBias: true, phraseStrength: 2 } }) })
        assert.deepEqual(readPrefs(good).policyOptions, { phraseBias: true, phraseStrength: 2 })
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { phraseBias: 'yes', phraseStrength: 9 } }) })
        assert.deepEqual(readPrefs(bad).policyOptions, { phraseStrength: 2 })
        loadUiPrefs(good)
        assert.equal(globals.scaleFiltering.policyOptions.phraseBias, true)
        assert.equal(globals.scaleFiltering.policyOptions.phraseStrength, 2)
        globals.scaleFiltering.policyOptions.phraseBias = false
        globals.scaleFiltering.policyOptions.phraseStrength = 1
    })

    it('reads, validates and loads the follow palette', () => {
        const good = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { palette: 'colour' } }) })
        assert.deepEqual(readPrefs(good).policyOptions, { palette: 'colour' })
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { palette: 'nonsense' } }) })
        assert.equal(readPrefs(bad).policyOptions, undefined)
        loadUiPrefs(good)
        assert.equal(globals.scaleFiltering.policyOptions.palette, 'colour')
        globals.scaleFiltering.policyOptions.palette = 'primary'
    })

    it('reads, validates and clamps the held-note repair settings', () => {
        const good = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ heldNoteRepair: { enabled: false, windowMs: 60 } }) })
        assert.deepEqual(readPrefs(good).heldNoteRepair, { enabled: false, windowMs: 60 })
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ heldNoteRepair: { enabled: 'yes', windowMs: -5 } }) })
        assert.deepEqual(readPrefs(bad).heldNoteRepair, { windowMs: 0 })
        // Older saves kept these inside policyOptions; migrate them on read.
        const legacy = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ policyOptions: { remapHeldNotes: false, remapGraceMs: 60 } }) })
        assert.deepEqual(readPrefs(legacy).heldNoteRepair, { enabled: false, windowMs: 60 })
        loadUiPrefs(good)
        assert.equal(globals.heldNoteRepair.enabled, false)
        assert.equal(globals.heldNoteRepair.windowMs, 60)
        globals.heldNoteRepair.enabled = true
        globals.heldNoteRepair.windowMs = 40
    })

    it('reads, validates and loads the Help page', () => {
        assert.equal(readPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ helpPage: 'tutorial' }) })).helpPage, 'tutorial')
        assert.equal(readPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ helpPage: 'reference' }) })).helpPage, 'reference')
        assert.equal(readPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ helpPage: 'nonsense' }) })).helpPage, undefined)
        loadUiPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ helpPage: 'tutorial' }) }))
        assert.equal(globals.helpPage, 'tutorial')
        loadUiPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ helpPage: 'reference' }) }))
        assert.equal(globals.helpPage, 'reference')
        globals.helpPage = 'overview'
    })

    it('round-trips a valid keyboard help mode', () => {
        const storage = fakeStorage()
        for (const mode of KEYBOARD_HELP_MODES) {
            writePrefs({ keyboardHelpMode: mode }, storage)
            assert.equal(readPrefs(storage).keyboardHelpMode, mode)
        }
    })

    it('loads a saved mode into globals', () => {
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ keyboardHelpMode: 'black' }) })
        loadUiPrefs(storage)
        assert.equal(globals.keyboardHelpMode, 'black')
    })

    it('leaves globals untouched for invalid stored data', () => {
        globals.keyboardHelpMode = 'all'
        const storage = fakeStorage({ 'onekeyjam.uiPrefs': 'not json' })
        loadUiPrefs(storage)
        assert.equal(globals.keyboardHelpMode, 'all')
    })

    it('tolerates missing storage', () => {
        assert.deepEqual(readPrefs(null), {})
        assert.doesNotThrow(() => writePrefs({ keyboardHelpMode: 'all' }, null))
        assert.doesNotThrow(() => loadUiPrefs(null))
    })

    it('reads and validates the scale policy', () => {
        for (const policy of ['manual', 'follow', 'shuffle']) {
            const storage = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ scalePolicy: policy }) })
            assert.equal(readPrefs(storage).scalePolicy, policy)
        }
        const bad = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ scalePolicy: 'nonsense' }) })
        assert.equal(readPrefs(bad).scalePolicy, undefined)
    })

    it('loads the scale policy into globals', () => {
        loadUiPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ scalePolicy: 'shuffle' }) }))
        assert.equal(globals.scaleFiltering.policy, 'shuffle')
        globals.scaleFiltering.policy = 'manual'
    })

    it('reports the scale policy from globals', () => {
        globals.scaleFiltering.policy = 'follow'
        assert.equal(currentPrefs().scalePolicy, 'follow')
        globals.scaleFiltering.policy = 'manual'
    })

    it('round-trips the scale policy', () => {
        const storage = fakeStorage()
        writePrefs({ scalePolicy: 'follow' }, storage)
        assert.equal(readPrefs(storage).scalePolicy, 'follow')
    })

    it('reads and validates the background capture settings', () => {
        const good = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ backgroundCaptureEnabled: false, backgroundCaptureWindowSec: 300 }) })
        assert.equal(readPrefs(good).backgroundCaptureEnabled, false)
        assert.equal(readPrefs(good).backgroundCaptureWindowSec, 300)
        const badWindow = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ backgroundCaptureWindowSec: 7 }) })
        assert.equal(readPrefs(badWindow).backgroundCaptureWindowSec, undefined)
        const badFlag = fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ backgroundCaptureEnabled: 'yes' }) })
        assert.equal(readPrefs(badFlag).backgroundCaptureEnabled, undefined)
    })

    it('loads the background capture settings into globals', () => {
        loadUiPrefs(fakeStorage({ 'onekeyjam.uiPrefs': JSON.stringify({ backgroundCaptureEnabled: false, backgroundCaptureWindowSec: 600 }) }))
        assert.equal(globals.recording.background.enabled, false)
        assert.equal(globals.recording.background.windowSec, 600)
        globals.recording.background.enabled = true
        globals.recording.background.windowSec = 120
    })

    it('round-trips the background capture settings', () => {
        const storage = fakeStorage()
        writePrefs({ backgroundCaptureEnabled: true, backgroundCaptureWindowSec: 60 }, storage)
        assert.equal(readPrefs(storage).backgroundCaptureEnabled, true)
        assert.equal(readPrefs(storage).backgroundCaptureWindowSec, 60)
    })
})
