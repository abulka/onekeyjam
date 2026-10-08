// @ts-check
import * as Tonal from "@tonaljs/tonal";
import { removeBassSlash } from "./removeBassSlash.js";

/**
 * @module lib/parseChordSequence
 * @desc Parse free text such as "Dsus4 Dmaj7 C#min11" into chord tokens.
 */

/**
 * @typedef {object} ParsedChordToken
 * @property {string} input the original text token as typed
 * @property {string} chord the chord symbol without bass, normalised for Tonal e.g. "C#m11"
 * @property {string} bass the explicit bass pitch class, or "" when none was given
 * @property {string} symbol the full symbol including slash bass when present e.g. "E7/D"
 */

/**
 * @typedef {object} ChordSequenceParseResult
 * @property {Array<ParsedChordToken>} entries recognised chords in order
 * @property {Array<{input:string,message:string}>} errors tokens that are not recognised chords
 */

/**
 * Split pasted text on whitespace, commas and semicolons.
 * @param {string} text
 * @returns {ChordSequenceParseResult}
 */
export function parseChordSequence(text) {
    /** @type {Array<ParsedChordToken>} */
    const entries = []
    /** @type {Array<{input:string,message:string}>} */
    const errors = []

    if (!text || !text.trim())
        return { entries, errors }

    const tokens = text.split(/[\s,;]+/).map(t => t.trim()).filter(Boolean)
    for (const token of tokens) {
        const parsed = parseSingleChordToken(token)
        if (parsed)
            entries.push(parsed)
        else
            errors.push({ input: token, message: `“${token}” is not a recognised chord` })
    }
    return { entries, errors }
}

/**
 * Parse one token such as "Dsus4" or "E7/D".
 * @param {string} token
 * @returns {ParsedChordToken|null}
 */
export function parseSingleChordToken(token) {
    const [chordPart, bassPart] = removeBassSlash(token)
    if (bassPart) {
        // A slash bass must be a real note pitch class.
        const bassNote = Tonal.Note.get(bassPart)
        if (bassNote.empty || !bassNote.pc)
            return null
        const chord = resolveChordSymbol(chordPart)
        if (!chord)
            return null
        return { input: token, chord, bass: bassNote.pc, symbol: `${chord}/${bassNote.pc}` }
    }
    const chord = resolveChordSymbol(chordPart)
    if (!chord)
        return null
    return { input: token, chord, bass: "", symbol: chord }
}

/**
 * Resolve a chord symbol without bass to its canonical Tonal symbol.
 * Tries the token as typed, then a "min"/"minor" alias such as
 * "C#min11" -> "C#m11", which Tonal needs for extended minor chords.
 * @param {string} symbol
 * @returns {string|null}
 */
export function resolveChordSymbol(symbol) {
    if (!symbol)
        return null
    const direct = Tonal.Chord.get(symbol)
    if (!direct.empty)
        return direct.symbol || symbol
    const aliased = withMinAlias(symbol)
    if (aliased !== symbol) {
        const retry = Tonal.Chord.get(aliased)
        if (!retry.empty)
            return retry.symbol || aliased
    }
    return null
}

/**
 * Rewrite a leading "minor"/"min" quality to "m", e.g. "C#min11" -> "C#m11".
 * Only the quality prefix after the root is rewritten, so names such as
 * diminished chords are left alone.
 * @param {string} symbol
 * @returns {string}
 */
export function withMinAlias(symbol) {
    const match = symbol.match(/^([A-G][#b]?)(.*)$/)
    if (!match)
        return symbol
    const [, root, rest] = match
    if (rest.startsWith("minor"))
        return `${root}m${rest.slice("minor".length)}`
    if (rest.startsWith("min"))
        return `${root}m${rest.slice("min".length)}`
    return symbol
}
