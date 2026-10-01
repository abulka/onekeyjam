export const bassNoteOctave = 2
export const chordOctave = 3

const FORCE_PRODUCTION = false
export const isProduction = import.meta.env.PROD || FORCE_PRODUCTION;
const isDevelopment = import.meta.env.DEV;  // not used

export const PROJECT_COLL = "projects"
export const TEST_COLL = "testcollection"
export const USER_COLL = "users"
export const KEYBOARD_CONFIG_COLL = "keyboards"

console.log('isProduction', isProduction)
