import assert from 'assert'
import { globals } from '@/lib/globals.js'
import { scaleNameToNotes } from '@/lib/scaleToNotes.js'
import { keyDownListener, keyUpListener } from '@/lib/midi/livePianoKeyboardShortcuts.js'
import { initChordPlayEvents } from '@/lib/midi/wire-chord-play-events.js'
import { calculateRhBlackNoteModifierNotes } from '@/lib/midi/wire-events.js'

/*
 * The chord audition and trigger shortcuts:
 * Backquote holds the picked-chord audition, Quote holds the current
 * left-hand chord, ArrowRight steps to and holds the next chord and ArrowLeft
 * steps to and holds the previous chord. All Fn bindings are deleted.
 * See src/lib/midi/livePianoKeyboardShortcuts.js.
 */

function configFor(id, chord, chordNotes, scales) {
    const config = { id, name: chord, chord, chordNotes, bassNote: '', bass: '', symbols: chord, scale1: scales[0], scale2: scales[1], scale3: scales[2], scaleNotesOfChord: chordNotes }
    for (const slot of ['scale1', 'scale2', 'scale3'])
        config[`${slot}Notes`] = scaleNameToNotes(config[slot])
    return config
}

function keyEvent(type, code, overrides = {}, target = null) {
    const event = new KeyboardEvent(type, { code, bubbles: true, ...overrides })
    Object.defineProperty(event, 'target', { value: target || document.body })
    return event
}

function pressDown(code, overrides = {}, target = null) {
    const event = keyEvent('keydown', code, overrides, target)
    let prevented = false
    event.preventDefault = () => { prevented = true }
    keyDownListener(event)
    return { event, prevented }
}

function release(code, overrides = {}, target = null) {
    const event = keyEvent('keyup', code, overrides, target)
    keyUpListener(event)
    return event
}

function textInput() {
    const input = document.createElement('input')
    input.setAttribute('type', 'text')
    return input
}

