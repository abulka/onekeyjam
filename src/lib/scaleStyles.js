// @ts-check
import { globals } from './globals.js'
import { POLICY_PRESETS } from './autoScale.js'
import { applyProjectKeySettings } from './projectScaleSettings.js'
import { setScalePolicy } from './change-scale.js'

/**
 * @module lib/scaleStyles
 * @desc The beginner-facing "Scale changes" control. A style names what the
 * right-hand scale does when the chord changes, and bundles the three engine
 * settings that make it happen: the project colour, the scale policy and the
 * policy preset. The individual controls still live in the Options panel, and
 * when they are hand-tuned the style reads "custom". See doco/SCALE-POLICIES.md.
 */

export const CUSTOM_STYLE = 'custom'

/**
 * @typedef {object} ScaleStyle
 * @property {string} name
 * @property {string} label
 * @property {string} description one plain sentence for beginners
 * @property {'diatonic'|'jazz'|'adventurous'} colour
 * @property {'manual'|'follow'|'shuffle'} policy
 * @property {string|null} preset preset name in POLICY_PRESETS[policy], or null
 */

/**
 * The curated styles shown in the "Scale changes" selector, in beginner order.
 * @type {Array<ScaleStyle>}
 */
export const SCALE_STYLES = [
    {
        name: 'manual-safe',
        label: 'I choose (safe)',
        description: 'You pick the scale with the black keys, and the choices stay in the plain key.',
        colour: 'diatonic',
        policy: 'manual',
        preset: null,
    },
    {
        name: 'manual',
        label: 'I choose',
        description: 'You pick the scale with the black keys (C#, D#, F#, G#); it stays until you change it.',
        colour: 'jazz',
        policy: 'manual',
        preset: null,
    },
    {
        name: 'follow',
        label: 'Follow the chords',
        description: 'Each chord automatically sounds its most natural stored scale.',
        colour: 'jazz',
        policy: 'follow',
        preset: 'simple',
    },
    {
        name: 'follow-safe',
        label: 'Follow the chords (safe)',
        description: 'Each chord sounds its plain-key scale, so the mode holds through modal vamps and the changes stay gentle.',
        colour: 'diatonic',
        policy: 'follow',
        preset: 'steady',
    },
    {
        name: 'follow-melody',
        label: 'Follow the melody',
        description: 'Follows the chords and keeps the last note you played in scale, so phrases resolve instead of being cut off.',
        colour: 'jazz',
        policy: 'follow',
        preset: 'resolve',
    },
    {
        name: 'tension',
        label: 'Add jazz tension',
        description: 'Natural scales on every chord, with an added tension note on dominant chords (the V).',
        colour: 'jazz',
        policy: 'follow',
        preset: 'tension',
    },
    {
        name: 'vary',
        label: 'Vary it',
        description: 'The scale shifts on most chord changes, staying close to each chord.',
        colour: 'jazz',
        policy: 'shuffle',
        preset: 'varied',
    },
    {
        name: 'adventurous',
        label: 'Adventurous',
        description: 'Bolder scales and bigger shifts between them.',
        colour: 'adventurous',
        policy: 'shuffle',
        preset: 'wild',
    },
]

/**
 * The preset a style uses, if any.
 * @param {ScaleStyle} style
 */
function presetForStyle(style) {
    if (!style.preset)
        return null
    return (POLICY_PRESETS[style.policy] ?? []).find((preset) => preset.name === style.preset) ?? null
}

/**
 * Look up a style by name.
 * @param {string} name
 * @returns {ScaleStyle|undefined}
 */
export function scaleStyleByName(name) {
    return SCALE_STYLES.find((style) => style.name === name)
}

/**
 * Which style the current colour, policy and options amount to.
 * @returns {string} a style name, or CUSTOM_STYLE when hand-tuned
 */
export function matchScaleStyle() {
    const colour = globals.getProjectColour()
    const policy = globals.scaleFiltering.policy
    const options = globals.scaleFiltering.policyOptions
    for (const style of SCALE_STYLES) {
        if (style.colour !== colour || style.policy !== policy)
            continue
        const preset = presetForStyle(style)
        if (!preset)
            return style.name
        if (Object.entries(preset.options).every(([key, value]) => options[key] === value))
            return style.name
    }
    return CUSTOM_STYLE
}

/**
 * Apply a style: its preset options, then its colour (which re-ranks the
 * stored scales) and policy. The style name is remembered on the project.
 * @param {string} name
 * @returns {boolean} true when the name matched a style
 */
export function applyScaleStyle(name) {
    const style = scaleStyleByName(name)
    if (!style)
        return false

    const preset = presetForStyle(style)
    if (preset)
        Object.assign(globals.scaleFiltering.policyOptions, preset.options)

    if (globals.getProjectColour() !== style.colour)
        applyProjectKeySettings({ colour: style.colour })

    setScalePolicy(style.policy, { quiet: true })

    if (globals.project?.options)
        globals.project.options.scaleStyle = style.name
    return true
}

/**
 * Keep the project's remembered style in step after a hand edit in Options.
 * The project stores the style the settings now match (or "custom").
 * @returns {string}
 */
export function syncProjectScaleStyle() {
    const name = matchScaleStyle()
    if (globals.project?.options)
        globals.project.options.scaleStyle = name
    return name
}

/**
 * Apply the style stored on the loaded project, if there is one. Called on
 * project load so a song reopens sounding as it was left.
 * @returns {boolean}
 */
export function applyProjectScaleStyle() {
    const name = globals.project?.options?.scaleStyle
    if (!name || name === CUSTOM_STYLE)
        return false
    return applyScaleStyle(name)
}
