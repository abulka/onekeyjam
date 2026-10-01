// @ts-check
import { globals } from './globals.js'
import {
    listUserProjects as listStoredProjects,
    fetchUserProject as fetchStoredProject,
    saveUserProject as saveStoredProject,
} from './localStore.js'

/**
 * @module lib/projectLibrary
 * @desc Reads the static project and keyboard libraries and the locally saved
 * user projects. Replaces the previous Firebase backend.
 */

const PROJECTS_MANIFEST = '/projects/projects-manifest.json'
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

// Featured projects - the static library in public/projects

export async function listFeaturedProjects() {
    const manifest = await fetchManifest(PROJECTS_MANIFEST)
    globals.projects = manifest
    globals.projectLibrary.projectNames = manifest.map(entry => entry.text)
}

export async function fetchFeaturedProject(name) {
    const entry = globals.projects.find(p => p.text === name)
    const url = entry ? entry.value : `/projects/${encodeURIComponent(name + '.json')}`
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
    globals.keyboardsAvailable = manifest.map(entry => entry.text)
}

export async function fetchKeyboardConfig(name) {
    const entry = globals.keyboardsManifest.find(k => k.text === name)
    const url = entry ? entry.value : `/keyboards/${encodeURIComponent(name + '.json')}`
    return fetchJson(url)
}
