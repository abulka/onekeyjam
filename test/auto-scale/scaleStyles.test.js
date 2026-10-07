// @ts-check

import assert from 'assert'
import { globals } from '../../src/lib/globals.js'
import { SCALE_POLICIES, POLICY_PRESETS } from '../../src/lib/autoScale.js'
import { PROJECT_COLOURS } from '../../src/lib/chordScaleEngine.js'
import {
    SCALE_STYLES,
    CUSTOM_STYLE,
    scaleStyleByName,
    matchScaleStyle,
    applyScaleStyle,
    syncProjectScaleStyle,
    applyProjectScaleStyle,
} from '../../src/lib/scaleStyles.js'

/** @typedef {import('../../src/lib/typedefs').Project} Project */

/** A minimal project to hang the style state on. */
function makeProject() {
    return {
        name: 'style test',
        chords: [],
        options: { key: { tonic: 'C', type: 'major', source: 'user' }, colour: 'jazz' },
        songs: {},
    }
}

function resetGlobals() {
    globals.chordTriggerMap = {}
    globals.currentChordTriggerNote = undefined
    globals.projectKey = null
    globals.scaleFiltering.frozen = false
    globals.scaleFiltering.policy = 'manual'
    globals.scaleFiltering.manualScaleNote = ''
    globals.scaleFiltering.manualScaleFilter = ''
    Object.assign(globals.scaleFiltering.policyOptions, {
        poolSize: 3,
        dwell: 2,
        changeChance: 1,
        maxNewNotes: 1,
        deferWhilePlaying: true,
        variety: 'gentle',
        contextChords: 1,
        phraseBias: false,
        phraseStrength: 1,
        palette: 'primary',
        preferPrimary: 0,
    })
}

