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

/**
 * Move a key's tonic by a number of semitones, preserving its type, source and
 * colour. Used by live chord transposition so the key context moves with the
 * sounding music without altering the written project.
 * @param {(ProjectKey & {colour?: string})|undefined} key
 * @param {number} [semitones]
 */
export function transposeKey(key, semitones = 0) {
    if (!key || !semitones)
        return key;
    const interval = Tonal.Interval.fromSemitones(semitones);
    const tonic = Tonal.Note.simplify(Tonal.Note.transpose(key.tonic, interval));
    if (!tonic)
        return key;
    return { ...key, tonic };
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
 * Detect the major/minor keys that fit the project's chords, best first.
 * Chord symbols are preferred; the sounding notes are the fallback.
 * @param {Project} [project]
 * @returns {Array<ProjectKey>}
 */
export function detectProjectKeys(project) {
    if (!project || !Array.isArray(project.chords) || project.chords.length === 0)
        return [];
    const options = { useHitWeight: true, usePenalty: true };
    const symbols = project.chords
        .map((chordConfig) => chordConfig.chord)
        .filter((symbol) => symbol && !Tonal.Chord.get(symbol).empty);

    let names = symbols.length > 0 ? keyFromChords(symbols, options) : [];
    if (names.length === 0) {
        const chordsAsNotes = project.chords
            .map((chordConfig) => chordConfig.chordNotes)
            .filter((notes) => Array.isArray(notes) && notes.length > 0)
            .map((notes) => notes.map((note) => Tonal.Note.get(note).pc));
        names = chordsAsNotes.length > 0 ? keyFromNotes(chordsAsNotes, options) : [];
    }
    return names.map((name) => {
        const [tonic, ...typeParts] = name.split(' ');
        return normalizeKey({ tonic, type: typeParts.join(' '), source: 'detected' });
    }).filter((key) => key !== undefined);
}

/**
 * The best (first) detected major/minor key, if any.
 * @param {Project} [project]
 * @returns {ProjectKey|undefined}
 */
export function detectProjectKey(project) {
    return detectProjectKeys(project)[0];
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

/** @param {string} type */
function normaliseType(type) {
    return type === 'aeolian' || type === 'minor' ? 'minor' : type === 'ionian' ? 'major' : type;
}

/**
 * Do two keys describe the same pitch and mode? Enharmonic tonics match.
 * @param {ProjectKey} [a] @param {ProjectKey} [b]
 */
export function keysMatch(a, b) {
    if (!a || !b)
        return false;
    const chromaA = Tonal.Note.chroma(a.tonic);
    const chromaB = Tonal.Note.chroma(b.tonic);
    if (Number.isNaN(chromaA) || Number.isNaN(chromaB) || chromaA !== chromaB)
        return false;
    return normaliseType(a.type) === normaliseType(b.type);
}

/**
 * Describe where the project key comes from, covering every combination of
 * declared key, detected key and whether the project has any chords yet.
 * @param {Project} [project]
 * @returns {{label: string, title: string}}
 */
export function describeProjectKey(project) {
    const declared = declaredProjectKey(project);
    const detectedKeys = detectProjectKeys(project);
    const hasChords = !!(project && Array.isArray(project.chords) && project.chords.length > 0);
    const detectedNames = detectedKeys.map((key) => `${key.tonic} ${key.type}`).join(', ');

    if (!declared && detectedKeys.length === 0) {
        return hasChords
            ? { label: '(no key detected)', title: 'No key could be detected from the chords' }
            : { label: '(no chords yet, default key)', title: 'Add chords, or set a key, to detect one' };
    }

    if (!declared)
        return { label: '(detected)', title: `Detected from the chords: ${detectedNames}` };

    // Only a declared key from here on.
    const declaredName = `${declared.tonic} ${declared.type}`;
    if (detectedKeys.length === 0) {
        if (!hasChords)
            return { label: '(set by project, no chords yet)', title: `Set to ${declaredName}` };
        if (!['major', 'minor'].includes(normaliseType(declared.type)))
            return { label: '(set by project, modal key)', title: `Set to ${declaredName}; only major/minor keys are detected` };
        return { label: '(set by project)', title: `Set to ${declaredName}; nothing could be detected` };
    }

    const matchIndex = detectedKeys.findIndex((key) => keysMatch(declared, key));
    const topName = `${detectedKeys[0].tonic} ${detectedKeys[0].type}`;

    // Two ticks when the key is the detection's top choice, one tick when it is
    // a lower-ranked but still valid detected key.
    if (matchIndex === 0) {
        return declared.source === 'detected'
            ? { label: '✅✅ (detected, saved)', title: `Matches the top detected key ${topName}. Detected keys: ${detectedNames}` }
            : { label: '✅✅ (set by project, matches detected)', title: `Set to ${declaredName}, the top detected key. Detected keys: ${detectedNames}` };
    }
    if (matchIndex > 0) {
        return declared.source === 'detected'
            ? { label: '✅ (saved detection, another detected key)', title: `Saved as ${declaredName}, a detected key, but the top choice is ${topName}. Detected keys: ${detectedNames}` }
            : { label: '✅ (set by project, another detected key)', title: `Set to ${declaredName}. It is a detected key, but the top choice is ${topName}. Detected keys: ${detectedNames}` };
    }

    return declared.source === 'detected'
        ? { label: '⚠️ (saved detection, now differs)', title: `Saved as ${declaredName}; the detection now gives ${detectedNames}` }
        : { label: '⚠️ (set by project, differs from detected)', title: `Set to ${declaredName}; the detected keys are ${detectedNames}` };
}
