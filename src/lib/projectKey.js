// @ts-check
import * as Tonal from '@tonaljs/tonal';
import { keyFromChords, keyFromNotes } from './keyFromChords.js';
import { PROJECT_COLOURS, DEFAULT_COLOUR } from './chordScaleEngine.js';

/**
 * @module lib/projectKey
 * @desc Project key model. A project may declare its key in
 * `options.key = { tonic, type, source }`, where `type` is a Tonal scale type
 * ('major', 'minor', or a mode such as 'dorian'). When no key is declared, one
 * is detected from the project's chords with the same major/minor algorithm as
 * the Key Detection section. See doco/MUSIC-THEORY.md.
 */

/**
 * @typedef {import("./typedefs").ProjectKey} ProjectKey
 * @typedef {import("./typedefs").Project} Project
 */

/**
 * Normalise any `{ tonic, type }` into a valid key, or undefined.
 * @param {{tonic?:string, type?:string, source?:string}} [key]
 * @returns {ProjectKey|undefined}
 */
export function normalizeKey(key) {
    if (!key || !key.tonic || !key.type || typeof key.tonic !== 'string' || typeof key.type !== 'string')
        return undefined;
    const scale = Tonal.Scale.get(`${key.tonic} ${key.type}`);
    if (scale.empty)
        return undefined;
    return {
        tonic: scale.tonic,
        type: scale.type === 'aeolian' ? 'minor' : scale.type === 'ionian' ? 'major' : scale.type,
        source: key.source === 'detected' ? 'detected' : 'user',
    };
}

/**
 * Normalise a colour preference to one of the supported profiles.
 * @param {string|undefined} [colour]
 */
export function normalizeColour(colour) {
    return PROJECT_COLOURS.includes(colour) ? colour : DEFAULT_COLOUR;
}

/** @param {Project} [project] */
export function projectColour(project) {
    // @ts-ignore options.colour is not part of the base Project type
    return normalizeColour(project && project.options && project.options.colour);
}

/**
 * Write a colour preference onto a project's options.
 * @param {Project} project
 * @param {string} colour
 */
export function setProjectColour(project, colour) {
    if (!project)
        return undefined;
    if (!project.options)
        project.options = {};
    const normalized = normalizeColour(colour);
    // @ts-ignore options.colour is not part of the base Project type
    project.options.colour = normalized;
    return normalized;
}

/** @param {ProjectKey} [key] */
export function projectKeyName(key) {
    return key ? `${key.tonic} ${key.type}` : '';
}

/** @param {ProjectKey} [key] */
export function projectKeyNotes(key) {
    if (!key)
        return [];
    const scale = Tonal.Scale.get(projectKeyName(key));
    return scale.empty ? [] : scale.notes;
}

/** @param {ProjectKey} [key] */
export function projectKeyPitchClasses(key) {
    return new Set(projectKeyNotes(key).map((note) => Tonal.Note.chroma(note)).filter((chroma) => !Number.isNaN(chroma)));
}

/** @param {Project} [project] */
export function declaredProjectKey(project) {
    // @ts-ignore options.key is not yet part of the base Project type
    return normalizeKey(project && project.options && project.options.key);
}

/**
 * Write a key onto a project's options.
 * @param {Project} project
 * @param {{tonic:string, type:string}} key
 * @param {'user'|'detected'} [source]
 * @returns {ProjectKey|undefined}
 */
export function setProjectKey(project, key, source = 'user') {
    const normalized = normalizeKey({ ...key, source });
    if (!normalized || !project)
        return undefined;
    if (!project.options)
        project.options = {};
    // @ts-ignore options.key is not yet part of the base Project type
    project.options.key = normalized;
    return normalized;
}

/** @param {Project} project */
export function clearProjectKey(project) {
    if (project && project.options)
        // @ts-ignore options.key is not yet part of the base Project type
        delete project.options.key;
}

/**
 * Detect a major/minor key from the project's chords, best first.
 * Chord symbols are preferred; the sounding notes are the fallback.
 * @param {Project} [project]
 * @returns {ProjectKey|undefined}
 */
export function detectProjectKey(project) {
    if (!project || !Array.isArray(project.chords) || project.chords.length === 0)
        return undefined;
    const options = { useHitWeight: true, usePenalty: true };
    const symbols = project.chords
        .map((chordConfig) => chordConfig.chord)
        .filter((symbol) => symbol && !Tonal.Chord.get(symbol).empty);

    let [name] = symbols.length > 0 ? keyFromChords(symbols, options) : [];
    if (!name) {
        const chordsAsNotes = project.chords
            .map((chordConfig) => chordConfig.chordNotes)
            .filter((notes) => Array.isArray(notes) && notes.length > 0)
            .map((notes) => notes.map((note) => Tonal.Note.get(note).pc));
        [name] = chordsAsNotes.length > 0 ? keyFromNotes(chordsAsNotes, options) : [];
    }
    if (!name)
        return undefined;
    const [tonic, ...typeParts] = name.split(' ');
    return normalizeKey({ tonic, type: typeParts.join(' '), source: 'detected' });
}

/**
 * The project's declared key, or one detected from its chords, carrying the
 * project's colour preference so the engine can size its chromatic bias.
 * @param {Project} [project]
 * @returns {(ProjectKey & {colour?: string})|undefined}
 */
export function resolveProjectKey(project) {
    const key = declaredProjectKey(project) ?? detectProjectKey(project);
    if (!key)
        return undefined;
    return { ...key, colour: projectColour(project) };
}
