// @ts-check

/**
 * @module lib/localStore
 * @desc Local persistence for user projects using IndexedDB.
 * Replaces the previous Firebase Firestore storage.
 */

const DB_NAME = 'onekeyjam'
const DB_VERSION = 1
const PROJECT_STORE = 'projects'

let dbPromise

function openDb() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)
            request.onupgradeneeded = () => {
                const db = request.result
                if (!db.objectStoreNames.contains(PROJECT_STORE))
                    db.createObjectStore(PROJECT_STORE, { keyPath: 'name' })
            }
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }
    return dbPromise
}

/**
 * List the names of all locally saved projects.
 * @returns {Promise<string[]>}
 */
export async function listUserProjects() {
    const db = await openDb()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROJECT_STORE, 'readonly')
        const request = transaction.objectStore(PROJECT_STORE).getAllKeys()
        request.onsuccess = () => resolve(request.result.map(String))
        request.onerror = () => reject(request.error)
    })
}

/**
 * Fetch a saved project by name, or an empty object if it does not exist.
 * @param {string} name
 * @returns {Promise<object>}
 */
export async function fetchUserProject(name) {
    const db = await openDb()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROJECT_STORE, 'readonly')
        const request = transaction.objectStore(PROJECT_STORE).get(name)
        request.onsuccess = () => resolve(request.result || {})
        request.onerror = () => reject(request.error)
    })
}

/**
 * Save a project locally, keyed by name.
 * @param {string} name
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function saveUserProject(name, data) {
    const db = await openDb()
    const record = { ...data, name }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROJECT_STORE, 'readwrite')
        transaction.objectStore(PROJECT_STORE).put(record)
        transaction.oncomplete = () => resolve(record)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
    })
}

/**
 * Delete a saved project by name.
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function deleteUserProject(name) {
    const db = await openDb()
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PROJECT_STORE, 'readwrite')
        transaction.objectStore(PROJECT_STORE).delete(name)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
    })
}