describe('scale styles', () => {

    beforeEach(() => {
        resetGlobals()
        globals.project = /** @type {Project} */ (makeProject())
    })

    it('defines valid, unique styles', () => {
        const names = new Set()
        for (const style of SCALE_STYLES) {
            assert.ok(!names.has(style.name), `duplicate style ${style.name}`)
            names.add(style.name)
            assert.ok(style.label.trim().length > 0, `${style.name} needs a label`)
            assert.ok(style.description.trim().length > 0, `${style.name} needs a description`)
            assert.ok(style.colour === null || PROJECT_COLOURS.includes(style.colour),
                `${style.name} has an unknown colour (or should be null for As written)`)
            assert.ok(SCALE_POLICIES.includes(style.policy), `${style.name} has an unknown policy`)
            if (style.preset) {
                const presets = POLICY_PRESETS[style.policy] ?? []
                assert.ok(presets.some((preset) => preset.name === style.preset),
                    `${style.name} references unknown preset ${style.preset}`)
            }
        }
    })

    it('matches the current colour, policy and preset back to a style', () => {
        // Defaults: manual policy, jazz colour.
        assert.equal(matchScaleStyle(), 'manual')

        // Follow with the Simple preset options.
        Object.assign(globals.scaleFiltering.policyOptions,
            { contextChords: 1, phraseBias: false, phraseStrength: 1, palette: 'primary' })
        globals.scaleFiltering.policy = 'follow'
        assert.equal(matchScaleStyle(), 'follow')

        // A hand-edited context no longer matches any curated style.
        globals.scaleFiltering.policyOptions.contextChords = 2
        assert.equal(matchScaleStyle(), CUSTOM_STYLE)

        // Shuffle with the Varied preset options is "Vary it".
        const varied = POLICY_PRESETS.shuffle.find((preset) => preset.name === 'varied')
        globals.scaleFiltering.policy = 'shuffle'
        Object.assign(globals.scaleFiltering.policyOptions, varied.options)
        assert.equal(matchScaleStyle(), 'vary')

        // Adventurous colour with the Wild preset is "Adventurous".
        const wild = POLICY_PRESETS.shuffle.find((preset) => preset.name === 'wild')
        globals.project.options.colour = 'adventurous'
        Object.assign(globals.scaleFiltering.policyOptions, wild.options)
        assert.equal(matchScaleStyle(), 'adventurous')
    })

    it('applies a style to colour, policy, options and the project', () => {
        assert.equal(applyScaleStyle('vary'), true)
        assert.equal(globals.scaleFiltering.policy, 'shuffle')
        assert.equal(globals.getProjectColour(), 'jazz')
        const varied = POLICY_PRESETS.shuffle.find((preset) => preset.name === 'varied')
        for (const [key, value] of Object.entries(varied.options))
            assert.equal(globals.scaleFiltering.policyOptions[key], value, `varied ${key}`)
        assert.equal(globals.project.options.scaleStyle, 'vary')

        assert.equal(applyScaleStyle('adventurous'), true)
        assert.equal(globals.getProjectColour(), 'adventurous')
        assert.equal(globals.scaleFiltering.policy, 'shuffle')
        assert.equal(globals.scaleFiltering.policyOptions.poolSize, 6)
        assert.equal(globals.scaleFiltering.policyOptions.maxNewNotes, 7)
        assert.equal(globals.scaleFiltering.policyOptions.variety, 'lively')
        assert.equal(globals.project.options.scaleStyle, 'adventurous')

        assert.equal(applyScaleStyle('nonsense'), false)
        assert.equal(scaleStyleByName('nonsense'), undefined)
    })

    it('applies Follow the melody as the resolve preset', () => {
        assert.equal(applyScaleStyle('follow-melody'), true)
        assert.equal(globals.scaleFiltering.policy, 'follow')
        const resolve = POLICY_PRESETS.follow.find((preset) => preset.name === 'resolve')
        for (const [key, value] of Object.entries(resolve.options))
            assert.equal(globals.scaleFiltering.policyOptions[key], value, `resolve ${key}`)
        assert.equal(globals.scaleFiltering.policyOptions.palette, 'primary')
        assert.equal(globals.scaleFiltering.policyOptions.phraseStrength, 2)
        assert.equal(matchScaleStyle(), 'follow-melody')
    })

    it('applies the safe pair and the tension style', () => {
        assert.equal(applyScaleStyle('manual-safe'), true)
        assert.equal(globals.getProjectColour(), 'diatonic')
        assert.equal(globals.scaleFiltering.policy, 'manual')

        assert.equal(applyScaleStyle('follow-safe'), true)
        const steady = POLICY_PRESETS.follow.find((preset) => preset.name === 'steady')
        for (const [key, value] of Object.entries(steady.options))
            assert.equal(globals.scaleFiltering.policyOptions[key], value, `steady ${key}`)
        assert.equal(matchScaleStyle(), 'follow-safe')

        assert.equal(applyScaleStyle('tension'), true)
        assert.equal(globals.scaleFiltering.policyOptions.palette, 'tension')
        assert.equal(matchScaleStyle(), 'tension')
    })

    it('records custom after a hand edit and a style again when it matches', () => {
        applyScaleStyle('vary')
        globals.scaleFiltering.policyOptions.poolSize = 4
        assert.equal(syncProjectScaleStyle(), CUSTOM_STYLE)
        assert.equal(globals.project.options.scaleStyle, CUSTOM_STYLE)

        const varied = POLICY_PRESETS.shuffle.find((preset) => preset.name === 'varied')
        Object.assign(globals.scaleFiltering.policyOptions, varied.options)
        assert.equal(syncProjectScaleStyle(), 'vary')
        assert.equal(globals.project.options.scaleStyle, 'vary')
    })

    it('applies the style stored on a loaded project', () => {
        globals.project.options.scaleStyle = 'follow'
        assert.equal(applyProjectScaleStyle(), true)
        assert.equal(globals.scaleFiltering.policy, 'follow')
        assert.equal(globals.scaleFiltering.policyOptions.palette, 'primary')

        resetGlobals()
        globals.project.options.scaleStyle = CUSTOM_STYLE
        globals.scaleFiltering.policy = 'shuffle'
        assert.equal(applyProjectScaleStyle(), false)
        assert.equal(globals.scaleFiltering.policy, 'shuffle')

        // No stored style: the colour-matched default applies (jazz follows).
        resetGlobals()
        globals.project.options = { ...globals.project.options }
        delete globals.project.options.scaleStyle
        assert.equal(applyProjectScaleStyle(), true)
        assert.equal(globals.scaleFiltering.policy, 'follow')
        assert.equal(globals.project.options.scaleStyle, 'follow')
        assert.equal(matchScaleStyle(), 'follow')
    })

    it('falls back to the colour-matched default for unknown style names', () => {
        // A renamed style degrades to the default instead of custom.
        globals.project.options.scaleStyle = 'renamed-style'
        assert.equal(applyProjectScaleStyle(), true)
        assert.equal(globals.project.options.scaleStyle, 'follow')
        assert.equal(matchScaleStyle(), 'follow')

        // Diatonic songs follow safe, adventurous songs stay adventurous.
        resetGlobals()
        globals.project.options = { ...globals.project.options, colour: 'diatonic' }
        delete globals.project.options.scaleStyle
        assert.equal(applyProjectScaleStyle(), true)
        assert.equal(globals.project.options.scaleStyle, 'follow-safe')
        assert.equal(matchScaleStyle(), 'follow-safe')
    })

    it('prefers the colour-specific manual styles over As written', () => {
        // Manual policy under jazz still reads as "I choose".
        assert.equal(matchScaleStyle(), 'manual')

        globals.project.options.colour = 'diatonic'
        assert.equal(matchScaleStyle(), 'manual-safe')

        // No colour-specific manual style exists for adventurous, so the
        // colour-blind As written style matches there.
        globals.project.options.colour = 'adventurous'
        assert.equal(matchScaleStyle(), 'as-written')
    })

    it('applies As written without touching the colour or stored scales', () => {
        globals.project.options.colour = 'diatonic'
        globals.project.chords = [
            { id: 1, name: 'Dm7', chord: 'Dm7', scale1: 'D dorian' },
        ]
        const before = JSON.stringify(globals.project.chords)

        assert.equal(applyScaleStyle('as-written'), true)
        assert.equal(globals.scaleFiltering.policy, 'manual')
        assert.equal(globals.getProjectColour(), 'diatonic')
        assert.equal(JSON.stringify(globals.project.chords), before)
        assert.equal(globals.project.options.scaleStyle, 'as-written')
        assert.equal(matchScaleStyle(), 'as-written')
    })

})