function setupProjectGlobals() {
    document.broadcastEvent = () => { }
    globals.keyboard = { name: 'test', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
    globals.lhMetaKeys = { lhCsharp: 'C#3', lhDsharp: 'D#3', lhFsharp: 'F#3', lhGsharp: 'G#3', lhAsharp: 'A#3' }
    calculateRhBlackNoteModifierNotes()
    globals.GM = false
    globals.channel = undefined
    globals.channel2 = undefined
    globals.channel3 = undefined
    globals.pendingChordNoteOffs = {}
    globals.pendingChordBassNoteOffs = {}
    globals.pendingNoteOffs = {}
    globals.enableLhChordTriggers = true
    globals.scaleFilteringEnabled = true
    globals.projectKey = { tonic: 'C', type: 'major', source: 'user' }
    globals.project = { options: {}, chords: [], songs: { default: { favourites: [], blacklist: [] } } }
    globals.chordTriggerMap = {
        C3: configFor(1, 'Cmaj7', ['C3', 'E3', 'G3', 'B3'], ['C major', 'C lydian', 'C mixolydian']),
        D3: configFor(2, 'Dm7', ['D3', 'F3', 'A3', 'C4'], ['D dorian', 'D aeolian', 'D minor pentatonic']),
        E3: configFor(3, 'Em7', ['E3', 'G3', 'B3', 'D4'], ['E phrygian', 'E aeolian', 'E minor pentatonic']),
    }
    globals.currentChordTriggerNote = 'C3'
    globals.currentScaleFilter = 'scale1'
    globals.transpositionSemitones = 0
    globals.scaleOverrideName = ''
    globals.scaleOverrideNotes = []
    globals.scaleFiltering.policy = 'manual'
    globals.scaleFiltering.frozen = false
    globals.scaleFiltering.autoScaleName = ''
    globals.scaleFiltering.autoScaleNotes = []
    globals.scaleFiltering.manualScaleNote = ''
    globals.scaleFiltering.manualScaleFilter = ''
    globals.chordHistory = []
    globals.fixedNoteVelocity = 0.8
}

describe('chord play keys', () => {
    let events

    beforeEach(() => {
        setupProjectGlobals()
        events = []
        document.broadcastEvent = (name, detail) => { events.push({ name, detail }) }
    })

    it('Backquote holds the picked-chord audition on and off', () => {
        pressDown('Backquote')
        assert.deepEqual(events, [{ name: 'chord-play', detail: { state: 'on' } }])
        release('Backquote')
        assert.deepEqual(events, [
            { name: 'chord-play', detail: { state: 'on' } },
            { name: 'chord-play', detail: { state: 'off' } },
        ])
    })

    it('Quote holds the current left-hand chord on and off', () => {
        pressDown('Quote')
        assert.deepEqual(events, [{ name: 'chord-play-lh-trigger', detail: { state: 'on' } }])
        release('Quote')
        assert.deepEqual(events, [
            { name: 'chord-play-lh-trigger', detail: { state: 'on' } },
            { name: 'chord-play-lh-trigger', detail: { state: 'off' } },
        ])
    })

    it('ArrowRight holds the next chord and ArrowLeft holds the previous chord', () => {
        pressDown('ArrowRight')
        assert.deepEqual(events, [{ name: 'chord-play-lh-trigger-next', detail: { state: 'on' } }])
        release('ArrowRight')
        assert.deepEqual(events, [
            { name: 'chord-play-lh-trigger-next', detail: { state: 'on' } },
            { name: 'chord-play-lh-trigger-next', detail: { state: 'off' } },
        ])

        events = []
        pressDown('ArrowLeft')
        assert.deepEqual(events, [{ name: 'chord-play-lh-trigger-previous', detail: { state: 'on' } }])
        release('ArrowLeft')
        assert.deepEqual(events, [
            { name: 'chord-play-lh-trigger-previous', detail: { state: 'on' } },
            { name: 'chord-play-lh-trigger-previous', detail: { state: 'off' } },
        ])
    })

    it('ignores repeats and Ctrl, Meta and Alt variants on keydown', () => {
        pressDown('Backquote', { repeat: true })
        pressDown('Backquote', { ctrlKey: true })
        pressDown('Backquote', { metaKey: true })
        pressDown('Backquote', { altKey: true })
        pressDown('ArrowRight', { repeat: true })
        pressDown('ArrowRight', { ctrlKey: true })
        pressDown('ArrowLeft', { altKey: true })
        assert.deepEqual(events, [])
    })

    it('leaves keystrokes alone while typing in a field', () => {
        const input = textInput()
        for (const code of ['Backquote', 'Quote', 'ArrowRight', 'ArrowLeft'])
            pressDown(code, {}, input)
        assert.deepEqual(events, [])
    })

    it('skips arrows from controls that already use them', () => {
        const select = document.createElement('select')
        pressDown('ArrowRight', {}, select)
        pressDown('ArrowLeft', {}, select)
        assert.deepEqual(events, [], 'select keeps its native arrow behaviour')

        for (const type of ['radio', 'range']) {
            const input = document.createElement('input')
            input.setAttribute('type', type)
            pressDown('ArrowRight', {}, input)
        }
        assert.deepEqual(events, [], 'radio and range keep their native arrows')

        const slider = document.createElement('div')
        slider.setAttribute('class', 'grid-resize-handle')
        pressDown('ArrowRight', {}, slider)
        pressDown('ArrowLeft', {}, slider)
        assert.deepEqual(events, [], 'grid-resize slider keeps its arrows')
    })

    it('still turns off by code on keyup even with modifiers or a typing target', () => {
        pressDown('Backquote')
        events = []
        release('Backquote', { ctrlKey: true })
        assert.deepEqual(events, [{ name: 'chord-play', detail: { state: 'off' } }])

        pressDown('ArrowLeft')
        events = []
        release('ArrowLeft', {}, textInput())
        assert.deepEqual(events, [{ name: 'chord-play-lh-trigger-previous', detail: { state: 'off' } }])
    })

    it('prevents the default on arrows so the page does not scroll sideways', () => {
        const right = pressDown('ArrowRight')
        const left = pressDown('ArrowLeft')
        assert.equal(right.prevented, true)
        assert.equal(left.prevented, true)
    })

    it('no longer fires on any Fn key', () => {
        for (const code of ['F1', 'F2', 'F3', 'F4', 'F5']) {
            const down = new KeyboardEvent('keydown', { key: code, code, bubbles: true })
            Object.defineProperty(down, 'target', { value: document.body })
            down.preventDefault = () => { }
            keyDownListener(down)
            const up = new KeyboardEvent('keyup', { key: code, code, bubbles: true })
            Object.defineProperty(up, 'target', { value: document.body })
            keyUpListener(up)
        }
        assert.deepEqual(events, [])
    })
})

describe('chord trigger stepping', () => {
    // The listeners are global, so wire them once for this block. Each test
    // resets the project globals above, which is what the stepping reads.
    beforeAll(() => {
        document.broadcastEvent = (name, detail) => {
            document.dispatchEvent(new CustomEvent(name, { detail }))
        }
        initChordPlayEvents()
    })

    beforeEach(() => {
        setupProjectGlobals()
        document.broadcastEvent = (name, detail) => {
            document.dispatchEvent(new CustomEvent(name, { detail }))
        }
    })

    it('steps to the next chord and wraps from the last chord to the first', () => {
        globals.currentChordTriggerNote = 'C3'
        document.broadcastEvent('chord-play-lh-trigger-next', { state: 'on' })
        assert.equal(globals.currentChordTriggerNote, 'D3')

        globals.currentChordTriggerNote = 'E3'
        document.broadcastEvent('chord-play-lh-trigger-next', { state: 'on' })
        assert.equal(globals.currentChordTriggerNote, 'C3')
    })

    it('steps to the previous chord and wraps from the first chord to the last', () => {
        globals.currentChordTriggerNote = 'C3'
        document.broadcastEvent('chord-play-lh-trigger-previous', { state: 'on' })
        assert.equal(globals.currentChordTriggerNote, 'E3')

        globals.currentChordTriggerNote = 'D3'
        document.broadcastEvent('chord-play-lh-trigger-previous', { state: 'on' })
        assert.equal(globals.currentChordTriggerNote, 'C3')
    })
})
