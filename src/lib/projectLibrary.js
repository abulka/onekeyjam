// @ts-check
import { globals } from './globals.js'
import {
    listUserProjects as listStoredProjects,
    fetchUserProject as fetchStoredProject,
    saveUserProject as saveStoredProject,
} from './localStore.js'
import { listCustomKeyboards, fetchCustomKeyboard } from './keyboardStore.js'

/**
 * @module lib/projectLibrary
 * @desc Reads the static project and keyboard libraries and the locally saved
 * user projects. Replaces the previous Firebase backend.
 */

const FEATURED_MANIFEST = '/projects/featured/featured-manifest.json'
const CLASSIC_MANIFEST = '/projects/classic/classic-manifest.json'
const KEYBOARDS_MANIFEST = '/keyboards/keyboards-manifest.json'

async function fetchJson(url) {
    const response = await fetch(url)
    if (!response.ok)
        throw new Error(`Could not fetch ${url}: ${response.status}`)
    return response.json()
}

async function fetchManifest(url) {
    try {
        return await fetchJson(url)
    } catch (e) {
        console.warn('Could not load manifest', url, e)
        return []
    }
}

// Featured projects - the static library in public/projects/featured

export async function listFeaturedProjects() {
    const manifest = await fetchManifest(FEATURED_MANIFEST)
    globals.projects = manifest
    globals.projectLibrary.projectNames = manifest.map(entry => entry.text)
}

export async function fetchFeaturedProject(name) {
    const entry = globals.projects.find(p => p.text === name)
    const url = entry ? entry.value : `/projects/featured/${encodeURIComponent(name + '.json')}`
    return fetchJson(url)
}

// Classic projects - the static library in public/projects/classic

export async function listClassicProjects() {
    const manifest = await fetchManifest(CLASSIC_MANIFEST)
    globals.classicProjects = manifest
    globals.projectLibrary.classicProjectNames = manifest.map(entry => entry.text)
}

export async function fetchClassicProject(name) {
    const entry = globals.classicProjects.find(p => p.text === name)
    const url = entry ? entry.value : `/projects/classic/${encodeURIComponent(name + '.json')}`
    return fetchJson(url)
}

// User projects - locally saved in IndexedDB

export async function listUserProjects() {
    try {
        globals.projectLibrary.userProjectNames = await listStoredProjects()
    } catch (e) {
        console.warn('Could not list local projects', e)
        globals.projectLibrary.userProjectNames = []
    }
}

export async function fetchUserProject(name) {
    const data = await fetchStoredProject(name)
    if (!data || Object.keys(data).length === 0)
        console.warn('No local project found for', name)
    return data
}

export async function saveUserProject(name, data) {
    await saveStoredProject(name, data)
    await listUserProjects()
}

// Keyboard configs - the static library in public/keyboards

export async function listKeyboardConfigs() {
    const manifest = await fetchManifest(KEYBOARDS_MANIFEST)
    globals.keyboardsManifest = manifest
    const staticNames = manifest.map(entry => entry.text)
    let customNames = []
    try {
        customNames = listCustomKeyboards()
    } catch (e) {
        customNames = []
    }
    // Custom configs come first, so a saved config shadows a bundled one with
    // the same device name.
    globals.keyboardsAvailable = [...new Set([...customNames, ...staticNames])]
}

export async function fetchKeyboardConfig(name) {
    const custom = fetchCustomKeyboard(name)
    if (custom)
        return custom
    const entry = globals.keyboardsManifest.find(k => k.text === name)
    const url = entry ? entry.value : `/keyboards/${encodeURIComponent(name + '.json')}`
    return fetchJson(url)
}

/**
 * Every keyboard config with the metadata the MIDI Keyboard Config UI needs:
 * whether it is built-in or a local custom config, its description and octaves,
 * and whether a custom config is shadowing a built-in one of the same name.
 * @returns {Promise<Array<{name: string, source: 'builtin'|'custom', overridesBuiltin: boolean, description: string, lhTriggerOctave: number, rhJamSoundOctave: number}>>}
 */
export async function listKeyboardConfigDetails() {
    const staticNames = globals.keyboardsManifest.map(entry => entry.text)
    let customNames = []
    try {
        customNames = listCustomKeyboards()
    } catch (e) {
        customNames = []
    }
    // Custom first so a saved config shadows a built-in with the same name.
    const names = [...new Set([...customNames, ...staticNames])]
    /** @type {Array<{name: string, source: 'builtin'|'custom', overridesBuiltin: boolean, description: string, lhTriggerOctave: number, rhJamSoundOctave: number}>} */
    const details = []
    for (const name of names) {
        const custom = fetchCustomKeyboard(name)
        let config = custom
        if (!config) {
            try {
                config = await fetchKeyboardConfig(name)
            }
            catch (e) {
                config = { name, description: '', lhTriggerOctave: 3, rhJamSoundOctave: 4 }
            }
        }
        details.push({
            name,
            source: custom ? 'custom' : 'builtin',
            overridesBuiltin: !!custom && staticNames.includes(name),
            description: config.description || '',
            lhTriggerOctave: config.lhTriggerOctave ?? 3,
            rhJamSoundOctave: config.rhJamSoundOctave ?? 4,
        })
    }
    return details
}
