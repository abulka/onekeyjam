// @ts-check
import { globals } from './globals.js'
import { POLICY_PRESETS } from './autoScale.js'
import { applyProjectKeySettings } from './projectScaleSettings.js'
import { setScalePolicy } from './change-scale.js'

/**
 * @module lib/scaleStyles
 * @desc The beginner-facing "Scale changes" control. A style names what the
 * right-hand scale does when the chord changes, and usually bundles the three
 * engine settings that make it happen: the project colour, the scale policy
 * and the policy preset. The "As written" style is the exception: it keeps
 * the song's stored scales untouched and only sets the policy. The individual
 * controls still live in the Options panel, and when they are hand-tuned the
 * style reads "custom". See doco/SCALE-POLICIES.md.
 */

export const CUSTOM_STYLE = 'custom'

/**
 * Old style names and what they became, so songs saved under a renamed style
 * still load onto something sensible. Add an entry here when renaming a style
 * instead of leaving saved songs behind.
 * @type {Object.<string, string>}
 */
export const STYLE_ALIASES = {
}

/**
 * The default style for a project colour, used when a loaded song names no
 * usable style. Each default carries its own colour, so applying it rewrites
 * no scales.
 * @param {string} colour
 */
export function defaultScaleStyleForColour(colour) {
    if (colour === 'diatonic')
        return 'follow-safe'
    if (colour === 'adventurous')
        return 'adventurous'
    return 'follow'
}

/**
 * @typedef {object} ScaleStyle
 * @property {string} name
 * @property {string} label
 * @property {string} description one plain sentence for beginners
 * @property {'diatonic'|'jazz'|'adventurous'|null} colour null keeps the
 *   song's colour and stored scales untouched
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
    {
        name: 'as-written',
        label: 'As written',
        description: 'Play the stored scales exactly as written in the song, without re-ranking them.',
        colour: null,
        policy: 'manual',
        preset: null,
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
 * Whether the live colour, policy and options amount to the given style. A
 * null-colour style such as "As written" matches any colour.
 */
function styleMatches(style, colour, policy, options) {
    if (style.colour !== null && style.colour !== colour)
        return false
    if (style.policy !== policy)
        return false
    const preset = presetForStyle(style)
    if (!preset)
        return true
    return Object.entries(preset.options).every(([key, value]) => options[key] === value)
}

/**
 * Which style the current colour, policy and options amount to. The stored
 * style wins when the settings are consistent with it, so picking "As
 * written" keeps displaying "As written" instead of the colour-specific
 * manual label; otherwise the first matching style wins, and "As written"
 * sits last so the colour-specific manual styles win first.
 * @returns {string} a style name, or CUSTOM_STYLE when hand-tuned
 */
export function matchScaleStyle() {
    const colour = globals.getProjectColour()
    const policy = globals.scaleFiltering.policy
    const options = globals.scaleFiltering.policyOptions
    const stored = globals.project?.options?.scaleStyle
    if (stored && stored !== CUSTOM_STYLE) {
        const style = scaleStyleByName(stored) ?? (STYLE_ALIASES[stored] ? scaleStyleByName(STYLE_ALIASES[stored]) : undefined)
        if (style && styleMatches(style, colour, policy, options))
            return style.name
    }
    for (const style of SCALE_STYLES) {
        if (styleMatches(style, colour, policy, options))
            return style.name
    }
    return CUSTOM_STYLE
}

/**
 * Apply a style: its preset options, then its colour (which re-ranks the
 * stored scales when it differs) and policy. A null-colour style such as "As
 * written" leaves the colour and stored scales alone. The style name is
 * remembered on the project.
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

    if (style.colour !== null && globals.getProjectColour() !== style.colour)
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
 * Apply the style stored on the loaded project. A song that names no usable
 * style (fresh static songs, older saves, or a renamed style) falls back to
 * the default for its colour, so the selector shows a real style instead of
 * custom. A song left as custom keeps the current settings untouched.
 * Called on project load so a song reopens sounding as it was left.
 * @returns {boolean}
 */
export function applyProjectScaleStyle() {
    const stored = globals.project?.options?.scaleStyle
    if (stored === CUSTOM_STYLE)
        return false
    if (stored) {
        const name = scaleStyleByName(stored) ? stored : STYLE_ALIASES[stored]
        if (name)
            return applyScaleStyle(name)
    }
    return applyScaleStyle(defaultScaleStyleForColour(globals.getProjectColour()))
}
